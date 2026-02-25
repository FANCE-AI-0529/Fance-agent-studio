import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { TERMINAL_CLASSES } from "@/constants/terminalStyleGuide";
import { AlertCircle } from "lucide-react";

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
 * Terminal Style: Uses [v], [x], (!), [header] symbols + semantic tags
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
    if (content !== prevContentRef.current) {
      if (content.startsWith(prevContentRef.current)) {
        setDisplayedLength(content.length);
        setIsComplete(true);
      } else {
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
      const remaining = content.slice(displayedLength);
      const codeBlockStart = remaining.match(/^```/);
      
      if (codeBlockStart) {
        const endMatch = remaining.slice(3).indexOf('```');
        if (endMatch !== -1) {
          setDisplayedLength((prev) => prev + endMatch + 6);
          return;
        }
      }
      
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
          // Semantic highlighting tags (highest priority)
          { regex: /<h-entity>([^<]+)<\/h-entity>/g, type: "h-entity" as const },
          { regex: /<h-alert>([^<]+)<\/h-alert>/g, type: "h-alert" as const },
          { regex: /<h-data>([^<]+)<\/h-data>/g, type: "h-data" as const },
          { regex: /<h-status>([^<]+)<\/h-status>/g, type: "h-status" as const },
          // Extended semantic tags
          { regex: /<h-link>([^<]+)<\/h-link>/g, type: "h-link" as const },
          { regex: /<h-code>([^<]+)<\/h-code>/g, type: "h-code" as const },
          { regex: /<h-quote(?:\s+ref="([^"]*)")?>([^<]+)<\/h-quote>/g, type: "h-quote" as const },
          { regex: /<h-action>([^<]+)<\/h-action>/g, type: "h-action" as const },
          // Terminal style patterns
          { regex: /\[v\]/g, type: "success" as const },
          { regex: /\[x\]/g, type: "failure" as const },
          { regex: /\(\!\)/g, type: "warning" as const },
          { regex: /\[\s\]/g, type: "pending" as const },
          { regex: /\(Ref:\s*[^)]+\)/g, type: "ref" as const },
          { regex: /```([\s\S]*?)```/g, type: "codeblock" as const },
          { regex: /`([^`]+)`/g, type: "code" as const },
          { regex: /^\[([^\]]+)\]$/gm, type: "header" as const },
          // Legacy emphasis (backwards compatibility)
          { regex: /「([^」]+)」/g, type: "emphasis" as const },
          { regex: /\*\*(.+?)\*\*/g, type: "bold" as const },
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
      refSource?: string;
      type: "bold" | "code" | "codeblock" | "success" | "failure" | "warning" | "pending" | "ref" | "header" | "emphasis" | "h-entity" | "h-alert" | "h-data" | "h-status" | "h-link" | "h-code" | "h-quote" | "h-action";
    }

    const matches: Match[] = [];
    patterns.forEach(({ regex, type }) => {
      let match;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
          content: type === 'h-quote' ? match[2] || match[1] : (match[1] || match[0]),
          fullMatch: match[0],
          refSource: type === 'h-quote' ? match[1] : undefined,
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
        case "h-entity":
          parts.push(
            <span key={keyIndex++} className="inline bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded-md font-medium text-sm border border-indigo-500/20">
              {match.content}
            </span>
          );
          break;
        case "h-alert":
          parts.push(
            <span key={keyIndex++} className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-300 px-1.5 py-0.5 rounded-md font-semibold text-sm border border-rose-500/20">
              <AlertCircle className="h-3 w-3" />
              {match.content}
            </span>
          );
          break;
        case "h-data":
          parts.push(
            <span key={keyIndex++} className="font-mono text-cyan-400 font-bold tracking-wide">
              {match.content}
            </span>
          );
          break;
        case "h-status":
          parts.push(
            <span key={keyIndex++} className="text-emerald-400 font-medium">
              {match.content}
            </span>
          );
          break;
        case "h-link":
          parts.push(
            <span key={keyIndex++} className="text-blue-400 underline underline-offset-2 cursor-pointer hover:text-blue-300 transition-colors">
              {match.content}
            </span>
          );
          break;
        case "h-code":
          parts.push(
            <code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-muted text-cyan-400 font-mono text-xs border border-cyan-500/20">
              {match.content}
            </code>
          );
          break;
        case "h-quote":
          parts.push(
            <span 
              key={keyIndex++} 
              className="inline italic text-muted-foreground border-l-2 border-primary/40 pl-2"
              title={match.refSource ? `来源: ${match.refSource}` : undefined}
            >
              "{match.content}"
              {match.refSource && (
                <sup className="text-[9px] text-primary ml-0.5">[{match.refSource.slice(-8)}]</sup>
              )}
            </span>
          );
          break;
        case "h-action":
          parts.push(
            <span key={keyIndex++} className="inline-flex items-center gap-1 bg-primary/15 text-primary px-2 py-0.5 rounded-full text-xs font-medium border border-primary/25 cursor-pointer hover:bg-primary/25 transition-colors">
              {match.content}
            </span>
          );
          break;
        case "bold":
        case "emphasis":
          parts.push(
            <span key={keyIndex++} className="inline bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded-md font-medium text-sm border border-indigo-500/20">
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
        case "header":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.header}>
              {match.fullMatch}
            </span>
          );
          break;
        case "code":
          parts.push(
            <code key={keyIndex++} className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs">
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

  // Handle line-level formatting for terminal style
  if (useTerminalStyle) {
    const lines = content.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      // Empty line → spacer
      if (/^\s*$/.test(line)) {
        result.push(<div key={`space-${lineIdx}`} className="h-2" />);
        return;
      }

      // Box drawing characters
      if (/^[┌├└│─]/.test(line)) {
        const boxMatch = line.match(/^([┌├└│─]+)\s*(.*)/);
        if (boxMatch) {
          result.push(
            <React.Fragment key={`line-${lineIdx}`}>
              <span className="text-muted-foreground/60 mr-1.5">{boxMatch[1]}</span>
              {formatContent(boxMatch[2] || '')}
              {lineIdx < lines.length - 1 && '\n'}
            </React.Fragment>
          );
          return;
        }
      }
      
      // Separator ---
      if (/^-{3,}$/.test(line.trim())) {
        result.push(
          <hr key={`sep-${lineIdx}`} className="border-t border-border my-3" />
        );
        return;
      }
      
      // Header lines [Title]
      if (/^\[.+\]$/.test(line.trim())) {
        result.push(
          <React.Fragment key={`line-${lineIdx}`}>
            <span className={TERMINAL_CLASSES.header}>{line}</span>
            {lineIdx < lines.length - 1 && '\n'}
          </React.Fragment>
        );
        return;
      }

      // Numbered heading: 1. Title
      if (/^\d+\.\s+/.test(line)) {
        const numMatch = line.match(/^(\d+\.)\s+(.*)/);
        if (numMatch) {
          result.push(
            <div key={`line-${lineIdx}`} className="flex items-start gap-2 mt-2 mb-1 border-l-2 border-primary/40 pl-2">
              <span className="text-primary font-bold text-sm">{numMatch[1]}</span>
              <span className="text-primary font-medium text-sm">{formatContent(numMatch[2])}</span>
            </div>
          );
          return;
        }
      }

      // Bullet list: * item or - item
      if (/^[\*\-]\s+/.test(line)) {
        const bulletContent = line.replace(/^[\*\-]\s+/, '');
        result.push(
          <div key={`line-${lineIdx}`} className="flex items-start gap-2 pl-4">
            <span className="text-muted-foreground mt-1.5 text-[6px]">●</span>
            <span>{formatContent(bulletContent)}</span>
          </div>
        );
        return;
      }
      
      // Regular line
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
