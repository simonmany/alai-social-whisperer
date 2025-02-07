import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { APP_CONSTANTS } from '../utils/constants';

export default function EmailCalendarCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session first to verify state
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) throw new Error('No session found');

        // Get the authorization code and state from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        console.log('OAuth callback parameters:', {
          hasCode: !!code,
          hasState: !!state,
          state,
          sessionUserId: session.user.id,
          provider: session.user.app_metadata?.provider
        });

        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!state) {
          throw new Error('No state parameter received');
        }

        // Verify state matches current user ID
        if (state !== session.user.id) {
          throw new Error('Invalid state parameter');
        }

        // Get a fresh session token
        const { data: { session: currentSession }, error: refreshError } = await supabase.auth.getSession();
        if (refreshError) throw refreshError;
        if (!currentSession) throw new Error('No session found after refresh');

        console.log('Exchanging code for tokens:', {
          code: code ? 'present' : 'missing',
          redirectUrl: `${APP_CONSTANTS.SITE_URL}/email-calendar/callback`,
          userId: session.user.id,
          hasAccessToken: !!currentSession.access_token
        });

        // Exchange code for tokens using our edge function
        const { data, error } = await supabase.functions.invoke('email-calendar-auth', {
          body: { 
            code,
            redirectUrl: `${APP_CONSTANTS.SITE_URL}/email-calendar/callback`,
            userId: session.user.id
          },
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`
          }
        });

        if (error) {
          console.error('Edge function error:', error);
          throw error;
        }

        if (!data?.success) {
          console.error('Edge function response:', data);
          throw new Error('Failed to connect calendar');
        }

        console.log('Calendar connected successfully:', {
          userId: session.user.id,
          success: data.success
        });

        // Invalidate profile query to force a refresh
        queryClient.invalidateQueries({ queryKey: ['profile'] });

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
        navigate('/email-calendar/connect', { replace: true });
      }
    };

    handleCallback();
  }, [navigate, searchParams, toast, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Connecting Calendar...</h2>
        <p className="text-muted-foreground">Please wait while we connect your Google Calendar.</p>
      </div>
    </div>
  );
}