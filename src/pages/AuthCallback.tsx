import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session immediately after the OAuth callback
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        
        if (session && window.opener) {
          // Force a session refresh to ensure we have all tokens
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) throw refreshError;
          
          if (refreshData.session) {
            // Notify the opener only if we have a valid session
            window.opener.postMessage({ type: 'GOOGLE_SIGN_IN_SUCCESS' }, window.location.origin);
            window.close();
          }
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        // If there's an error, still try to close the window
        if (window.opener) {
          window.close();
        }
      }
    };

    handleCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing sign in...</p>
    </div>
  );
};

export default AuthCallback;