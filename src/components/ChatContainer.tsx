import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { SuggestedPrompt } from "@/components/SuggestedPrompt";

interface Message {
  content: string;
  isAl: boolean;
}

interface ChatContainerProps {
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
}

export const ChatContainer = ({
  messages,
  isLoading,
  onSend,
  onSuggestedPrompt,
}: ChatContainerProps) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message, index) => (
          <ChatMessage
            key={index}
            content={message.content}
            isAl={message.isAl}
            animate={index === messages.length - 1}
          />
        ))}
        {isLoading && (
          <div className="self-start text-sm text-gray-500 animate-pulse">
            Al is typing...
          </div>
        )}
      </div>
      <div className="sticky bottom-0 bg-gray-50 pt-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-gray-500 italic">Things we can talk about...</p>
          <div className="flex gap-2 flex-wrap">
            <SuggestedPrompt
              text="plan me a hang"
              onClick={() => onSuggestedPrompt("plan me a hang")}
            />
            <SuggestedPrompt
              text="talk about a hang"
              onClick={() => onSuggestedPrompt("talk about a hang")}
            />
            <SuggestedPrompt
              text="Set a new goal"
              onClick={() => onSuggestedPrompt("Set a new goal")}
            />
            <SuggestedPrompt
              text="add a new contact"
              onClick={() => onSuggestedPrompt("add a new contact")}
            />
          </div>
        </div>
        <ChatInput onSend={onSend} />
      </div>
    </div>
  );
};