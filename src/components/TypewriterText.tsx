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
  delay = 0,
  typingSpeed = 50 
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let intervalId: NodeJS.Timeout;
    
    timeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      setDisplayedText(''); // Reset text when starting new animation
      
      intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
          onComplete?.();
        }
      }, typingSpeed);

    }, delay);

    // Cleanup function to clear both timeout and interval
    return () => {
      clearTimeout(timeout);
      clearInterval(intervalId);
    };
  }, [text, onComplete, delay, typingSpeed]); // Added all dependencies

  return (
    <div className={cn("relative inline-block font-cormorant", className)}>
      {displayedText}
      {isTyping && (
        <span className="ml-1 animate-[blink_1s_infinite]">|</span>
      )}
    </div>
  );
};