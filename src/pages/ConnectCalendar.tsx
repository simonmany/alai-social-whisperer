import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getProfileWithAuth } from '@/utils/profile';
import { useAuth } from '@/components/AuthProvider';
import { APP_CONSTANTS } from '../utils/constants';

export default function ConnectCalendar() {
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkConnection = async () => {
      if (!session?.user.id) {
        navigate('/auth', { replace: true });
        return;
      }

      // Redirect email users to the email-specific flow
      if (session.user.app_metadata.provider === 'email') {
        navigate('/email-calendar/connect', { replace: true });
        return;
      }

      try {
        const profile = await getProfileWithAuth(supabase, session.user.id);
        setConnected(!!profile?.hasGoogleCalendar && !profile?.googleTokenExpired);
      } catch (error) {
        console.error('Error checking calendar connection:', error);
        toast({
          title: 'Error',
          description: 'Failed to check calendar connection status',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    checkConnection();
  }, [session, navigate, toast]);

  const handleConnect = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${APP_CONSTANTS.SITE_URL}/calendar/callback`,
          scopes: [
            'https://www.googleapis.com/auth/calendar.events',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ].join(' '),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });

      if (error) throw error;

    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect Google Calendar',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Checking connection status...</h2>
          <p className="text-muted-foreground">Please wait while we verify your calendar connection.</p>
        </div>
      </div>
    );
  }

  if (connected) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">Calendar Connected!</h2>
          <p className="text-muted-foreground mb-6">Your Google Calendar is successfully connected.</p>
          <Button onClick={() => navigate('/calendar')}>View Calendar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Connect Google Calendar</h2>
        <p className="text-muted-foreground mb-6">
          Connect your Google Calendar to manage your events and schedule meetings.
        </p>
        <Button onClick={handleConnect}>Connect Calendar</Button>
      </div>
    </div>
  );
}