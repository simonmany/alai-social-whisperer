import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log environment variables (safely)
    const serviceRoleKey = Deno.env.get('DB_SERVICE_ROLE_KEY');
    const dbUrl = Deno.env.get('DB_URL');
    const anonKey = Deno.env.get('DB_ANON_KEY');

    console.log('Environment check:', {
      hasServiceRoleKey: !!serviceRoleKey,
      serviceRoleKeyLength: serviceRoleKey?.length,
      hasDbUrl: !!dbUrl,
      dbUrlValue: dbUrl,
      hasAnonKey: !!anonKey,
      anonKeyLength: anonKey?.length
    });

    // Log request headers
    const headers = {} as Record<string, string>;
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });
    console.log('Request headers:', {
      ...headers,
      Authorization: headers.Authorization ? `${headers.Authorization.substring(0, 15)}...` : null,
      apikey: headers.apikey ? `${headers.apikey.substring(0, 10)}...` : null
    });

    // Check for required headers
    if (!headers.apikey) {
      return new Response(
        JSON.stringify({ error: 'Missing apikey header' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Get raw body for logging
    let rawBody = '';
    try {
      rawBody = await req.text();
      console.log('Raw request body length:', rawBody.length);
      console.log('Raw request body preview:', rawBody.substring(0, 100) + '...');
    } catch (e) {
      console.error('Failed to read request body:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to read request body',
          details: e instanceof Error ? e.message : 'Unknown error'
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Try to parse the body
    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('Parsed request body:', {
        ...body,
        provider_token: body.provider_token ? `${body.provider_token.substring(0, 10)}...` : null,
        provider_refresh_token: body.provider_refresh_token ? `${body.provider_refresh_token.substring(0, 10)}...` : null
      });
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON in request body',
          details: {
            error: e instanceof Error ? e.message : 'Unknown error',
            receivedBody: rawBody
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate required fields
    const requiredFields = ['user_id', 'provider_token', 'provider_refresh_token'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields',
          details: {
            missingFields,
            receivedFields: Object.keys(body)
          }
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { 
      user_id,
      refresh_token,
      provider_token,
      provider_refresh_token
    } = body;

    // Log the received data
    console.log('Processing request:', {
      hasUserId: !!user_id,
      hasRefreshToken: !!refresh_token,
      hasProviderToken: !!provider_token,
      hasProviderRefreshToken: !!provider_refresh_token,
      userId: user_id,
      tokenLength: provider_token?.length,
      refreshTokenLength: provider_refresh_token?.length
    });

    if (!serviceRoleKey || !dbUrl) {
      console.error('Missing required environment variables:', {
        hasServiceRoleKey: !!serviceRoleKey,
        hasDbUrl: !!dbUrl
      });
      return new Response(
        JSON.stringify({
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(dbUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Update auth metadata using admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: {
          provider: 'google',
          provider_token,
          provider_refresh_token
        }
      }
    );

    if (authError) {
      console.error('Auth update failed:', {
        error: authError,
        errorMessage: authError.message,
        errorStatus: authError.status,
        userId: user_id,
        hasServiceRoleKey: !!serviceRoleKey,
        serviceRoleKeyLength: serviceRoleKey?.length
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to update auth metadata',
          details: authError
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Auth metadata updated successfully');

    // Update profiles table
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        google_access_token: provider_token,
        google_refresh_token: provider_refresh_token,
        google_token_expires_at: new Date(Date.now() + (55 * 60 * 1000)).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)
      .select()
      .single();

    if (profileError) {
      console.error('Profile update failed:', {
        error: profileError,
        errorMessage: profileError.message,
        errorCode: profileError.code,
        userId: user_id
      });
      return new Response(
        JSON.stringify({
          error: 'Failed to update profile',
          details: profileError
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Profile updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Auth data stored successfully',
        auth: authData,
        profile: profileData
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in store_auth function:', err);
    const error = err instanceof Error ? err : new Error('Unknown error');
    
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'INTERNAL_ERROR',
        stack: error.stack
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
