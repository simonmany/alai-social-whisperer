import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const stateParam = urlParams.get('state');
        const storedState = localStorage.getItem('oauth_state');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        const authCode = urlParams.get('code');

        console.log('Auth Callback Debug:', {
          hasCode: !!authCode,
          stateParam,
          storedState,
          error,
          errorDescription,
          currentUrl: window.location.href
        });

        // Handle errors first
        if (error || errorDescription) {
          console.error('OAuth Error:', error, errorDescription);
          toast({
            title: 'Authentication Error',
            description: errorDescription || 'Failed to connect Google Calendar',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        // Validate state
        if (!stateParam || !storedState || stateParam !== storedState) {
          console.error('Invalid state parameter');
          toast({
            title: 'Authentication Error',
            description: 'Invalid authentication state',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        // Clear state
        localStorage.removeItem('oauth_state');

        // Validate code
        if (!authCode) {
          console.error('No authorization code received');
          toast({
            title: 'Authentication Error',
            description: 'No authorization code received',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        console.log('Starting code exchange with:', {
          hasCode: !!authCode,
          currentUrl: window.location.href,
          mode: import.meta.env.MODE,
          dev: import.meta.env.DEV
        });

        // Get current session first
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('Current session:', {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id,
          provider: currentSession?.user?.app_metadata?.provider
        });

        // Exchange code for session
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
        if (exchangeError) {
          console.error('Failed to exchange code for session:', exchangeError);
          toast({
            title: 'Authentication Error',
            description: 'Failed to complete authentication',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        if (!data?.session) {
          console.error('No session received from code exchange');
          toast({
            title: 'Authentication Error',
            description: 'No session received',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        const session = data.session;
        console.log('Session exchange result:', {
          hasSession: true,
          hasProviderToken: !!session.provider_token,
          hasProviderRefreshToken: !!session.provider_refresh_token,
          userId: session.user?.id,
          provider: session.user?.app_metadata?.provider
        });

        // Store tokens in profile
        if (session.provider_token && session.provider_refresh_token) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              google_access_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
            })
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Failed to update profile with Google tokens:', updateError);
            toast({
              title: 'Warning',
              description: 'Calendar connected but failed to save settings',
              variant: 'destructive'
            });
          } else {
            console.log('Successfully stored Google tokens in profile');
            toast({
              title: 'Success',
              description: 'Google Calendar connected successfully'
            });
          }
        } else {
          console.error('Missing provider tokens in session');
          toast({
            title: 'Warning',
            description: 'Calendar connection incomplete',
            variant: 'destructive'
          });
        }

        // Navigate to home page
        navigate('/');
      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Authentication failed',
          variant: 'destructive'
        });
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <p className="text-lg font-medium">Completing sign in...</p>
        <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full" />
      </div>
    </div>
  );
};

export default AuthCallback;