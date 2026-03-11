import { useState, useEffect, useRef } from "react";
import { cn } from "../../lib/utils.ts";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export function TypewriterText({
  text,
  speed = 20,
  className,
  onComplete,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const indexRef = useRef(0);
  const prevTextRef = useRef("");

  useEffect(() => {
    // If text changed (streaming), just display the full text
    if (text !== prevTextRef.current && text.length > prevTextRef.current.length) {
      setDisplayedText(text);
      prevTextRef.current = text;
      return;
    }

    // Reset if text completely changed
    if (!text.startsWith(prevTextRef.current)) {
      indexRef.current = 0;
      setDisplayedText("");
      setIsComplete(false);
    }

    prevTextRef.current = text;

    if (indexRef.current >= text.length) {
      if (!isComplete) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(text.slice(0, indexRef.current + 1));
      indexRef.current += 1;
    }, speed);

    return () => clearTimeout(timer);
  }, [text, displayedText, speed, isComplete, onComplete]);

  return (
    <span className={cn(className)}>
      {displayedText}
      {!isComplete && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-foreground animate-pulse" />
      )}
    </span>
  );
}
