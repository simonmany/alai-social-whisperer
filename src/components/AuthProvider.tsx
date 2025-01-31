/**
 * src/components/AuthProvider.tsx
 *
 * Make sure to import supabase, and define your context. 
 * 
 * Only shown the relevant parts that changed or need adding:
 */
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

  // This function updates our 'profiles' table with Google tokens when user signs in with Google
  const updateProfileWithGoogleData = async (signedInUser: any) => {
    console.log("Checking if update needed for Google data...");

    // If the user provider is google, we store tokens in profiles
    if (signedInUser?.app_metadata?.provider === 'google') {
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error("Error getting current session:", sessionError);
        return;
      }

      console.log("Google auth metadata:", {
        provider: signedInUser.app_metadata.provider,
        hasProviderToken: !!currentSession?.provider_token,
        hasRefreshToken: !!currentSession?.provider_refresh_token,
        hasUserToken: !!signedInUser.user_metadata?.provider_token,
        hasUserRefreshToken: !!signedInUser.user_metadata?.provider_refresh_token,
        userId: signedInUser.id,
        metadata: signedInUser.user_metadata
      });

      // Try to get tokens from session or user metadata
      const provider_token = currentSession?.provider_token ||
                           signedInUser.user_metadata?.provider_token;
      const provider_refresh_token = currentSession?.provider_refresh_token ||
                                   signedInUser.user_metadata?.provider_refresh_token;

      if (!provider_token || !provider_refresh_token) {
        console.log("No Google tokens found in session or user metadata");
        return;
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update({
            google_access_token: provider_token || null,
            google_refresh_token: provider_refresh_token || null,
            // optionally set an expiration time if you like:
            google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          })
          .eq('id', signedInUser.id);

        if (error) {
          console.error("Error updating profile with Google data:", error);
        } else {
          console.log("Successfully updated profile with Google data!");
        }
      } catch (err) {
        console.error("Exception storing Google refresh token:", err);
      }
    }
  };

  // If there's an error with the session
  const handleSessionError = (error: any) => {
    console.error("Session error:", error);
    setSession(null);
    setLoading(false);
    supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Session Error",
      description: "Please sign in again",
      variant: "destructive",
    });
  };

  useEffect(() => {
    // On mount, check the current session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          handleSessionError(error);
          return;
        }
        if (initialSession?.user) {
          await updateProfileWithGoogleData(initialSession.user);
          setSession(initialSession);
        }
      } catch (err) {
        handleSessionError(err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change:", event, currentSession);
      if (event === 'SIGNED_IN' && currentSession?.user) {
        await updateProfileWithGoogleData(currentSession.user);
        setSession(currentSession);
        toast({ title: "Signed in successfully", description: "Welcome back!" });
        navigate("/");
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        navigate("/auth");
        toast({ title: "Signed out", description: "You have been signed out." });
      } else if (event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
      } else if (event === 'USER_UPDATED' && currentSession?.user) {
        await updateProfileWithGoogleData(currentSession.user);
        setSession(currentSession);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async (): Promise<void> => {
    try {
      console.log("Starting Google login process...");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
        },
      });

      if (error) {
        console.error("Google OAuth error:", error);
        throw error;
      }

      if (!data?.url) {
        throw new Error("No OAuth URL returned");
      }

      console.log("OAuth URL generated, redirecting...");
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Google login error:", error);
      toast({
        title: "Error connecting to Google",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ session, loading, handleGoogleLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
