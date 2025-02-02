import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";

interface Contact {
  name: string;
  phone?: string;
  instagram?: string;
  linkedin?: string;
  twitter?: string;
  meetingStory?: string;
  relationship?: string;
}

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  animate?: boolean;
  contacts?: Contact[];
}

export const ChatMessage = ({ content, isAl, animate = true, contacts }: ChatMessageProps) => {
  return (
    <div
      className={cn(
        "mb-4 max-w-[80%] text-lg font-cormorant",
        isAl ? "self-start" : "self-end",
        animate && (isAl ? "animate-slide-in-left" : "animate-slide-in-right")
      )}
    >
      {isAl ? (
        <div className="text-gray-800 px-4 py-2 rounded-lg bg-transparent">
          <div>{content}</div>
          {contacts && contacts.length > 0 && (
            <div className="mt-4 space-y-4">
              {contacts.map((contact, index) => (
                <ContactCard key={`${contact.name}-${index}`} {...contact} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          <div>{content}</div>
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