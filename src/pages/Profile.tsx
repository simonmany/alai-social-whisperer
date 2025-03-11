import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, Settings, Share2, Play, Redo, RefreshCw, Code } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { IntegrationsMenu } from "@/components/profile/IntegrationsMenu";
import { AvatarUpload } from "@/components/AvatarUpload";
import { InterestsCard } from "@/components/profile/InterestsCard";
import { CatchUpCard } from "@/components/profile/CatchUpCard";
import Autocomplete from 'react-google-autocomplete';

interface ProfileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Dev mode callbacks
  onStartTutorial?: () => void;
  onSkipOnboarding?: () => void;
  onRestartOnboarding?: () => void;
  onTestMorningCheckin?: () => void;
  onTestEveningCheckin?: () => void;
  onTestCompletedEvents?: () => void;
}

const Profile = ({ 
  open, 
  onOpenChange, 
  onStartTutorial,
  onSkipOnboarding,
  onRestartOnboarding,
  onTestMorningCheckin,
  onTestEveningCheckin,
  onTestCompletedEvents 
}: ProfileProps) => {
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const [mapsApiKey, setMapsApiKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: userData, isSuccess: isAuthReady } = useQuery({
    queryKey: ['auth-user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!user) throw new Error('No user found');
      return user;
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
  });

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', userData?.id],
    queryFn: async () => {
      if (!userData?.id) throw new Error('No user ID available');

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          avatar_url,
          city,
          display_name,
          current_interests,
          desired_interests,
          utc_offset_minutes,
          google_access_token,
          google_refresh_token,
          google_token_expires_at,
          has_google_calendar,
          google_token_expired
        `)
        .eq('id', userData.id)
        .single();

      if (error) throw error;
      if (!profile) throw new Error('No profile found');

      console.log('Raw profile data:', profile);
      console.log('Raw current_interests:', profile.current_interests);
      console.log('Raw desired_interests:', profile.desired_interests);

      const currentInterests = Array.isArray(profile.current_interests) 
        ? profile.current_interests.filter((item): item is string => typeof item === 'string')
        : [];
      
      const desiredInterests = Array.isArray(profile.desired_interests)
        ? profile.desired_interests.filter((item): item is string => typeof item === 'string')
        : [];
        
      console.log('Processed currentInterests:', currentInterests);
      console.log('Processed desiredInterests:', desiredInterests);

      return {
        ...profile,
        currentInterests,
        desiredInterests,
        hasGoogleCalendar: profile.has_google_calendar || false,
        googleTokenExpired: profile.google_token_expired || false,
        tokenExpiresAt: profile.google_token_expires_at ? new Date(profile.google_token_expires_at) : null,
        hasAccessToken: !!profile.google_access_token,
        hasRefreshToken: !!profile.google_refresh_token,
        hasValidTokens: profile.has_google_calendar && !profile.google_token_expired,
      };
    },
    enabled: isAuthReady && !!userData?.id && open,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 2,
  });

  const displayName = profileData?.display_name || userData?.user_metadata?.name || 'User';
  const avatarUrl = profileData?.avatar_url || userData?.user_metadata?.avatar_url;
  const username = profileData?.username || 
                  (userData?.user_metadata?.username as string) || 
                  (displayName as string).toLowerCase().replace(/\s+/g, '');

  const handleAvatarUpdate = async (newUrl: string) => {
    queryClient.setQueryData(['profile'], (oldData: any) => ({
      ...oldData,
      avatar_url: newUrl
    }));
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleInterestsUpdate = async (currentInterests: string[], desiredInterests: string[]) => {
    if (!userData?.id) return;

    console.log('Updating interests with:', { currentInterests, desiredInterests });

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          current_interests: currentInterests,
          desired_interests: desiredInterests,
        })
        .eq('id', userData.id);

      if (error) throw error;

      console.log('Successfully updated interests in database');
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      toast({
        title: "Interests Updated",
        description: "Your interests have been updated successfully",
      });
    } catch (error) {
      console.error('Error updating interests:', error);
      toast({
        title: "Error",
        description: "Failed to update interests. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleGoogleCalendarConnect = async () => {
    try {
      setIsConnectingCalendar(true);
      console.log("[Calendar] Starting Google Calendar connection flow...");
      
      const { data: session } = await supabase.auth.getSession();
      console.log("[Calendar] Current session status:", session ? "Has session" : "No session");
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          skipBrowserRedirect: true
        }
      });

      if (error) {
        console.error("[Calendar] Google auth error:", error);
        toast({
          title: "Error connecting to Google Calendar",
          description: "Please try again or contact support if the issue persists.",
          variant: "destructive",
        });
        return;
      }

      if (data?.url) {
        const width = 600;
        const height = 800;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        
        const newWindow = window.open(
          data.url,
          'googleAuthWindow',
          `width=${width},height=${height},left=${left},top=${top}`
        );
        
        if (!newWindow) {
          console.error("[Calendar] Popup blocked by browser");
          toast({
            title: "Popup Blocked",
            description: "Please allow popups for this site to connect your Google Calendar.",
            variant: "destructive",
          });
        }
      }
      
    } catch (error: any) {
      console.error("[Calendar] Calendar connection error:", error);
      toast({
        title: "Error connecting to Google Calendar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsConnectingCalendar(false);
    }
  };

  const handleLocationUpdate = async (place: any) => {
    if (!place || typeof place !== 'object') return;

    const address = place.formatted_address || place.name || '';
    const offset = parseInt(place.utc_offset_minutes) || -240;

    if (!address) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          city: address,
          utc_offset_minutes: offset
        })
        .eq('id', userData?.id);

      if (error) throw error;
      
      setIsLocationDialogOpen(false);
      
      toast({
        title: "Location Updated",
        description: "Your location has been updated successfully",
      });

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
    } catch (error) {
      console.error('Error updating location:', error);
      toast({
        title: "Error",
        description: "Failed to update location. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    }
  };

  // Touch handling state for swipe gesture
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sheetContentRef = useRef<HTMLDivElement>(null);

  // Touch event handlers for swipe gesture
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touchXPosition = e.touches[0].clientX;
    
    // Only capture touches that start near the left edge (within 50px of edge)
    if (touchXPosition < 50) {
      setTouchStart(touchXPosition);
      console.log(`[Profile] Touch start at X: ${touchXPosition} (near left edge)`);
    } else {
      setTouchStart(null);
      console.log(`[Profile] Ignoring touch start at X: ${touchXPosition} (not near left edge)`);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    const touchXPosition = e.touches[0].clientX;
    setTouchEnd(touchXPosition);
    
    // Only log occasionally to avoid flooding
    if (Math.random() < 0.1) {
      console.log(`[Profile] Touch move to X: ${touchXPosition}, delta: ${touchXPosition - touchStart}`);
    }
  }, [touchStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    
    // Get final position from the touch event
    let finalTouchEnd = touchEnd;
    if (!finalTouchEnd && e.changedTouches && e.changedTouches.length > 0) {
      finalTouchEnd = e.changedTouches[0].clientX;
      setTouchEnd(finalTouchEnd);
    }
    
    console.log(`[Profile] Touch end - Start: ${touchStart}, End: ${finalTouchEnd || 'unknown'}`);
    
    // Process the swipe immediately instead of using state
    if (touchStart !== null && finalTouchEnd !== null) {
      const distance = finalTouchEnd - touchStart; // Left to right swipe
      
      console.log(`[Profile] Processing swipe - Distance: ${distance}px`);
      
      // Detect left to right swipe (minimum 100px movement)
      if (distance > 100) {
        console.log("[Profile] Left to right swipe detected, closing profile");
        onOpenChange(false); // Close the profile sheet
      } else {
        console.log(`[Profile] Swipe rejected - distance ${distance}px is less than threshold 100px`);
      }
    } else {
      console.log("[Profile] Incomplete swipe data, cannot process");
    }
    
    // Reset touch tracking
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, onOpenChange]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent 
          className="overflow-y-auto" 
          ref={sheetContentRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {showIntegrations ? (
            <IntegrationsMenu
              onGoogleSignIn={handleGoogleCalendarConnect}
              isConnectingCalendar={isConnectingCalendar}
            />
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col items-center space-y-2">
                {isLoading ? (
                  <Skeleton className="h-24 w-24 rounded-full" />
                ) : (
                  <AvatarUpload
                    url={avatarUrl}
                    onUploadComplete={handleAvatarUpdate}
                    fallback={displayName?.charAt(0) || 'U'}
                    size="lg"
                  />
                )}
                <div className="text-center">
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  ) : (
                    <>
                      <h2 className="text-lg font-semibold">{displayName}</h2>
                      <div className="text-xs text-muted-foreground">
                        @{username} • {profileData?.city ? (
                          profileData.city
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setIsLocationDialogOpen(true)}
                          >
                            Set location
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {!isLoading && (
                <>
                  <InterestsCard
                    currentInterests={profileData?.currentInterests}
                    desiredInterests={profileData?.desiredInterests}
                    onUpdate={handleInterestsUpdate}
                  />
                  <CatchUpCard userId={userData?.id || ''} />
                </>
              )}

              <div className="flex flex-col gap-2">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setShowIntegrations(true)}
                >
                  <Share2 className="h-4 w-4" />
                  Integrations
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                  onClick={() => setIsDevModeOpen(true)}
                >
                  <Code className="h-4 w-4" />
                  Dev Mode
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Location</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {mapsApiKey ? (
              <Autocomplete
                apiKey={mapsApiKey}
                onPlaceSelected={(place) => handleLocationUpdate(place)}
                options={{
                  types: ['(cities)'],
                  fields: ['formatted_address', 'utc_offset_minutes']
                }}
                className="w-full px-4 py-2 text-gray-700 bg-white border rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Enter your city..."
              />
            ) : (
              <div className="text-sm text-gray-500">Loading location selector...</div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDevModeOpen} onOpenChange={setIsDevModeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Developer Mode</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 p-4">
            <h3 className="text-sm font-medium mb-2">Tutorial & Onboarding</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onStartTutorial?.();
                }}
              >
                <Play className="h-4 w-4" />
                Start Tutorial
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onSkipOnboarding?.();
                }}
              >
                Skip Onboarding and Tutorial (Dev Only)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onRestartOnboarding?.();
                }}
              >
                <Redo className="h-4 w-4" />
                Restart Onboarding
              </Button>
            </div>

            <div className="h-px bg-border my-2" />
            <h3 className="text-sm font-medium mb-2">Testing</h3>
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onTestMorningCheckin?.();
                }}
              >
                <Play className="h-4 w-4" />
                Test Morning Check-in
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onTestEveningCheckin?.();
                }}
              >
                <Play className="h-4 w-4" />
                Test Evening Check-in
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start gap-2"
                onClick={() => {
                  setIsDevModeOpen(false);
                  onOpenChange(false);
                  onTestCompletedEvents?.();
                }}
              >
                <RefreshCw className="h-4 w-4" />
                Test Completed Events
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Profile;
