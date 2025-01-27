import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface AvatarUploadProps {
  url?: string | null;
  onUploadComplete: (url: string) => void;
  fallback: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-24 w-24",
};

export const AvatarUpload = ({ url, onUploadComplete, fallback, size = "md" }: AvatarUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  console.log('AvatarUpload rendered with URL:', url); // Debug log

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      console.log('Uploading file to path:', filePath);

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
        });

      if (uploadError) throw uploadError;

      console.log('File uploaded successfully');

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      console.log('Generated public URL:', publicUrl);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      console.log('Profile updated with new avatar URL');

      onUploadComplete(publicUrl);

      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated successfully",
      });

    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error uploading avatar",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative group cursor-pointer">
      <input
        type="file"
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={uploadAvatar}
        disabled={uploading}
      />
      <Avatar className={`${sizeClasses[size]} relative`}>
        {url && (
          <>
            <AvatarImage 
              src={url} 
              alt="Profile"
              onError={(e) => {
                console.error('Error loading avatar image:', e);
                const img = e.target as HTMLImageElement;
                console.log('Failed URL:', img.src);
              }}
            />
          </>
        )}
        <AvatarFallback>{fallback}</AvatarFallback>
        {uploading && (
          <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-white animate-spin" />
          </div>
        )}
        <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <span className="text-white text-xs">Change</span>
        </div>
      </Avatar>
    </div>
  );
};