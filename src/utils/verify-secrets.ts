import { supabase } from '@/integrations/supabase/client';

export const verifySecrets = async () => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No session found');

    // Call verify-secrets function
    const response = await fetch(
      `${import.meta.env.VITE_DB_URL}/functions/v1/verify-secrets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_DB_ANON_KEY
        }
      }
    );

    const responseText = await response.text();
    console.log('Raw response from verify-secrets:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to verify secrets: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Secrets verification results:', data);

      // Check if service role key is present and working
      if (!data.environment.SUPABASE_SERVICE_ROLE_KEY || data.environment.SUPABASE_SERVICE_ROLE_KEY === 'missing') {
        throw new Error('Service role key is missing');
      }

      if (data.authTest && !data.authTest.ok) {
        throw new Error(`Auth test failed: ${data.authTest.error || data.authTest.statusText}`);
      }

      return data;
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from verify-secrets function');
    }
  } catch (error: any) {
    console.error('Secrets verification error:', error);
    throw error;
  }
};