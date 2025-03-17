import { Button } from "@/components/ui/button";
import {
  Calendar,
  Users,
  Sparkles,
  Music,
  Utensils,
  Instagram,
  Facebook,
  MessageCircle,
  Video,
  ArrowUp,
  ChevronLeft
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { requestCalendarAccess } from "@/utils/calendar";

interface IntegrationsMenuProps {
  onGoogleSignIn: () => void;
  isConnectingCalendar: boolean;
  onBack: () => void;
}

export const IntegrationsMenu = ({ onGoogleSignIn, isConnectingCalendar, onBack }: IntegrationsMenuProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDummyIntegration = (service: string) => {
    setIsLoading(true);
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1000)),
      {
        loading: `Connecting to ${service}...`,
        success: `${service} integration coming soon!`,
        error: "Connection failed",
      }
    );
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleNativeCalendarAccess = async () => {
    try {
      setIsLoading(true);
      const result = await requestCalendarAccess();
      if (result) {
        toast.success("Calendar access granted");
      } else {
        toast.error("Calendar access denied");
      }
    } catch (error) {
      console.error("Error requesting calendar access:", error);
      toast.error("Failed to request calendar access");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="mb-2 -ml-2 px-2 text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Profile
      </Button>
      {/* Calendars Section */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          Calendars
        </h3>
        <div className="space-y-2">
          {Capacitor.isNativePlatform() ? (
            <Button 
              variant="outline" 
              onClick={handleNativeCalendarAccess}
              disabled={isLoading}
              className="w-full justify-start gap-2"
            >
              <Calendar className="h-4 w-4" />
              {isLoading ? "Connecting..." : "Connect Calendar"}
            </Button>
          ) : (
            <Button 
              variant="outline" 
              onClick={onGoogleSignIn}
              disabled={isConnectingCalendar}
              className="w-full justify-start gap-2"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-4 h-4"
              />
              {isConnectingCalendar ? "Connecting..." : "Connect Google Calendar"}
            </Button>
          )}
        </div>
      </div>

      {/* Contacts Section */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Users className="h-4 w-4" />
          Contacts
        </h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Facebook")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Facebook className="h-4 w-4" />
            Connect Facebook (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Instagram")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Instagram className="h-4 w-4" />
            Connect Instagram (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Snapchat")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            Connect Snapchat (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("TikTok")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Video className="h-4 w-4" />
            Connect TikTok (Coming Soon)
          </Button>
        </div>
      </div>

      {/* Curiosities Section */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4" />
          Curiosities
        </h3>
        <div className="space-y-2">
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Spotify")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Music className="h-4 w-4" />
            Connect Spotify (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("OpenTable")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Utensils className="h-4 w-4" />
            Connect OpenTable (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Resy")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <Utensils className="h-4 w-4" />
            Connect Resy (Coming Soon)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Strava")}
            disabled={true}
            className="w-full justify-start gap-2 text-muted-foreground"
          >
            <ArrowUp className="h-4 w-4" />
            Connect Strava (Coming Soon)
          </Button>
        </div>
      </div>
    </div>
  );
};