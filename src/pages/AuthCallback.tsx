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
        // Let Supabase handle the OAuth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: 'Authentication Error',
            description: error.message,
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        if (!data?.session) {
          console.error('No session received');
          toast({
            title: 'Authentication Error',
            description: 'No session received',
            variant: 'destructive'
          });
          navigate('/');
          return;
        }

        const session = data.session;
        console.log('Session received:', {
          hasSession: true,
          hasProviderToken: !!session.provider_token,
          hasProviderRefreshToken: !!session.provider_refresh_token,
          userId: session.user?.id,
          provider: session.user?.app_metadata?.provider
        });

        // Store tokens in profile and app_metadata
        if (session.provider_token && session.provider_refresh_token) {
          // Update profile
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              google_access_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Failed to update profile with Google tokens:', updateError);
            toast({
              title: 'Warning',
              description: 'Calendar connected but failed to save settings',
              variant: 'destructive'
            });
          }

          // Store tokens in app_metadata using store_auth function
          try {
            const { data: storeAuthData, error: storeAuthError } = await supabase.functions.invoke('store_auth', {
              body: {
                user_id: session.user.id,
                refresh_token: session.refresh_token,
                provider_token: session.provider_token,
                provider_refresh_token: session.provider_refresh_token
              }
            });

            if (storeAuthError) {
              throw storeAuthError;
            }

            console.log('Successfully stored Google tokens:', storeAuthData);
            toast({
              title: 'Success',
              description: 'Google Calendar connected successfully'
            });
          } catch (error) {
            console.error('Failed to store auth data:', error);
            toast({
              title: 'Warning',
              description: 'Calendar connected but some settings were not saved',
              variant: 'destructive'
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