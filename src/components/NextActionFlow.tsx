import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { CalendarPlus, Clock } from 'lucide-react';
import { EventFeedbackCard } from './EventFeedbackCard';
import { InChatFeedbackForm } from "@/components/InChatFeedbackForm";
import { CalendarEvent } from '@/types/calendar';

interface NextActionFlowProps {
  unreflectedEvents?: CalendarEvent[];
  onAddToCalendar?: () => void;
  onViewSummary?: (period: 'day' | 'week' | 'month') => void;
  onSkip?: (step?: string) => void;
  onSelectEvent?: (event: CalendarEvent) => void;
  onFeedbackSubmit?: (message: string, event?: CalendarEvent, mood?: string[], notes?: string) => void;
  step: 'unreflected-events' | 'plan-something' | 'view-summary';
}

export const NextActionFlow = ({
  unreflectedEvents = [],
  onAddToCalendar,
  onViewSummary,
  onSkip,
  onSelectEvent,
  onFeedbackSubmit,
  step
}: NextActionFlowProps) => {
  console.log('NextActionFlow rendered with step:', step);
  
  // Debug function to log when buttons are clicked
  const handleSkip = () => {
    console.log('Skip button clicked for step:', step);
    if (onSkip) {
      // Ensure we pass the current step to onSkip
      onSkip(step);
    } else {
      console.error('onSkip is undefined');
    }
  };
  
  if (step === 'unreflected-events' && unreflectedEvents.length > 0) {
    return (
      <div className="space-y-3 mt-3">
        {unreflectedEvents.slice(0, 1).map(event => (
          <EventFeedbackCard
            key={event.id}
            event={event}
            onFeedbackSubmit={onFeedbackSubmit}
          />
        ))}
        
        <Button
          variant="default"
          className="w-full bg-black hover:bg-black/90 text-white"
          onClick={handleSkip}
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
          onClick={() => {
            console.log('Add to calendar button clicked for step:', step);
            if (onAddToCalendar) {
              onAddToCalendar();
            } else {
              console.error('onAddToCalendar is undefined');
            }
          }}
        >
          <CalendarPlus className="mr-2 h-4 w-4" />
          Add something to calendar
        </Button>
        
        <Button
          variant="default"
          className="w-full bg-black hover:bg-black/90 text-white"
          onClick={handleSkip}
        >
          Not right now
        </Button>
      </div>
    );
  }
  
  if (step === 'view-summary') {
    console.log('Rendering view-summary step');
    
    // Debug functions for view summary buttons
    const handleViewDay = () => {
      console.log('View day button clicked for step:', step);
      if (onViewSummary) {
        onViewSummary('day');
      } else {
        console.error('onViewSummary is undefined');
      }
    };
    
    const handleViewWeek = () => {
      console.log('View week button clicked for step:', step);
      if (onViewSummary) {
        onViewSummary('week');
      } else {
        console.error('onViewSummary is undefined');
      }
    };
    
    const handleViewMonth = () => {
      console.log('View month button clicked for step:', step);
      if (onViewSummary) {
        onViewSummary('month');
      } else {
        console.error('onViewSummary is undefined');
      }
    };
    
    return (
      <div className="space-y-3 mt-3">
        <Card className="p-4 space-y-3">
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={handleViewDay}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my day
          </Button>
          
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={handleViewWeek}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my week
          </Button>
          
          <Button 
            variant="outline"
            className="w-full justify-start"
            onClick={handleViewMonth}
          >
            <Clock className="mr-2 h-4 w-4" />
            About my month
          </Button>
        </Card>
        
        <Button
          variant="default"
          className="w-full bg-black hover:bg-black/90 text-white"
          onClick={handleSkip}
        >
          Not right now
        </Button>
      </div>
    );
  }
  
  return null;
};
