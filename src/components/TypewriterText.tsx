import React, { useState, useEffect, useRef } from 'react';
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
  delay = 250,
  typingSpeed = 25
}: TypewriterTextProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    // Reset refs when text changes
    hasStartedRef.current = false;
    hasCompletedRef.current = false;
    setDisplayedText('');
    setIsTyping(false);
  }, [text]);

  useEffect(() => {
    if (hasStartedRef.current || !text) return;
    hasStartedRef.current = true;

    const timeout = setTimeout(() => {
      setIsTyping(true);
      let currentIndex = 0;
      
      const intervalId = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(intervalId);
          setIsTyping(false);
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onComplete?.();
          }
        }
      }, typingSpeed);

      return () => clearInterval(intervalId);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, onComplete, delay, typingSpeed]);

  return (
    <div className={cn("relative inline-block", className)}>
      {displayedText}
      {isTyping && (
        <span className="ml-1 animate-[blink_1s_infinite]">|</span>
      )}
    </div>
  );
};