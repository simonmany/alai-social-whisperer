import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_DB_URL ?? Deno.env.get('SUPABASE_URL');
export const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_DB_ANON_KEY ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Use the dedicated redirect URL from environment
export const REDIRECT_URL = import.meta.env.VITE_SUPABASE_REDIRECT_URL || `${window.location.origin}/auth/callback`;
console.log(REDIRECT_URL)

// Create Supabase client with environment-aware auth settings
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    storage: localStorage,
    detectSessionInUrl: true,
    flowType: 'implicit'
  }
});

// Subscribe to auth state changes
supabase.auth.onAuthStateChange((event, session) => {
  if (import.meta.env.DEV) {
    console.log('Supabase auth event:', event, {
      hasSession: !!session,
      userId: session?.user?.id,
      provider: session?.user?.app_metadata?.provider,
      hasProviderToken: !!session?.provider_token,
      hasProviderRefreshToken: !!session?.provider_refresh_token,
      metadata: session?.user?.app_metadata
    });
  }
});

// Log configuration in development
if (import.meta.env.DEV) {
  console.log('Auth configuration:', {
    redirectUrl: REDIRECT_URL,
    mode: import.meta.env.MODE,
    dev: import.meta.env.DEV,
    url: SUPABASE_URL,
    hasKey: !!SUPABASE_PUBLISHABLE_KEY,
    flowType: 'implicit'
  });
}

// Export a function to check if tokens are present
export const hasValidTokens = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return !!(session?.provider_token && session?.provider_refresh_token);
};

// Export a function to get fresh tokens
export const getFreshTokens = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session) throw new Error('No session found');
  
  return {
    access_token: session.access_token,
    provider_token: session.provider_token,
    provider_refresh_token: session.provider_refresh_token
  };
};