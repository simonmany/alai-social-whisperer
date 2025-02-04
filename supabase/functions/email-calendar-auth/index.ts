/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1"

// Match CORS settings from config.toml
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing required Google OAuth credentials');
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    // Get the session token
    const sessionToken = authHeader.replace('Bearer ', '');

    // Initialize Supabase client
    const supabase = createClient(
      'https://ejqucnzpgebbujlnmdzx.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify the session token
    const { data: { user }, error: authError } = await supabase.auth.getUser(sessionToken);
    if (authError || !user) {
      throw new Error('Invalid session');
    }

    const body = await req.json();
    const { code = null, redirectUrl, userId } = body;

    // Verify userId matches authenticated user
    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }
    
    console.log('Request body:', {
      hasCode: !!code,
      hasRedirectUrl: !!redirectUrl,
      hasUserId: !!userId,
      redirectUrl,
      userId: user.id
    });

    // If no code is provided, generate the OAuth URL
    if (!code) {
      if (!redirectUrl || !userId) {
        throw new Error('Missing required parameters: redirectUrl and userId are required');
      }

      const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      oauthUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
      oauthUrl.searchParams.append('redirect_uri', redirectUrl);
      oauthUrl.searchParams.append('response_type', 'code');
      oauthUrl.searchParams.append('access_type', 'offline');
      oauthUrl.searchParams.append('prompt', 'consent');
      oauthUrl.searchParams.append('scope', [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ].join(' '));
      
      // Store the user ID in state parameter to verify on callback
      oauthUrl.searchParams.append('state', userId);

      console.log('Generated OAuth URL:', {
        url: oauthUrl.toString(),
        clientId: GOOGLE_CLIENT_ID ? 'present' : 'missing',
        redirectUri: redirectUrl,
        scopes: oauthUrl.searchParams.get('scope'),
        state: userId
      });

      return new Response(
        JSON.stringify({ url: oauthUrl.toString() }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Exchange the code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    console.log('Token exchange response:', {
      ok: tokenResponse.ok,
      status: tokenResponse.status,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
      error: tokens.error,
      errorDescription: tokens.error_description,
      fullResponse: tokens // Log full response for debugging
    });

    if (!tokenResponse.ok) {
      throw new Error(tokens.error_description || 'Failed to exchange code for tokens');
    }

    // Get current profile data
    const { data: currentProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    console.log('Current profile:', {
      hasProfile: !!currentProfile,
      profileError,
      userId
    });

    if (profileError) {
      console.error('Failed to get current profile:', profileError);
    }

    // Store tokens in profiles table
    const updateData = {
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString(),
      has_google_calendar: true,
      google_token_expired: false,
      updated_at: new Date().toISOString()
    };

    console.log('Updating profile with:', {
      ...updateData,
      google_access_token: tokens.access_token ? 'present' : 'missing',
      google_refresh_token: tokens.refresh_token ? 'present' : 'missing'
    });

    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId);

    if (updateError) {
      console.error('Failed to store tokens:', updateError);
      throw new Error('Failed to store calendar tokens');
    }

    // Verify the update
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select(`
        id,
        google_access_token,
        google_refresh_token,
        google_token_expires_at,
        has_google_calendar,
        google_token_expired
      `)
      .eq('id', userId)
      .single();

    console.log('Updated profile verification:', {
      hasProfile: !!updatedProfile,
      verifyError,
      hasAccessToken: !!updatedProfile?.google_access_token,
      hasRefreshToken: !!updatedProfile?.google_refresh_token,
      hasGoogleCalendar: updatedProfile?.has_google_calendar,
      googleTokenExpired: updatedProfile?.google_token_expired,
      tokenExpiresAt: updatedProfile?.google_token_expires_at
    });

    // Return success without tokens
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('email-calendar-auth error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});