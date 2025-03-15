import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { CalendarEvent } from '@/types/calendar';
import { InChatFeedbackForm } from './InChatFeedbackForm';

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

  let dateStr = '';
  let timeStr = '';
  
  try {
    const date = new Date(event.start_time);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      timeStr = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      dateStr = format(date, 'PPP');
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }

  if (showFeedbackForm) {
    return (
      <InChatFeedbackForm 
        onSubmit={onFeedbackSubmit}
        event={event}
        skipEventSelection={true}
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
            {dateStr} {timeStr && `• ${timeStr}`}
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
