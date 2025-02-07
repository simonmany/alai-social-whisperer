import { supabase } from '@/integrations/supabase/client';

export const testEnvironment = async () => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('No session found');

    // Call test-env function
    const response = await fetch(
      `${import.meta.env.VITE_DB_URL}/functions/v1/test-env`,
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
    console.log('Raw response from test-env:', responseText);

    if (!response.ok) {
      throw new Error(`Failed to test environment: ${responseText}`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Environment test results:', data);
      return data;
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error('Invalid response from test-env function');
    }
  } catch (error: any) {
    console.error('Environment test error:', error);
    throw error;
  }
};