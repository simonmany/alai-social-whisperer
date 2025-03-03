import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { FeedbackForm } from './FeedbackForm';

interface EventFeedbackCardProps {
  event: CalendarEvent;
  onFeedbackSubmit: (message: string) => void;
}

export const EventFeedbackCard = ({
  event,
  onFeedbackSubmit
}: EventFeedbackCardProps) => {
  console.log('EventFeedbackCard - Props:', {
    event,
    hasOnFeedbackSubmit: !!onFeedbackSubmit
  });
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  const date = new Date(event.date);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const time = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

  if (showFeedbackForm) {
    return (
      <FeedbackForm 
        onSubmit={onFeedbackSubmit}
        event={event}
      />
    );
  }

  return (
    <Card 
      className="p-4 cursor-pointer hover:bg-accent transition-colors"
      onClick={() => setShowFeedbackForm(true)}
    >
      <div className="flex items-start gap-3">
        <CalendarIcon className="h-5 w-5 mt-1 flex-shrink-0" />
        <div className="space-y-1 flex-grow">
          <div className="font-medium">{event.title}</div>
          <div className="text-sm text-muted-foreground">
            {format(date, 'PPP')} • {time}
          </div>
          {event.location && (
            <div className="text-sm text-muted-foreground">
              {event.location}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
