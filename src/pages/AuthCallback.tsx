import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Ensure we have a valid session before notifying the opener
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session && window.opener) {
          // Notify the opener only if we have a valid session
          window.opener.postMessage({ type: 'GOOGLE_SIGN_IN_SUCCESS' }, window.location.origin);
          window.close();
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
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