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
    if (user?.app_metadata?.provider === 'google') {
      const { user_metadata } = user;
      await supabase
        .from('profiles')
        .update({
          avatar_url: user_metadata.avatar_url,
          display_name: user_metadata.full_name,
        })
        .eq('id', user.id);
    }
  };

  const handleSessionError = (error: any) => {
    console.error("Session error:", error);
    setSession(null);
    setLoading(false);
    // Clear any existing session data
    supabase.auth.signOut();
    navigate("/auth");
    toast({
      title: "Session Error",
      description: "Please sign in again",
      variant: "destructive",
    });
  };

  useEffect(() => {
    console.log("Setting up auth subscriptions");

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          handleSessionError(sessionError);
          return;
        }

        console.log("Initial session check:", initialSession ? "Session exists" : "No session");
        if (initialSession?.user) {
          await updateProfileWithGoogleData(initialSession.user);
          setSession(initialSession);
        }
      } catch (error) {
        handleSessionError(error);
      } finally {
        setLoading(false);
      }
    };

    // Initialize auth
    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth state change:", event, currentSession ? "Session exists" : "No session");
      
      if (event === 'SIGNED_IN') {
        console.log("User signed in, updating session");
        if (currentSession?.user) {
          await updateProfileWithGoogleData(currentSession.user);
        }
        setSession(currentSession);
        toast({
          title: "Signed in successfully",
          description: "Welcome back!",
        });
        navigate("/");
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing session");
        setSession(null);
        navigate("/auth");
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("Token refreshed, updating session");
        setSession(currentSession);
      } else if (event === 'USER_UPDATED') {
        console.log("User updated, updating session");
        if (currentSession?.user) {
          await updateProfileWithGoogleData(currentSession.user);
        }
        setSession(currentSession);
      }

      setLoading(false);
    });

    // Cleanup subscription
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