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
  const [showCursor, setShowCursor] = useState(true);
  const hasStartedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      
      // Start cursor blinking
      const cursorBlinkInterval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 500);
      
      intervalIdRef.current = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(cursorBlinkInterval);
          setShowCursor(true); // Ensure cursor is visible at the end
          completeCurrentText();
        }
      }, typingSpeed);

      return () => clearInterval(cursorBlinkInterval);
    }, delay);

    // Cleanup when component unmounts or text changes
    return cleanup;
  }, [text, onComplete, delay, typingSpeed]);

  return (
    <div ref={containerRef} className={cn("prose prose-base max-w-none", className)}>
      <div className="typewriter-container">
        <div className="markdown-content">
          <ReactMarkdown>{displayedText}</ReactMarkdown>
        </div>
        {isTyping && (
          <span 
            className="cursor"
            style={{ 
              display: 'inline-block',
              width: '2px',
              backgroundColor: 'currentColor',
              height: '1.2em',
              verticalAlign: 'text-bottom',
              marginLeft: '1px',
              opacity: showCursor ? 1 : 0,
            }}
          />
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .typewriter-container {
          display: inline-flex;
          align-items: flex-end;
          flex-wrap: wrap;
        }
        .markdown-content {
          display: inline;
          font-size: inherit;
          line-height: inherit;
        }
        .markdown-content > * {
          display: inline;
          margin: 0;
          padding: 0;
          font-size: inherit;
          line-height: inherit;
        }
        .markdown-content p {
          display: inline;
          margin: 0;
          font-size: inherit;
          line-height: inherit;
        }
        .markdown-content h1, .markdown-content h2, .markdown-content h3,
        .markdown-content h4, .markdown-content h5, .markdown-content h6 {
          display: inline;
          margin: 0;
          padding: 0;
          font-size: inherit;
          line-height: inherit;
          font-weight: inherit;
        }
        .markdown-content ul, .markdown-content ol {
          display: block;
          margin-top: 0.5em;
          margin-bottom: 0.5em;
          font-size: inherit;
          line-height: inherit;
        }
        .cursor {
          animation: blink 0.8s infinite;
          margin-bottom: 0.15em;
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}} />
    </div>
  );
};