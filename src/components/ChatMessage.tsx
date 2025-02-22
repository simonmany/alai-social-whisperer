
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ContactCard } from "@/components/ContactCard";
import { Contact } from "@/types/contacts";

interface ChatMessageProps {
  content: string;
  isAl: boolean;
  is_secret?: boolean;
  contacts?: Contact[];
  animate?: boolean;
}

export const ChatMessage = ({ content, isAl, is_secret, contacts, animate }: ChatMessageProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (contentRef.current) {
      setShowMore(contentRef.current.scrollHeight > contentRef.current.clientHeight);
    }
  }, [content]);

  const renderContactCards = () => {
    if (!contacts || !Array.isArray(contacts)) return null;

    return contacts.map((contact) => (
      <ContactCard
        key={contact.id}
        id={contact.id}
        name={contact.name}
        phone={contact.phone || undefined}
        instagram={contact.instagram || undefined}
        linkedin={contact.linkedin || undefined}
        twitter={contact.twitter || undefined}
        meetingStory={contact.meetingStory || undefined}
        relationship={contact.relationship || undefined}
        user_id={contact.user_id}
        created_at={contact.created_at}
      />
    ));
  };

  return (
    <div className={cn(
      "col-start-1 col-end-13 p-4",
      !isAl && "bg-primary text-primary-foreground rounded-lg"
    )}>
      <div className="flex items-start gap-3">
        <div className="flex flex-col w-full">
          <div
            ref={contentRef}
            className={cn(
              "text-lg font-light break-words leading-relaxed",
              isExpanded ? "max-h-none" : "max-h-[400px] overflow-hidden",
              isAl && "text-foreground"
            )}
          >
            {content}
          </div>
          {showMore && (
            <button
              className="text-blue-500 hover:underline text-base mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "Show less" : "Show more"}
            </button>
          )}
          {renderContactCards()}
        </div>
      </div>
    </div>
  );
};
