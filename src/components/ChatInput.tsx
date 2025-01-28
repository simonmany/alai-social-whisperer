import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  type?: string;
  initialValue?: string;
  showSendButton?: boolean;
}

export const ChatInput = ({ 
  onSend, 
  placeholder = "... or tell me what's on your mind!",
  type = "text",
  initialValue = "",
  showSendButton = true
}: ChatInputProps) => {
  const [message, setMessage] = useState(initialValue);

  useEffect(() => {
    setMessage(initialValue);
  }, [initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSend(message);
        setMessage("");
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-h-[44px] resize-none"
      />
      {showSendButton && (
        <Button type="submit" size="icon">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
};