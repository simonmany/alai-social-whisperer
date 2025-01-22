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
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log("Initial session check:", session ? "Session exists" : "No session");
      if (error) {
        console.error("Error getting session:", error);
        toast({
          title: "Session Error",
          description: "There was a problem with your session. Please sign in again.",
          variant: "destructive",
        });
      }
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change:", event, session ? "Session exists" : "No session");
      
      if (event === 'SIGNED_IN') {
        console.log("User signed in, updating session");
        setSession(session);
      } else if (event === 'SIGNED_OUT') {
        console.log("User signed out, clearing session");
        setSession(null);
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("Token refreshed, updating session");
        setSession(session);
      } else if (event === 'USER_UPDATED') {
        console.log("User updated, updating session");
        setSession(session);
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