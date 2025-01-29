import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  useEffect(() => {
    // Notify the opener (main window) that sign in was successful
    if (window.opener) {
      window.opener.postMessage({ type: 'GOOGLE_SIGN_IN_SUCCESS' }, window.location.origin);
      window.close();
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing sign in...</p>
    </div>
  );
};

export default AuthCallback;