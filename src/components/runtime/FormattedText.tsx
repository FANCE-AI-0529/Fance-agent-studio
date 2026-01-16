import React from "react";
import { cn } from "@/lib/utils";
import { TERMINAL_CLASSES } from "@/constants/terminalStyleGuide";

interface FormattedTextProps {
  content: string;
  className?: string;
  useTerminalStyle?: boolean;
}

/**
 * Formats message content by converting markdown-style formatting to styled HTML
 * Terminal Style Mode: Uses [header], [v], [x], (!) symbols instead of **bold**
 * Legacy Mode: Supports **text** for bold, `code` for inline code, ```code``` for blocks
 */
export function FormattedText({ content, className, useTerminalStyle = true }: FormattedTextProps) {
  const formatContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyIndex = 0;

    // Define patterns based on mode
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
          { regex: /^\[([^\]]+)\]$/gm, type: "header" as const },
        ]
      : [
          // Legacy markdown patterns (kept for backwards compatibility)
          { regex: /\*\*(.+?)\*\*/g, type: "bold" as const },
          { regex: /```([\s\S]*?)```/g, type: "codeblock" as const },
          { regex: /`([^`]+)`/g, type: "code" as const },
        ];

    interface Match {
      index: number;
      length: number;
      content: string;
      fullMatch: string;
      type: "bold" | "code" | "codeblock" | "success" | "failure" | "warning" | "pending" | "ref" | "header";
    }

    // Find all matches
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

    // Sort matches by index
    matches.sort((a, b) => a.index - b.index);

    // Filter out overlapping matches
    const filteredMatches: Match[] = [];
    let lastEnd = 0;
    for (const match of matches) {
      if (match.index >= lastEnd) {
        filteredMatches.push(match);
        lastEnd = match.index + match.length;
      }
    }

    // Build result
    for (const match of filteredMatches) {
      // Add text before match
      if (match.index > currentIndex) {
        parts.push(
          <span key={keyIndex++}>{text.slice(currentIndex, match.index)}</span>
        );
      }

      // Add formatted match
      switch (match.type) {
        case "bold":
          // Legacy bold - render as primary color text without actual bold
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
        case "header":
          parts.push(
            <span key={keyIndex++} className={TERMINAL_CLASSES.header}>
              {match.fullMatch}
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
            <pre
              key={keyIndex++}
              className="my-2 p-3 rounded-lg bg-muted overflow-x-auto"
            >
              <code className="text-xs font-mono text-foreground whitespace-pre">
                {match.content.trim()}
              </code>
            </pre>
          );
          break;
      }

      currentIndex = match.index + match.length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(<span key={keyIndex++}>{text.slice(currentIndex)}</span>);
    }

    return parts;
  };

  // Format box drawing characters in lines
  const formatWithBoxChars = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];
    
    lines.forEach((line, lineIdx) => {
      // Check for box drawing characters
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
      
      // Check for separator
      if (/^-{3,}$/.test(line.trim())) {
        result.push(
          <hr key={`sep-${lineIdx}`} className="border-t border-border my-2" />
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
    
    return result;
  };

  return (
    <div className={cn("whitespace-pre-wrap", useTerminalStyle && "font-mono", className)}>
      {useTerminalStyle ? formatWithBoxChars(content) : formatContent(content)}
    </div>
  );
}
