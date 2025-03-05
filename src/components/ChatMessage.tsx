
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
import { PlanningForm } from "@/components/PlanningForm";
import { FeedbackForm } from "@/components/FeedbackForm";
import { EventFeedbackCard } from "@/components/EventFeedbackCard";
import { CalendarEvent } from "@/types/calendar";
import ReactMarkdown from "react-markdown";
import { Contact } from "@/types/contacts";
import { TypewriterText } from "@/components/TypewriterText";
import { useState, useEffect } from "react";

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
  contacts?: Contact[];
  showPlanningForm?: boolean;
  showFeedbackForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  onFeedbackSubmit?: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
  completedEvent?: CalendarEvent;
  messageId?: string;
}

// Create a global cache for completed animations that persists across module reloads
if (typeof window !== 'undefined' && !window.completedAnimations) {
  window.completedAnimations = new Set<string>();
}

export const ChatMessage = ({ 
  content, 
  isAl, 
  animate = true, 
  contacts,
  showPlanningForm,
  showFeedbackForm,
  onPlanningSubmit,
  onFeedbackSubmit,
  defaultContacts,
  defaultActivity,
  defaultLocation,
  defaultDate,
  defaultTime,
  completedEvent,
  messageId,
}: ChatMessageProps) => {
  // Check if this message should be animated
  const shouldAnimate = isAl && messageId && !window.completedAnimations.has(messageId);
  
  // Get animation state from localStorage
  const [isTypewriterComplete, setIsTypewriterComplete] = useState(() => {
    if (!messageId) return false;
    const animatedMessages = localStorage.getItem('animatedMessages');
    if (!animatedMessages) return false;
    return JSON.parse(animatedMessages).includes(messageId);
  });

  // Effect to handle animation completion
  useEffect(() => {
    if (messageId && isTypewriterComplete) {
      const animatedMessages = JSON.parse(localStorage.getItem('animatedMessages') || '[]');
      if (!animatedMessages.includes(messageId)) {
        animatedMessages.push(messageId);
        localStorage.setItem('animatedMessages', JSON.stringify(animatedMessages));
      }
    }
  }, [messageId, isTypewriterComplete]);

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
            {(isTypewriterComplete || !isAl) ? (
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
          {/* Render planning form if all conditions are met */}
          {showPlanningForm && onPlanningSubmit && isTypewriterComplete && (
            <div className="mt-4">
              <PlanningForm
                onSubmit={onPlanningSubmit}
                defaultContacts={defaultContacts}
                defaultActivity={defaultActivity}
                defaultLocation={defaultLocation}
                defaultDate={defaultDate}
                defaultTime={defaultTime}
              />
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
