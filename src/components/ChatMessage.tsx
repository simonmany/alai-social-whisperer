
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
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
          <div className="whitespace-pre-line prose prose-sm max-w-none prose-gray [&>*:not(:first-child)]:!mt-2 prose-headings:!mt-4 prose-headings:!mb-2">
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
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          <div className="whitespace-pre-line prose prose-sm max-w-none prose-invert [&>*:not(:first-child)]:!mt-2 prose-headings:!mt-4 prose-headings:!mb-2">
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
