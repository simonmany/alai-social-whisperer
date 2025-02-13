
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  handleGoogleLogin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  handleGoogleLogin: async () => {
    throw new Error('handleGoogleLogin not implemented');
  }
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Initialize session from localStorage if available
    const storedSession = localStorage.getItem('supabase.auth.token');
    if (storedSession) {
      try {
        const parsedSession = JSON.parse(storedSession);
        if (parsedSession?.currentSession) {
          setSession(parsedSession.currentSession);
        }
      } catch (error) {
        console.error('Error parsing stored session:', error);
      }
    }

    // Get initial session
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.error('Error getting initial session:', sessionError);
          if (window.location.pathname !== '/auth') {
            navigate('/auth');
          }
          return;
        }

        console.log('Initial session established:', {
          hasSession: !!initialSession,
          userId: initialSession?.user?.id,
          provider: initialSession?.user?.app_metadata?.provider
        });

        setSession(initialSession);

        // Redirect based on session state
        if (!initialSession && window.location.pathname !== '/auth') {
          navigate('/auth');
        } else if (initialSession && window.location.pathname === '/auth') {
          navigate('/');
        }
      } catch (error) {
        console.error('Error in initSession:', error);
        if (window.location.pathname !== '/auth') {
          navigate('/auth');
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('Auth state changed:', event, {
        hasSession: !!newSession,
        userId: newSession?.user?.id,
        provider: newSession?.user?.app_metadata?.provider,
        hasProviderToken: !!newSession?.provider_token,
        hasProviderRefreshToken: !!newSession?.provider_refresh_token,
        metadata: newSession?.user?.app_metadata
      });
      
      setSession(newSession);

      if (event === 'SIGNED_IN') {
        // Check if we're in the OAuth callback
        const isCallback = window.location.pathname.includes('/auth/callback');
        if (!isCallback) {
          navigate('/', { replace: true });
        }
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('supabase.auth.token');
        navigate('/auth', { replace: true });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
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
      console.error('Google login error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive'
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, handleGoogleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
