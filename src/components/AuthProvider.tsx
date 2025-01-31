import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ session: null, loading: true });

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

  const updateProfileWithGoogleData = async (user: any) => {
    if (user?.app_metadata?.provider !== 'google') return;

    console.log("Updating profile with Google data...");
    const { user_metadata, app_metadata } = user;
    
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: user_metadata.avatar_url,
        display_name: user_metadata.full_name,
        google_access_token: app_metadata.provider_token,
        google_refresh_token: app_metadata.provider_refresh_token,
        google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error("Error updating profile with Google data:", error);
    }
  };

  const handleSessionError = async (error: any) => {
    console.error("Session error:", error);
    
    const isRefreshTokenError = 
      error.message?.includes('refresh_token_not_found') || 
      error.message?.includes('Invalid Refresh Token');

    if (isRefreshTokenError) {
      console.log("Refresh token error detected, signing out...");
      await supabase.auth.signOut();
      setSession(null);
      navigate("/auth");
      toast({
        title: "Session Expired",
        description: "Please sign in again",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Authentication Error",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const ensureProfileExists = async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!profile) {
        console.log("Creating new profile for user:", userId);
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([{ 
            id: userId,
            onboarding_completed: false,
            onboarding_step: 'initial',
            onboarding_started_at: new Date().toISOString(),
            has_completed_tutorial: false
          }]);

        if (insertError) throw insertError;
      }

      return profile;
    } catch (error) {
      console.error('Error ensuring profile exists:', error);
      throw error;
    }
  };

  useEffect(() => {
    console.log("Setting up auth subscriptions");

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const { data: { session: initialSession }, error: sessionError } = 
          await supabase.auth.getSession();
        
        if (sessionError) {
          await handleSessionError(sessionError);
          return;
        }

        if (initialSession?.user) {
          await ensureProfileExists(initialSession.user.id);
          await updateProfileWithGoogleData(initialSession.user);
          setSession(initialSession);
        }
        
        setLoading(false);
        
        if (!initialSession) {
          navigate("/auth");
        }
      } catch (error) {
        await handleSessionError(error);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change:", event);
      
      switch (event) {
        case 'SIGNED_IN':
          if (currentSession?.user) {
            try {
              await ensureProfileExists(currentSession.user.id);
              await updateProfileWithGoogleData(currentSession.user);
              setSession(currentSession);
              toast({
                title: "Signed in successfully",
                description: "Welcome!",
              });
              navigate("/");
            } catch (error) {
              console.error("Error during sign in:", error);
              toast({
                title: "Error",
                description: "There was an error setting up your profile",
                variant: "destructive",
              });
            }
          }
          break;

        case 'SIGNED_OUT':
          setSession(null);
          navigate("/auth");
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
          break;

        case 'TOKEN_REFRESHED':
          if (currentSession) {
            setSession(currentSession);
          }
          break;

        case 'USER_UPDATED':
          if (currentSession?.user) {
            await updateProfileWithGoogleData(currentSession.user);
            setSession(currentSession);
          }
          break;
      }

      setLoading(false);
    });

    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, [toast, navigate]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};