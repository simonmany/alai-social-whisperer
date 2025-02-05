import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, Instagram, Linkedin, Twitter } from "lucide-react";

interface ContactCardProps {
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meetingStory?: string;
  relationship?: string;
}

export const ContactCard = ({
  name,
  phone,
  instagram,
  linkedin,
  twitter,
  meetingStory,
  relationship,
}: ContactCardProps) => {
  return (
    <Card className="w-full max-w-sm bg-white shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-lg">{name}</h3>
            {relationship && (
              <p className="text-sm text-gray-500">{relationship}</p>
            )}
          </div>
        </div>
        
        {meetingStory && (
          <p className="mt-2 text-sm text-gray-600">
            Met: {meetingStory}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {phone && (
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{phone}</span>
            </div>
          )}
          {instagram && (
            <div className="flex items-center space-x-2">
              <Instagram className="h-4 w-4 text-gray-500" />
              <span className="text-sm">@{instagram}</span>
            </div>
          )}
          {linkedin && (
            <div className="flex items-center space-x-2">
              <Linkedin className="h-4 w-4 text-gray-500" />
              <span className="text-sm">{linkedin}</span>
            </div>
          )}
          {twitter && (
            <div className="flex items-center space-x-2">
              <Twitter className="h-4 w-4 text-gray-500" />
              <span className="text-sm">@{twitter}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
