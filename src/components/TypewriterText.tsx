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
  const [hasStarted, setHasStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCalledOnComplete = useRef(false);

  useEffect(() => {
    // Reset state when text changes
    setDisplayedText('');
    setIsTyping(false);
    setHasStarted(false);
    setIsComplete(false);
    hasCalledOnComplete.current = false;

    // Clear any existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (!text) return;

    // Start typing after delay
    timeoutRef.current = setTimeout(() => {
      setIsTyping(true);
      setHasStarted(true);
      let currentIndex = 0;

      intervalRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          // Cleanup and mark as complete
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          setIsTyping(false);
          setIsComplete(true);
          
          // Only call onComplete once
          if (!hasCalledOnComplete.current && onComplete) {
            hasCalledOnComplete.current = true;
            onComplete();
          }
        }
      }, typingSpeed);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, delay, typingSpeed, onComplete]);

  return (
    <div className={cn("relative inline-block", className)}>
      {displayedText}
      {isTyping && (
        <span className="ml-1 animate-[blink_1s_infinite]">|</span>
      )}
    </div>
  );
};