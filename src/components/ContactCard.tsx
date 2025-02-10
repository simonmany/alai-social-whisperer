
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Instagram, Linkedin, Twitter, Archive, Calendar } from "lucide-react";
import { Contact, ContactEvent } from "@/types/contacts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ContactCardProps extends Partial<Contact> {
  meetingStory?: string;
  is_archived?: boolean;
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
}: ContactCardProps) => {
  const getClosenessLabel = (value: number | undefined | null) => {
    if (value === undefined || value === null) return null;
    if (value < 0.3) return "Acquaintance";
    if (value < 0.6) return "Friend";
    return "Close Friend";
  };

  const closenessLabel = getClosenessLabel(closeness);

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
        
        {/* Last Hangout Section */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-foreground mb-2">Last Hangout</h4>
          {lastHangout ? (
            <div className="text-sm text-muted-foreground space-y-1">
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
            <p className="text-sm text-muted-foreground">No hangouts recorded yet</p>
          )}
        </div>

        {/* Upcoming Hangs */}
        {upcomingEvents.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-2">Upcoming Hangs</h4>
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div key={event.id} className="text-sm text-muted-foreground space-y-1">
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
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-2">How we met</h4>
            <p className="text-sm text-muted-foreground">
              {meetingStory}
            </p>
          </div>
        )}

        {/* Hangout History */}
        {pastEvents.length > 1 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-foreground mb-2">Friendship History</h4>
            <div className="space-y-3">
              {pastEvents.slice(1).map(event => (
                <div key={event.id} className="text-sm text-muted-foreground space-y-1">
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

        {/* Contact Information */}
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
