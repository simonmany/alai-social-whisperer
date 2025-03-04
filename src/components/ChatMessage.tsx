
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
import { PlanningForm } from "@/components/PlanningForm";
import { FeedbackForm } from "@/components/FeedbackForm";
import { EventFeedbackCard } from "@/components/EventFeedbackCard";
import { CalendarEvent } from "@/types/calendar";
import ReactMarkdown from "react-markdown";
import { Contact } from "@/types/contacts";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarPlus } from "lucide-react";

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
  contacts?: Contact[];
  showFeedbackForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  onFeedbackSubmit?: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
  completedEvent?: CalendarEvent;
  messageType?: 'morning' | 'evening' | 'post-event';
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
}: ChatMessageProps) => {
  const [showPlanningForm, setShowPlanningForm] = useState(false);
  console.log('ChatMessage - Props:', {
    content,
    isAl,
    messageType,
    showPlanningForm,
    hasOnPlanningSubmit: !!onPlanningSubmit,
    showFeedbackForm,
    hasOnFeedbackSubmit: !!onFeedbackSubmit,
    completedEvent
  });
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
          <div className="whitespace-pre-line prose prose-lg max-w-none prose-gray">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {contacts && contacts.length > 0 && (
            <div className="mt-4 space-y-4">
              {contacts.map((contact, index) => (
                <ContactCard key={`${contact.name}-${index}`} {...contact} />
              ))}
            </div>
          )}
          {isAl && content.toLowerCase().includes('good morning') && (
            <div className="mt-4">
              {showPlanningForm ? (
                <PlanningForm
                  onSubmit={(message) => {
                    if (onPlanningSubmit) {
                      onPlanningSubmit(message);
                    }
                    setShowPlanningForm(false);
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
          {showFeedbackForm && onFeedbackSubmit && (
            <div className="mt-4 w-full max-w-2xl">
              {completedEvent ? (
                <EventFeedbackCard 
                  event={completedEvent}
                  onFeedbackSubmit={onFeedbackSubmit}
                />
              ) : (
                <FeedbackForm
                  onSubmit={onFeedbackSubmit}
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          <div className="whitespace-pre-line prose prose-lg max-w-none prose-invert">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
          {contacts && contacts.length > 0 && (
            <div className="mt-4 space-y-4">
              {contacts.map((contact, index) => (
                <ContactCard key={`${contact.name}-${index}`} {...contact} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
