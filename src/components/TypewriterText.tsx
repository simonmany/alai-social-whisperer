import React, { useState, useEffect, useRef } from 'react';
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function to clear any existing timers
  const cleanup = () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
  };

  // Function to immediately complete the current text
  const completeCurrentText = () => {
    cleanup();
    setDisplayedText(text);
    setIsTyping(false);
    if (!hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete?.();
    }
  };

  useEffect(() => {
    // Reset refs and state when text changes
    hasStartedRef.current = false;
    hasCompletedRef.current = false;
    setDisplayedText('');
    setIsTyping(false);
    cleanup();

    if (!text) return;

    // Start the typing animation after the delay
    timeoutIdRef.current = setTimeout(() => {
      setIsTyping(true);
      hasStartedRef.current = true;
      let currentIndex = 0;
      
      intervalIdRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          completeCurrentText();
        }
      }, typingSpeed);

    }, delay);

    // Cleanup when component unmounts or text changes
    return cleanup;
  }, [text, onComplete, delay, typingSpeed]);

  return (
    <div className={cn("relative w-full", className)} style={{ width: '100%' }}>
      <span className="whitespace-pre-wrap w-full" style={{ width: '100%', display: 'block' }}>
        {displayedText.split('\n').map((line, i, arr) => (
          <span key={i}>
            {line}
            {i === arr.length - 1 && isTyping && (
              <span 
                aria-hidden="true"
                className="inline-block border-r-2 border-current"
                style={{
                  height: '1.2em',
                  animation: 'cursor-blink 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
                  marginLeft: '1px',
                  verticalAlign: 'middle',
                }}
              />
            )}
            {i < arr.length - 1 && <br />}
          </span>
        ))}
      </span>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
};