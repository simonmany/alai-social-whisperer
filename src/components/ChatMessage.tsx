
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
import { PlanningForm } from "@/components/PlanningForm";
import ReactMarkdown from "react-markdown";

interface Contact {
  id: string;
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meetingStory?: string;
  relationship?: string;
  user_id: string;
}

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
  contacts?: Contact[];
  showPlanningForm?: boolean;
  onPlanningSubmit?: (message: string) => void;
  defaultContacts?: Contact[];
  defaultActivity?: string;
  defaultLocation?: string;
  defaultDate?: Date;
  defaultTime?: string;
}

export const ChatMessage = ({ 
  content, 
  isAl, 
  animate = true, 
  contacts,
  showPlanningForm,
  onPlanningSubmit,
  defaultContacts,
  defaultActivity,
  defaultLocation,
  defaultDate,
  defaultTime,
}: ChatMessageProps) => {
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
          {showPlanningForm && onPlanningSubmit && (
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
