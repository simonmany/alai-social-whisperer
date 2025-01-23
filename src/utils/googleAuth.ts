import { supabase } from "@/integrations/supabase/client";

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
}

export const storeGoogleTokens = async (tokens: GoogleTokens) => {
  const { error } = await supabase
    .from('profiles')
    .update({
      google_access_token: tokens.access_token,
      google_refresh_token: tokens.refresh_token,
      google_token_expires_at: tokens.expires_at
    })
    .eq('id', (await supabase.auth.getUser()).data.user?.id);

  if (error) {
    console.error('[GoogleAuth] Error storing tokens:', error);
    throw error;
  }
};

export const getStoredGoogleTokens = async (): Promise<GoogleTokens | null> => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (error) {
    console.error('[GoogleAuth] Error fetching tokens:', error);
    return null;
  }

  if (!profile?.google_access_token) {
    return null;
  }

  return {
    access_token: profile.google_access_token,
    refresh_token: profile.google_refresh_token || undefined,
    expires_at: profile.google_token_expires_at || undefined
  };
};