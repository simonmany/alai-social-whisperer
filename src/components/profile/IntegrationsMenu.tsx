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
  ArrowUp
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

interface IntegrationsMenuProps {
  onGoogleSignIn: () => void;
  isConnectingCalendar: boolean;
}

export const IntegrationsMenu = ({ onGoogleSignIn, isConnectingCalendar }: IntegrationsMenuProps) => {
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

  return (
    <div className="space-y-6">
      {/* Calendars Section */}
      <div>
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4" />
          Calendars
        </h3>
        <div className="space-y-2">
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
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Facebook className="h-4 w-4" />
            Connect Facebook
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Instagram")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Instagram className="h-4 w-4" />
            Connect Instagram
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Snapchat")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            Connect Snapchat
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("TikTok")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Video className="h-4 w-4" />
            Connect TikTok
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
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Music className="h-4 w-4" />
            Connect Spotify
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("OpenTable")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Utensils className="h-4 w-4" />
            Connect OpenTable
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Resy")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <Utensils className="h-4 w-4" />
            Connect Resy
          </Button>
          <Button 
            variant="outline" 
            onClick={() => handleDummyIntegration("Strava")}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            <ArrowUp className="h-4 w-4" />
            Connect Strava
          </Button>
        </div>
      </div>
    </div>
  );
};