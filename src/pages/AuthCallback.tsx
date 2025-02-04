import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('No session found');

        console.log('Session established:', {
          userId: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider,
          hasProviderToken: !!session.provider_token,
          hasProviderRefreshToken: !!session.provider_refresh_token,
          metadata: session.user.app_metadata
        });

        // If we have calendar tokens, store them
        if (session.provider_token && session.provider_refresh_token &&
            session.user.app_metadata?.provider === 'google') {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              google_access_token: session.provider_token,
              google_refresh_token: session.provider_refresh_token,
              google_token_expires_at: new Date(Date.now() + (55 * 60 * 1000)).toISOString(),
              has_google_calendar: true,
              google_token_expired: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', session.user.id);

          if (updateError) {
            console.error('Failed to store tokens:', updateError);
            throw new Error('Failed to store calendar tokens');
          }

          console.log('Calendar tokens stored successfully:', {
            userId: session.user.id,
            hasAccessToken: true,
            hasRefreshToken: true,
            expiresAt: new Date(Date.now() + (55 * 60 * 1000)).toISOString(),
            hasGoogleCalendar: true,
            googleTokenExpired: false
          });
        }

        // Navigate to home page
        navigate('/', { replace: true });

      } catch (error: any) {
        console.error('Auth callback error:', error);
        toast({
          title: 'Authentication Error',
          description: error.message || 'Failed to complete authentication',
          variant: 'destructive'
        });
        navigate('/auth', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Completing sign in...</h2>
        <p className="text-muted-foreground">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  );
}