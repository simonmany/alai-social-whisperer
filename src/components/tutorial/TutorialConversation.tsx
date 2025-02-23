import { useEffect, useState } from "react";
import { ChatContainer } from "@/components/ChatContainer";
import { Message } from "@/types/chat";

interface TutorialConversationProps {
  onComplete: () => void;
  messages: Message[];
  isLoading: boolean;
  onSend: (content: string) => void;
  onSuggestedPrompt: (prompt: string) => void;
}

export const TutorialConversation = ({
  onComplete,
  messages,
  isLoading,
  onSend,
  onSuggestedPrompt
}: TutorialConversationProps) => {
  const tutorialPrompts = [
    { text: "plan a future hang", action: "plan me a hang" },
    { text: "tell me more", action: "tell me more" }
  ];

  return (
    <ChatContainer
      messages={messages}
      isLoading={isLoading}
      onSend={onSend}
      onSuggestedPrompt={onSuggestedPrompt}
      suggestedPrompts={tutorialPrompts}
    >
      <></>
    </ChatContainer>
  );
};
