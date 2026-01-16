import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TERMINAL_CLASSES } from "@/constants/terminalStyleGuide";

interface TypewriterFormattedTextProps {
  content: string;
  className?: string;
  speed?: number;
  enabled?: boolean;
  onComplete?: () => void;
  useTerminalStyle?: boolean;
}

/**
 * Typewriter effect for formatted text content
 * Terminal Style: Uses [v], [x], (!), [header] symbols
 * Legacy: Supports **bold**, `code`, and ```code blocks```
 */
export function TypewriterFormattedText({
  content,
  className,
  speed = 15,
  enabled = true,
  onComplete,
  useTerminalStyle = true,
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
    <div className={cn("whitespace-pre-wrap", useTerminalStyle && "font-mono", className)}>
      <FormattedContent content={displayContent} useTerminalStyle={useTerminalStyle} />
      {enabled && !isComplete && (
        <span className="inline-block w-0.5 h-4 ml-0.5 bg-primary animate-pulse align-middle" />
      )}
    </div>
  );
}

interface FormattedContentProps {
  content: string;
  useTerminalStyle?: boolean;
}

function FormattedContent({ content, useTerminalStyle = true }: FormattedContentProps) {
  const formatContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyIndex = 0;

    const patterns = useTerminalStyle
      ? [
          // Terminal style patterns
          { regex: /\[v\]/g, type: "success" as const },
          { regex: /\[x\]/g, type: "failure" as const },
          { regex: /\(\!\)/g, type: "warning" as const },
          { regex: /\[\s\]/g, type: "pending" as const },
          { regex: /\(Ref:\s*[^)]+\)/g, type: "ref" as const },
          { regex: /```([\s\S]*?)```/g, type: "codeblock" as const },
          { regex: /`([^`]+)`/g, type: "code" as const },
          // 书名号强调
          { regex: /「([^」]+)」/g, type: "emphasis" as const },
        ]
      : [
          // Legacy patterns
          { regex: /\*\*(.+?)\*\*/g, type: "bold" as const },
          { regex: /```([\s\S]*?)```/g, type: "codeblock" as const },
          { regex: /`([^`]+)`/g, type: "code" as const },
        ];

    interface Match {
      index: number;
      length: number;
      content: string;
      fullMatch: string;
      type: "bold" | "code" | "codeblock" | "success" | "failure" | "warning" | "pending" | "ref" | "emphasis";
    }

    const matches: Match[] = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: match[1] || match[0],
          fullMatch: match[0],
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
            <span key={keyIndex++} className="text-primary">
              {match.content}
            </span>
          );
          break;
        case "success":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.success}>
              {match.fullMatch}
            </span>
          );
          break;
        case "failure":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.failure}>
              {match.fullMatch}
            </span>
          );
          break;
        case "warning":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.warning}>
              {match.fullMatch}
            </span>
          );
          break;
        case "pending":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.pending}>
              {match.fullMatch}
            </span>
          );
          break;
        case "ref":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.ref}>
              {match.fullMatch}
            </span>
          );
          break;
        case "emphasis":
          // 书名号强调渲染为高亮胶囊
          parts.push(
            <span key={keyIndex++} className="highlight-pill highlight-pill-default">
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

  // Handle box drawing characters for terminal style
  if (useTerminalStyle) {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      if (/^[┌├└│─]/.test(line)) {
        const boxMatch = line.match(/^([┌├└│─]+)\s*(.*)/);
        if (boxMatch) {
          result.push(
            <React.Fragment key={`line-${lineIdx}`}>
              <span className={TERMINAL_CLASSES.boxChar}>{boxMatch[1]}</span>
              {formatContent(boxMatch[2] || '')}
              {lineIdx < lines.length - 1 && '\n'}
            </React.Fragment>
          );
          return;
        }
      }
      
      if (/^-{3,}$/.test(line.trim())) {
        result.push(
          <hr key={`sep-${lineIdx}`} className="border-t border-border my-2" />
        );
        return;
      }
      
      // Check for header lines [Title]
      if (/^\[.+\]$/.test(line.trim())) {
        result.push(
          <React.Fragment key={`line-${lineIdx}`}>
            <span className={TERMINAL_CLASSES.header}>{line}</span>
            {lineIdx < lines.length - 1 && '\n'}
          </React.Fragment>
        );
        return;
      }
      
      result.push(
        <React.Fragment key={`line-${lineIdx}`}>
          {formatContent(line)}
          {lineIdx < lines.length - 1 && '\n'}
        </React.Fragment>
      );
    });
    
    return <>{result}</>;
  }

  return <>{formatContent(content)}</>;
}
