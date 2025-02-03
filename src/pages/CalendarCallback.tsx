import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function CalendarCallback() {
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

        if (!session.provider_token || !session.provider_refresh_token) {
          throw new Error('Missing required tokens in session');
        }

        // Store tokens in profiles table
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            google_access_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token,
            google_token_expires_at: new Date(Date.now() + (55 * 60 * 1000)).toISOString(), // 55 minutes from now
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id);

        if (updateError) {
          console.error('Failed to store tokens:', updateError);
          throw new Error('Failed to store calendar tokens');
        }

        // Show success message
        toast({
          title: 'Success',
          description: 'Google Calendar connected successfully!',
          variant: 'default'
        });

        // Navigate to calendar page
        navigate('/calendar', { replace: true });

      } catch (error: any) {
        console.error('Calendar callback error:', error);
        toast({
          title: 'Connection Error',
          description: error.message || 'Failed to connect Google Calendar',
          variant: 'destructive'
        });
        navigate('/connect-calendar', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Connecting Calendar...</h2>
        <p className="text-muted-foreground">Please wait while we connect your Google Calendar.</p>
      </div>
    </div>
  );
}