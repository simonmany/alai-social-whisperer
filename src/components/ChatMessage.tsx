import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";

interface ContactInfo {
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
  contactInfo?: ContactInfo;
}

export const ChatMessage = ({ content, isAl, animate = true, contactInfo }: ChatMessageProps) => {
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
          {contactInfo && (
            <div className="mt-4">
              <ContactCard {...contactInfo} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-sm">
          <div>{content}</div>
        </div>
      )}
    </div>
  );
};