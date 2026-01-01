import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface TypewriterFormattedTextProps {
  content: string;
  className?: string;
  speed?: number;
  enabled?: boolean;
  onComplete?: () => void;
}

/**
 * Typewriter effect for formatted text content
 * Supports **bold**, `code`, and ```code blocks```
 */
export function TypewriterFormattedText({
  content,
  className,
  speed = 15,
  enabled = true,
  onComplete,
}: TypewriterFormattedTextProps) {
  const [displayedLength, setDisplayedLength] = useState(enabled ? 0 : content.length);
  const [isComplete, setIsComplete] = useState(!enabled);
  const prevContentRef = useRef(content);

  useEffect(() => {
    // If content changed and we're getting more content (streaming), show all
    if (content !== prevContentRef.current) {
      if (content.startsWith(prevContentRef.current)) {
        // Streaming - just update to show new content
        setDisplayedLength(content.length);
        setIsComplete(true);
      } else {
        // New content - reset
        setDisplayedLength(enabled ? 0 : content.length);
        setIsComplete(!enabled);
      }
      prevContentRef.current = content;
      return;
    }

    if (!enabled || displayedLength >= content.length) {
      if (!isComplete && displayedLength >= content.length) {
        setIsComplete(true);
        onComplete?.();
      }
      return;
    }

    const timer = setTimeout(() => {
      // Speed up for spaces and common characters
      const nextChar = content[displayedLength];
      const increment = nextChar === " " || nextChar === "\n" ? 3 : 1;
      setDisplayedLength((prev) => Math.min(prev + increment, content.length));
    }, speed);

    return () => clearTimeout(timer);
  }, [content, displayedLength, speed, enabled, isComplete, onComplete]);

  const displayContent = content.slice(0, displayedLength);

  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      <FormattedContent content={displayContent} />
      {enabled && !isComplete && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse align-middle" />
      )}
    </div>
  );
}

interface FormattedContentProps {
  content: string;
}

function FormattedContent({ content }: FormattedContentProps) {
  const formatContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyIndex = 0;

    const patterns = [
      { regex: /\*\*(.+?)\*\*/g, type: "bold" as const },
      { regex: /```([\s\S]*?)```/g, type: "codeblock" as const },
      { regex: /`([^`]+)`/g, type: "code" as const },
    ];

    interface Match {
      index: number;
      length: number;
      content: string;
      type: "bold" | "code" | "codeblock";
    }

    const matches: Match[] = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: match[1],
          type,
        });
      }
    });

    matches.sort((a, b) => a.index - b.index);

    const filteredMatches: Match[] = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.index + match.length;
      }
    }

    for (const match of filteredMatches) {
      if (match.index > currentIndex) {
        parts.push(
          <span key={keyIndex++}>{text.slice(currentIndex, match.index)}</span>
        );
      }

      switch (match.type) {
        case "bold":
          parts.push(
            <span key={keyIndex++} className="font-semibold text-primary">
              {match.content}
            </span>
          );
          break;
        case "code":
          parts.push(
            <code
              key={keyIndex++}
              className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs"
            >
              {match.content}
            </code>
          );
          break;
        case "codeblock":
          parts.push(
            <pre key={keyIndex++} className="my-2 p-3 rounded-lg bg-muted overflow-x-auto">
              <code className="text-xs font-mono text-foreground whitespace-pre">
                {match.content.trim()}
              </code>
            </pre>
          );
          break;
      }

      currentIndex = match.index + match.length;
    }

    if (currentIndex < text.length) {
      parts.push(<span key={keyIndex++}>{text.slice(currentIndex)}</span>);
    }

    return parts;
  };

  return <>{formatContent(content)}</>;
}
