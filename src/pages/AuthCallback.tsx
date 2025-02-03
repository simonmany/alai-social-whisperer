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