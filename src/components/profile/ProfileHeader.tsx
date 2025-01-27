import { AvatarUpload } from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Database } from "@/integrations/supabase/types";

type Profile = Database['public']['Tables']['profiles']['Row'];

interface ProfileHeaderProps {
  profile: Profile | null;
  onAvatarUpdate: (url: string) => void;
}

export const ProfileHeader = ({ profile, onAvatarUpdate }: ProfileHeaderProps) => {
  const avatarUrl = typeof profile?.avatar_url === 'string' ? profile.avatar_url : undefined;

  return (
    <div className="flex flex-col items-center space-y-2">
      <AvatarUpload
        url={avatarUrl}
        onUploadComplete={onAvatarUpdate}
        fallback={profile?.display_name?.charAt(0) || 'U'}
        size="lg"
      />
      <div className="text-center">
        <h2 className="text-lg font-semibold">{profile?.display_name || 'User'}</h2>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span>@{profile?.username || 'user'}</span>
          <span>•</span>
          <span>{profile?.city || 'Location not set'}</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Instagram</Button>
        <Button variant="outline" size="sm">Twitter</Button>
      </div>
    </div>
  );
};