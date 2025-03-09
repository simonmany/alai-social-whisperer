import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SendHorizontal } from "lucide-react";
import { Capacitor } from '@capacitor/core';

export interface ChatInputRef {
  clearInput: () => void;
  getValue: () => string;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  type?: string;
  initialValue?: string;
  showSendButton?: boolean;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(({ 
  onSend, 
  placeholder = "... or tell me what's on your mind!",
  type = "text",
  initialValue = "",
  showSendButton = true
}, ref) => {
  const [message, setMessage] = useState(initialValue);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    clearInput: () => {
      setMessage("");
    },
    getValue: () => {
      return message;
    }
  }));

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
    console.log('trimmed!!!!!!', message.trim());
    console.log('key!!!!!', e);

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (message.trim()) {
        onSend(message);
        setMessage("");
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 min-h-[44px] resize-none text-lg"
      />
      {showSendButton && (
        <Button type="submit" size="icon">
          <SendHorizontal className="h-4 w-4" />
        </Button>
      )}
    </form>
  );
});
