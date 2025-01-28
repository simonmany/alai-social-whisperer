import React, { useState, useEffect } from 'react';
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  text: string;
  onComplete?: () => void;
  className?: string;
  delay?: number;
  typingSpeed?: number;
}

export const TypewriterText = ({ 
  text, 
  onComplete, 
  className,
  delay = 250, // Changed default delay to 250ms
  typingSpeed = 25  // Set default typing speed to 25ms
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);

  useEffect(() => {
    if (hasTyped) {
      setDisplayedText(text);
      return;
    }

    let timeout: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    timeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      setDisplayedText('');
      
      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
          setHasTyped(true);
          onComplete?.();
        }
      }, typingSpeed);

    }, delay);

    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
    };
  }, [text, onComplete, delay, typingSpeed, hasTyped]);

  return (
    <div className={cn("relative inline-block font-cormorant", className)}>
      {displayedText}
      {isTyping && (
        <span className="ml-1 animate-[blink_1s_infinite]">|</span>
      )}
    </div>
  );
};