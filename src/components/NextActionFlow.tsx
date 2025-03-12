import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarPlus, Clock } from 'lucide-react';
import { EventFeedbackCard } from './EventFeedbackCard';
import { CalendarEvent } from '@/types/calendar';

interface NextActionFlowProps {
  unreflectedEvents?: CalendarEvent[];
  onAddToCalendar: () => void;
  onViewSummary: (period: 'day' | 'week' | 'month') => void;
  onSkip: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
  step: 'unreflected-events' | 'plan-something' | 'view-summary';
}

export const NextActionFlow = ({
  unreflectedEvents = [],
  onAddToCalendar,
  onViewSummary,
  onSkip,
  onSelectEvent,
  step
}: NextActionFlowProps) => {
  
  if (step === 'unreflected-events' && unreflectedEvents.length > 0) {
    return (
      <div className="space-y-3 mt-3">
        {unreflectedEvents.slice(0, 1).map(event => (
          <EventFeedbackCard
            key={event.id}
            event={event}
            onFeedbackSubmit={() => onSelectEvent(event)}
          />
        ))}
        
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onSkip}
        >
          Not right now
        </Button>
      </div>
    );
  }
  
  if (step === 'plan-something') {
    return (
      <div className="space-y-3 mt-3">
        <Button 
          variant="outline"
          className="w-full justify-start"
          onClick={onAddToCalendar}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add something to calendar
        </Button>
        
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onSkip}
        >
          Not right now
        </Button>
      </div>
    );
  }
  
  if (step === 'view-summary') {
    return (
      <div className="space-y-3 mt-3">
        <Card className="p-4 space-y-3">
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={() => onViewSummary('day')}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my day
          </Button>
          
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={() => onViewSummary('week')}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my week
          </Button>
          
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={() => onViewSummary('month')}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my month
          </Button>
        </Card>
        
        <Button
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={onSkip}
        >
          Not right now
        </Button>
      </div>
    );
  }
  
  return null;
};
