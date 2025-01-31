import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";

const Auth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const validatePassword = (password: string) => {
    if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters long");
      return false;
    }
    setPasswordError("");
    return true;
  };
  
  const handleSignInWithGoogle = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Google sign-in button clicked");
    try {
      setLoading(true);
      
      // Clear any existing session first
      await supabase.auth.signOut();

      // Get the current URL for development vs production
      const redirectTo = import.meta.env.DEV 
        ? 'http://localhost:8080/auth/callback'
        : `${import.meta.env.VITE_PUBLIC_SITE_URL}/auth/callback`;

      // In development, we need to use the Supabase callback URL
      const supabaseRedirectTo = import.meta.env.DEV
        ? 'https://ejqucnzpgebbujlnmdzx.supabase.co/auth/v1/callback'
        : redirectTo;
      
      console.log('Starting OAuth flow with:', {
        redirectTo,
        supabaseRedirectTo,
        mode: import.meta.env.MODE,
        dev: import.meta.env.DEV
      });
      
      // Start new OAuth flow
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          redirectTo: supabaseRedirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            redirect_to: redirectTo // This tells Supabase where to redirect after its callback
          }
        }
      });
      
      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      }

      console.log("Google auth initiated");
    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        title: "Error signing in with Google",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword(password)) {
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            avatar_url: null,
          },
        },
      });

      if (error) {
        const errorBody = error.message && JSON.parse(error.message);
        const isUserExists = error.status === 422 || 
                           errorBody?.code === "user_already_exists" ||
                           error.message.includes("User already registered");

        if (isUserExists) {
          console.log("User already exists, attempting sign in");
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            throw signInError;
          }

          if (signInData.user?.app_metadata?.provider === 'google') {
            const { user_metadata } = signInData.user;
            await supabase
              .from('profiles')
              .update({
                avatar_url: user_metadata.avatar_url || null,
                display_name: user_metadata.full_name || null,
                updated_at: new Date().toISOString()
              } as any)
              .eq('id', signInData.user.id);
          }

          toast({
            title: "Welcome back!",
            description: "You've been signed in with your existing account.",
          });
          navigate("/");
          return;
        }
        throw error;
      }

      setShowEmailConfirmation(true);
      toast({
        title: "Success!",
        description: "Please check your email to confirm your account.",
      });
      
      if (data.user && !data.user.confirmed_at) {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setShowEmailConfirmation(true);
          throw new Error("Please confirm your email before signing in. Check your inbox for the confirmation link.");
        }
        throw error;
      }

      if (data.user?.app_metadata?.provider === 'google') {
        const { user_metadata } = data.user;
        await supabase
          .from('profiles')
          .update({
            avatar_url: user_metadata.avatar_url || null,
            display_name: user_metadata.full_name || null,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', data.user.id);
      }
      
      navigate("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create a new account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2"
            onClick={handleSignInWithGoogle}
            disabled={loading}
          >
            <img 
              src="https://www.google.com/favicon.ico" 
              alt="Google" 
              className="w-4 h-4"
            />
            Sign in with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          {showEmailConfirmation && (
            <Alert>
              <AlertDescription>
                Please check your email and click the confirmation link to activate your account.
                You won't be able to sign in until you confirm your email address.
              </AlertDescription>
            </Alert>
          )}
          
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="space-y-1">
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        validatePassword(e.target.value);
                      }}
                      required
                    />
                    {passwordError && (
                      <p className="text-sm text-red-500">{passwordError}</p>
                    )}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading || !!passwordError}>
                  {loading ? "Signing up..." : "Sign Up"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
