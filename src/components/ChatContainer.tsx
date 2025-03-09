import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput, ChatInputRef } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";
import { Button } from "@/components/ui/button";
import { ChevronDown, SendHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Contact } from "@/types/contacts";
import { CalendarEvent } from "@/types/calendar";
import { Message } from "@/types/chat";

interface SuggestedPromptItem {
  text: string;
  action: string;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
  onTutorialAction?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  suggestedPrompts?: SuggestedPromptItem[];
}

export const ChatContainer = ({
  messages,
  isLoading,
  onSend,
  onSuggestedPrompt,
  onTutorialAction,
  disabled = false,
  children,
  suggestedPrompts = []
}: ChatContainerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className={cn(
      "relative flex flex-col h-full min-h-[calc(100vh-12rem)]",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <div 
        ref={containerRef}
        className="flex-1 flex flex-col overflow-y-auto space-y-4 mb-4"
        onScroll={handleScroll}
      >
        <div className="flex flex-col gap-3 pb-4">
          {messages.map((message, index) => {
            if (message.is_secret && message.content === "Let's go!" && onTutorialAction) {
              return (
                <div key={index} className="self-end">
                  <Button
                    onClick={onTutorialAction}
                    className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-lg"
                  >
                    Let's go!
                  </Button>
                </div>
              );
            }
            
            if (!message.is_secret) {
              return (
                <ChatMessage
                  key={index}
                  content={message.content}
                  isAl={message.isAl}
                  animate={index === messages.length - 1}
                  contacts={message.contactInfo ? [message.contactInfo] : undefined}
                  showPlanningForm={message.showPlanningForm}
                  onPlanningSubmit={message.onPlanningSubmit}
                  defaultContacts={message.defaultContacts}
                  defaultActivity={message.defaultActivity}
                  messageId={message.id}
                  typewriterPlayed={message.typewriterPlayed}
                  defaultLocation={message.defaultLocation}
                  defaultDate={message.defaultDate}
                  defaultTime={message.defaultTime}
                  showFeedbackForm={message.showFeedbackForm}
                  onFeedbackSubmit={message.onFeedbackSubmit}
                  completedEvent={message.completedEvent}
                  messageType={message.messageType}
                />
              );
            }
            
            return null;
          })}
          
          {isLoading && (
            <div className="self-start text-sm text-gray-500 animate-pulse">
              Al is typing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        {showScrollButton && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={scrollToBottom}
            >
              <ChevronDown className="h-6 w-6" />
            </Button>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="flex gap-2">
            {/* Left column for text input and buttons above it */}
            <div className="flex-1 flex flex-col">
              {/* Buttons container - only spans the width of the text input */}
              <div className="mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {suggestedPrompts.map((prompt, index) => (
                    <SuggestedPrompt
                      key={index}
                      text={prompt.text}
                      onClick={() => onSuggestedPrompt(prompt.action)}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
              
              {/* Text input */}
              <ChatInput 
                ref={chatInputRef} 
                onSend={onSend} 
                showSendButton={false} 
              />
            </div>
            
            {/* Send button column */}
            <div className="flex items-end">
              <Button type="submit" size="icon" onClick={() => {
                if (chatInputRef.current) {
                  const value = chatInputRef.current.getValue();
                  if (value.trim()) {
                    onSend(value.trim());
                    chatInputRef.current.clearInput();
                  }
                }
              }}>
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};
