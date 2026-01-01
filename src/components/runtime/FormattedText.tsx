import React from "react";
import { cn } from "@/lib/utils";

interface FormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Formats message content by converting markdown-style formatting to styled HTML
 * - **text** becomes bold with primary color
 * - `code` becomes inline code blocks
 * - ```code``` becomes code blocks
 * - Preserves newlines and other formatting
 */
export function FormattedText({ content, className }: FormattedTextProps) {
  const formatContent = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let keyIndex = 0;

    // Match patterns: **bold**, `inline code`, and ```code blocks```
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

    // Find all matches
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
          parts.push(
            <span
              key={keyIndex++}
              className="font-semibold text-primary"
            >
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

  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      {formatContent(content)}
    </div>
  );
}
