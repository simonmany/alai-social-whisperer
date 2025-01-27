import { Button } from "@/components/ui/button";
import { Settings, Share2 } from "lucide-react";

export const ActionsSection = () => {
  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" className="w-full justify-start gap-2">
        <Settings className="h-4 w-4" />
        Settings
      </Button>
      <Button variant="outline" className="w-full justify-start gap-2">
        <Share2 className="h-4 w-4" />
        Integrations
      </Button>
    </div>
  );
};