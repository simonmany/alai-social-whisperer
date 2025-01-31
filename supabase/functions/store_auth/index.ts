import { serve } from "std/http/server.ts"
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  requiredVars.forEach(varName => {
    if (!Deno.env.get(varName)) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  });
};

const initSupabase = () => {
  validateEnv();
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const supabase = initSupabase();
    const { 
      user_id,
      refresh_token,
      provider_token,
      provider_refresh_token
    } = await req.json();

    if (!user_id || !refresh_token || !provider_token || !provider_refresh_token) {
      throw new Error('Missing required auth data');
    }

    // Update user's metadata with Google OAuth tokens
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user_id,
      {
        app_metadata: {
          refresh_token: provider_refresh_token,
          provider_refresh_token,
          provider_token,
          provider: 'google'
        }
      }
    );

    if (updateError) {
      throw new Error(`Failed to update user: ${updateError.message}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Auth data stored successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error');
    console.error(`[${new Date().toISOString()}] Error:`, error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        code: 'INTERNAL_ERROR'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
})
