import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { getProfileWithAuth } from '@/utils/profile';
import { useAuth } from '@/components/AuthProvider';
import { useQueryClient } from '@tanstack/react-query';

export default function EmailCalendarConnect() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(() => {
    // Check if we were in the middle of connecting
    const stored = localStorage.getItem('calendar-connecting');
    return stored === 'true';
  });
  const [connected, setConnected] = useState(false);
  const { session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    // Clear connecting state from localStorage if it exists
    const storedConnecting = localStorage.getItem('calendar-connecting');
    if (storedConnecting === 'true') {
      localStorage.removeItem('calendar-connecting');
      setConnecting(false);
    }

    const checkConnection = async () => {
      if (!session?.user.id) {
        navigate('/auth', { replace: true });
        return;
      }

      // Verify user is signed in with email
      if (session.user.app_metadata.provider !== 'email') {
        navigate('/connect-calendar', { replace: true });
        return;
      }

      try {
        const profile = await getProfileWithAuth(supabase, session.user.id);
        // Check if calendar is properly connected
        const isConnected = profile?.hasGoogleCalendar === true && profile?.googleTokenExpired !== true;
        console.log('Calendar connection check:', {
          profile,
          hasGoogleCalendar: profile?.hasGoogleCalendar,
          tokenExpired: profile?.googleTokenExpired,
          isConnected,
          userId: session.user.id
        });
        setConnected(isConnected);
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
      setConnecting(true);
      localStorage.setItem('calendar-connecting', 'true');
      console.log('Starting email calendar connection:', {
        userId: session?.user.id,
        provider: session?.user?.app_metadata?.provider,
        redirectUrl: `${import.meta.env.VITE_PUBLIC_SITE_URL}/email-calendar/callback`
      });

      if (!session?.user.id) {
        throw new Error('No user session found');
      }

      // Verify user is signed in with email
      if (session.user.app_metadata.provider !== 'email') {
        throw new Error('Invalid authentication provider');
      }

      // Get a fresh session token
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!currentSession) throw new Error('No session found');

      // Call our edge function to start OAuth flow
      const { data, error } = await supabase.functions.invoke('email-calendar-auth', {
        body: {
          userId: session.user.id,
          redirectUrl: `${import.meta.env.VITE_PUBLIC_SITE_URL}/email-calendar/callback`
        },
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      console.log('Edge function response:', {
        hasData: !!data,
        hasError: !!error,
        error: error?.message,
        hasUrl: !!data?.url,
        userId: session.user.id,
        redirectUrl: `${import.meta.env.VITE_PUBLIC_SITE_URL}/email-calendar/callback`,
        fullError: error,
        accessToken: currentSession.access_token ? 'present' : 'missing'
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Failed to start OAuth flow: ${error.message}`);
      }

      // Redirect to Google OAuth URL
      if (data?.url) {
        console.log('Redirecting to OAuth URL:', data.url);
        window.location.href = data.url;
      } else {
        throw new Error('No authorization URL received');
      }

    } catch (error: any) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to connect Google Calendar',
        variant: 'destructive'
      });
      // Reset connecting state
      setConnecting(false);
      localStorage.removeItem('calendar-connecting');
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
        <Button
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect Calendar"}
        </Button>
      </div>
    </div>
  );
}