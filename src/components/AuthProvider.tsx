import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

  useEffect(() => {
    console.log("Setting up auth subscriptions");

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("Error getting initial session:", sessionError);
          toast({
            title: "Session Error",
            description: "There was a problem with your session. Please sign in again.",
            variant: "destructive",
          });
          // Clear the session on error
          setSession(null);
        } else {
          console.log("Initial session check:", initialSession ? "Session exists" : "No session");
          setSession(initialSession);
        }
      } catch (error) {
        console.error("Unexpected error during auth initialization:", error);
        toast({
          title: "Authentication Error",
          description: "There was an unexpected problem. Please try signing in again.",
          variant: "destructive",
        });
        // Clear the session on error
        setSession(null);
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
        setSession(currentSession);
        toast({
          title: "Signed in successfully",
          description: "Welcome back!",
        });
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing session");
        setSession(null);
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("Token refreshed, updating session");
        setSession(currentSession);
      } else if (event === 'USER_UPDATED') {
        console.log("User updated, updating session");
        setSession(currentSession);
      }

      setLoading(false);
    });

    // Cleanup subscription
    return () => {
      console.log("Cleaning up auth subscriptions");
      subscription.unsubscribe();
    };
  }, [toast]);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};