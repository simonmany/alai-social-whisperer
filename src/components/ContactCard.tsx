import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Instagram, Linkedin, Twitter, Archive, Calendar } from "lucide-react";
import { Contact, ContactEvent } from "@/types/contacts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import ContactGroupsManager from "@/components/ContactGroupsManager";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface ContactCardProps extends Contact {
  meetingStory?: string;
}

export const ContactCard = ({
  id,
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
  interests = [],
}: ContactCardProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const getClosenessLabel = (value: number | undefined | null) => {
    if (value === undefined || value === null) return null;
    if (value < 0.3) return "Acquaintance";
    if (value < 0.6) return "Friend";
    return "Close Friend";
  };

  const closenessLabel = getClosenessLabel(closeness);

  const renderInterestSection = (title: string, interests: string[]) => {
    console.log(`Rendering ${title} interests:`, interests);
    return (
      <div className="mt-2">
        <h4 className="text-sm font-medium text-white/90 mb-2">{title}</h4>
        <div className="flex flex-wrap gap-2">
          {interests && interests.length > 0 ? (
            interests.map((interest, index) => (
              <Badge 
                key={index} 
                variant="secondary"
                className="bg-purple-500/20 text-purple-200 hover:bg-purple-500/30 border border-purple-500/30"
              >
                {interest}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-white/60">No {title.toLowerCase()} interests added yet</p>
          )}
        </div>
      </div>
    );
  };

  const toggleArchiveStatus = async () => {
    if (!id) return;
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('contacts')
        .update({ is_archived: !is_archived })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: is_archived ? "Contact unarchived" : "Contact archived",
        description: `${name} has been ${is_archived ? "unarchived" : "archived"}.`,
      });

      // Invalidate queries to refresh the contacts list
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    } catch (error: any) {
      toast({
        title: "Error updating contact",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Fetch past and upcoming events for this contact
  const { data: events = [] } = useQuery({
    queryKey: ['contact-events', id],
    queryFn: async () => {
      if (!id) return [];

      // Get all events where this contact is an attendee
      const { data: eventIds, error: attendeeError } = await supabase
        .from('event_attendees')
        .select('event_id')
        .eq('contact_id', id);

      if (attendeeError) {
        console.error('Error fetching event attendees:', attendeeError);
        return [];
      }

      if (!eventIds?.length) return [];

      // Get the actual events
      const { data: events, error: eventsError } = await supabase
        .from('calendar_events')
        .select('*')
        .in('id', eventIds.map(e => e.event_id))
        .order('start_time', { ascending: false });

      if (eventsError) {
        console.error('Error fetching events:', eventsError);
        return [];
      }

      return events as ContactEvent[];
    },
    enabled: !!id
  });

  // Split events into past and upcoming
  const now = new Date();
  const pastEvents = events.filter(event => new Date(event.end_time) < now);
  const upcomingEvents = events.filter(event => new Date(event.start_time) >= now);
  const lastHangout = pastEvents[0];

  return (
    <Card className="w-full max-w-3xl mx-auto bg-black/60 shadow-xl relative border-purple-500/20 backdrop-blur-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleArchiveStatus}
        disabled={isUpdating}
        className={cn(
          "absolute -top-2 -right-2 z-50 flex items-center gap-1 shadow-xl backdrop-blur-sm border text-xs font-medium h-8",
          is_archived 
            ? "bg-red-500/90 border-red-400/50 text-white hover:bg-red-600/90" 
            : "bg-black/60 border-purple-500/20 text-muted-foreground hover:bg-purple-900/20"
        )}
      >
        <Archive className="h-3 w-3" />
        {is_archived ? "Archived" : "Archive"}
      </Button>

      <CardContent className="p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20 ring-2 ring-purple-500/30">
              <AvatarFallback className="text-xl bg-purple-900/50 text-purple-100">
                {name?.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-2xl text-white">{name}</h3>
              {relationship && (
                <p className="text-sm text-white/60 mt-1">{relationship}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-2">
                {closenessLabel && (
                  <Badge variant="secondary" className="bg-purple-500/20 text-purple-200 border border-purple-500/30">
                    {closenessLabel}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-8 space-y-3">
          {email && (
            <div className="flex items-center space-x-2 text-white/60">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-sm">{email}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center space-x-2 text-white/60">
              <Phone className="h-4 w-4" />
              <span className="text-sm">{phone}</span>
            </div>
          )}
          {instagram && (
            <div className="flex items-center space-x-2 text-white/60">
              <Instagram className="h-4 w-4" />
              <span className="text-sm">@{instagram}</span>
            </div>
          )}
          {linkedin && (
            <div className="flex items-center space-x-2 text-white/60">
              <Linkedin className="h-4 w-4" />
              <span className="text-sm">{linkedin}</span>
            </div>
          )}
          {twitter && (
            <div className="flex items-center space-x-2 text-white/60">
              <Twitter className="h-4 w-4" />
              <span className="text-sm">@{twitter}</span>
            </div>
          )}
        </div>

        {/* Groups Section */}
        <div className="mt-8">
          {id && <ContactGroupsManager contactId={id} className="text-white/90" />}
        </div>

        {/* Interests Section */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold text-purple-200">Interests</h3>
          {renderInterestSection("Interests", interests)}
        </div>

        {/* History Section Header */}
        <div className="mt-8 space-y-4">
          <h3 className="text-sm font-bold text-purple-200">You and {name}</h3>
        </div>

        {/* Last Hangout Section */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-white/90 mb-2">Last Hangout</h4>
          {lastHangout ? (
            <div className="text-sm text-white/60 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(lastHangout.start_time), 'PPP')}</span>
              </div>
              <p>{lastHangout.title}</p>
              {lastHangout.description && (
                <p className="text-xs">{lastHangout.description}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/60">No hangouts recorded yet</p>
          )}
        </div>

        {/* Upcoming Hangs */}
        {upcomingEvents.length > 0 && (
          <div className="mt-8">
            <h4 className="text-sm font-medium text-white/90 mb-2">Upcoming Hangs</h4>
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div key={event.id} className="text-sm text-white/60 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(event.start_time), 'PPP')}</span>
                  </div>
                  <p>{event.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How We Met Section */}
        {meetingStory && (
          <div className="mt-8">
            <h4 className="text-sm font-medium text-white/90 mb-2">How we met</h4>
            <p className="text-sm text-white/60">
              {meetingStory}
            </p>
          </div>
        )}

        {/* Hangout History */}
        {pastEvents.length > 1 && (
          <div className="mt-8">
            <h4 className="text-sm font-medium text-white/90 mb-2">Friendship History</h4>
            <div className="space-y-3">
              {pastEvents.slice(1).map(event => (
                <div key={event.id} className="text-sm text-white/60 space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(event.start_time), 'PPP')}</span>
                  </div>
                  <p>{event.title}</p>
                  {event.description && (
                    <p className="text-xs">{event.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
