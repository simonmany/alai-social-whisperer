import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
import { PlanningForm } from "@/components/PlanningForm";
import { FeedbackForm } from "@/components/FeedbackForm";
import { InChatFeedbackForm } from "@/components/InChatFeedbackForm";
import { EventFeedbackCard } from "@/components/EventFeedbackCard";
import { CalendarEvent } from "@/types/calendar";
import ReactMarkdown from "react-markdown";
import { Contact } from "@/types/contacts";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";
import { TypewriterText } from "@/components/TypewriterText";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
  contacts?: Contact[];
  showFeedbackForm?: boolean;
  showPlanningForm?: boolean;
  onPlanningSubmit?: (message: string, newContent?: string) => void;
  onFeedbackSubmit?: (message: string, event?: CalendarEvent, mood?: string[], notes?: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
  completedEvent?: CalendarEvent;
  messageType?: 'morning' | 'evening' | 'post-event';
  messageId?: string;
  typewriterPlayed?: boolean;
  feedbackStep?: "event-selection" | "mood-selection" | "notes-input" | "complete";
  selectedEvent?: CalendarEvent;
  selectedMoods?: string[];
  feedbackNotes?: string;
}

export const ChatMessage = ({ 
  content, 
  isAl, 
  animate = true, 
  contacts,
  showFeedbackForm,
  onPlanningSubmit,
  onFeedbackSubmit,
  defaultContacts,
  defaultActivity,
  defaultLocation,
  defaultDate,
  defaultTime,
  completedEvent,
  messageType,
  showPlanningForm,
  messageId,
  typewriterPlayed = false,
  feedbackStep = "event-selection",
  selectedEvent,
  selectedMoods = [],
  feedbackNotes = "",
}: ChatMessageProps) => {
  const [isTypewriterComplete, setIsTypewriterComplete] = useState(typewriterPlayed);
  const [showPlanningFormState, setShowPlanningForm] = useState(showPlanningForm);

  // Effect to update typewriter_played in database when animation completes
  useEffect(() => {
    const updateTypewriterStatus = async () => {
      if (messageId && isTypewriterComplete && !typewriterPlayed) {
        const { error } = await supabase
          .from('chat_history')
          .update({ typewriter_played: true })
          .eq('id', messageId);
          
        if (error) {
          console.error('Error updating typewriter status:', error);
        }
      }
    };

    updateTypewriterStatus();
  }, [messageId, isTypewriterComplete, typewriterPlayed, supabase]);

  return (
    <div
      className={cn(
        "mb-4 max-w-[80%] text-xl font-cormorant",
        isAl ? "self-start" : "self-end",
        animate && (isAl ? "animate-slide-in-left" : "animate-slide-in-right")
      )}
    >
      {isAl ? (
        <div className="text-gray-800 px-4 py-2 rounded-lg bg-transparent">
          <div className="prose prose-gray max-w-none space-y-2">
            {(!isAl || typewriterPlayed || isTypewriterComplete) ? (
              <ReactMarkdown>{content}</ReactMarkdown>
            ) : (
              <TypewriterText
                text={content}
                className="text-gray-800"
                delay={100}
                typingSpeed={20}
                onComplete={() => {
                  console.log('Typewriter animation complete for message:', messageId);
                  setIsTypewriterComplete(true);
                }}
              />
            )}
          </div>
          {contacts && contacts.length > 0 && (
            <div className="mt-4 space-y-4">
              {contacts.map((contact, index) => (
                <ContactCard key={`${contact.name}-${index}`} {...contact} />
              ))}
            </div>
          )}
          {/* Render feedback form immediately, not dependent on typewriter animation */}
          {showFeedbackForm && onFeedbackSubmit && (
            <div className="mt-4 w-full">
              <InChatFeedbackForm
                onSubmit={onFeedbackSubmit}
                event={completedEvent}
                skipEventSelection={!!completedEvent}
                feedbackStep={feedbackStep}
                selectedEvent={selectedEvent}
                selectedMoods={selectedMoods}
                feedbackNotes={feedbackNotes}
              />
            </div>
          )}
          {/* Render planning form if all conditions are met */}
          {isTypewriterComplete && (showPlanningForm || (isAl && messageType === 'morning')) && (
            <div className="mt-4">
              {showPlanningFormState ? (
                <PlanningForm
                  onSubmit={(message, newContent) => {
                    if (onPlanningSubmit) {
                      onPlanningSubmit(message, newContent);
                    }
                    if (!newContent) {
                      setShowPlanningForm(false);
                    }
                  }}
                  defaultContacts={defaultContacts}
                  defaultActivity={defaultActivity}
                  defaultLocation={defaultLocation}
                  defaultDate={defaultDate}
                  defaultTime={defaultTime}
                />
              ) : (
                <Button 
                  onClick={() => setShowPlanningForm(true)}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <CalendarPlus className="mr-2 h-4 w-4" />
                  Add something to calendar
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          <div className="whitespace-pre-line">{content}</div>
        </div>
      )}
    </div>
  );
};
