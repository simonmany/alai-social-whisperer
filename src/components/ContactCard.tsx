import { Avatar, AvatarFallback, AvatarImage } from "@/components/typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Instagram, Linkedin, Twitter, Archive } from "lucide-react";
import { Contact } from "@/types/contacts";

interface ContactCardProps extends Partial<Contact> {
  meetingStory?: string;
  is_archived?: boolean;
}

export const ContactCard = ({
  name,
  phone,
  instagram,
  linkedin,
  twitter,
  meetingStory,
  relationship,
  email,
  closeness,
  is_archived,
}: ContactCardProps) => {
  const getClosenessLabel = (value: number | undefined | null) => {
    if (value === undefined || value === null) return null;
    if (value < 0.3) return "Acquaintance";
    if (value < 0.6) return "Friend";
    return "Close Friend";
  };

  const closenessLabel = getClosenessLabel(closeness);

  return (
    <Card className="w-full max-w-sm bg-card shadow-lg relative">
      {is_archived && (
        <div className="absolute -top-2 -right-2 z-50">
          <Badge 
            variant="destructive" 
            className="flex items-center gap-1 shadow-xl bg-red-500/90 backdrop-blur-sm border border-red-400/50 text-white font-medium"
          >
            <Archive className="h-3 w-3" />
            Archived
          </Badge>
        </div>
      )}
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="text-lg bg-primary/10">
                {name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-xl text-foreground">{name}</h3>
              {relationship && (
                <p className="text-sm text-muted-foreground mt-1">{relationship}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {closenessLabel && (
                  <Badge variant="secondary">
                    {closenessLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {meetingStory && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-2">How we met</h4>
            <p className="text-sm text-muted-foreground">
              {meetingStory}
            </p>
          </div>
        )}

        <div className="mt-6 space-y-3">
          {email && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{phone}</span>
            </div>
          )}
          {instagram && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Instagram className="h-4 w-4" />
              <span className="text-sm">@{instagram}</span>
            </div>
          )}
          {linkedin && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Linkedin className="h-4 w-4" />
              <span className="text-sm">{linkedin}</span>
            </div>
          )}
          {twitter && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Twitter className="h-4 w-4" />
              <span className="text-sm">@{twitter}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
