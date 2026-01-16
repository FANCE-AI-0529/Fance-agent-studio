import React from "react";
import { cn } from "@/lib/utils";
import { TERMINAL_CLASSES, detectResponseMode } from "@/constants/terminalStyleGuide";

interface TerminalFormattedTextProps {
  content: string;
  className?: string;
}

/**
 * Terminal-style formatted text component
 * Renders text with terminal aesthetics - no bold, uses symbols for emphasis
 */
export function TerminalFormattedText({ content, className }: TerminalFormattedTextProps) {
  const mode = detectResponseMode(content);
  
  return (
    <div className={cn(TERMINAL_CLASSES.container, "whitespace-pre-wrap", className)}>
      {formatTerminalContent(content)}
    </div>
  );
}

/**
 * Format content for terminal display
 */
function formatTerminalContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const formattedLine = formatLine(line, lineIndex);
    parts.push(formattedLine);
    if (lineIndex < lines.length - 1) {
      parts.push('\n');
    }
  });
  
  return parts;
}

/**
 * Format a single line with terminal styling
 */
function formatLine(line: string, key: number): React.ReactNode {
  // Header pattern: [Title]
  if (/^\[.+\]$/.test(line.trim())) {
    return (
      <span key={key} className={TERMINAL_CLASSES.header}>
        {line}
      </span>
    );
  }
  
  // Separator pattern: ---
  if (/^-{3,}$/.test(line.trim())) {
    return <hr key={key} className={TERMINAL_CLASSES.separator} />;
  }
  
  // Quote pattern: > text
  if (/^>\s/.test(line)) {
    return (
      <div key={key} className={TERMINAL_CLASSES.quote}>
        {formatInlineElements(line.slice(2))}
      </div>
    );
  }
  
  // Box drawing characters
  if (/^[┌├└│]/.test(line)) {
    const boxMatch = line.match(/^([┌├└│─]+)\s*(.*)/);
    if (boxMatch) {
      return (
        <span key={key}>
          <span className={TERMINAL_CLASSES.boxChar}>{boxMatch[1]}</span>
          {formatInlineElements(boxMatch[2] || '')}
        </span>
      );
    }
  }
  
  // Status patterns with inline formatting
  return <span key={key}>{formatInlineElements(line)}</span>;
}

/**
 * Format inline elements within a line
 */
function formatInlineElements(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let currentIndex = 0;
  let keyIndex = 0;
  
  // Define inline patterns (order matters - more specific first)
  const patterns = [
    // Success indicator [v]
    { regex: /\[v\]/g, type: 'success' as const },
    // Failure indicator [x]
    { regex: /\[x\]/g, type: 'failure' as const },
    // Warning indicator (!)
    { regex: /\(\!\)/g, type: 'warning' as const },
    // Pending indicator [ ]
    { regex: /\[\s\]/g, type: 'pending' as const },
    // Reference (Ref: ...)
    { regex: /\(Ref:\s*[^)]+\)/g, type: 'ref' as const },
    // Inline header [Title] - but not full line headers
    { regex: /\[[^\]]+\]/g, type: 'inlineHeader' as const },
    // Code blocks ```...```
    { regex: /```([\s\S]*?)```/g, type: 'codeblock' as const },
    // Inline code `...`
    { regex: /`([^`]+)`/g, type: 'code' as const },
  ];
  
  interface Match {
    index: number;
    length: number;
    content: string;
    fullMatch: string;
    type: 'success' | 'failure' | 'warning' | 'pending' | 'ref' | 'inlineHeader' | 'codeblock' | 'code';
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
  
  // Sort by index
  matches.sort((a, b) => a.index - b.index);
  
  // Filter overlapping matches
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
      case 'success':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.success}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'failure':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.failure}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'warning':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.warning}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'pending':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.pending}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'ref':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.ref}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'inlineHeader':
        parts.push(
          <span key={keyIndex++} className={TERMINAL_CLASSES.header}>
            {match.fullMatch}
          </span>
        );
        break;
      case 'codeblock':
        parts.push(
          <pre key={keyIndex++} className="my-2 p-3 rounded-lg bg-muted overflow-x-auto">
            <code className="text-xs font-mono text-foreground whitespace-pre">
              {match.content.trim()}
            </code>
          </pre>
        );
        break;
      case 'code':
        parts.push(
          <code
            key={keyIndex++}
            className="px-1.5 py-0.5 rounded bg-muted text-foreground font-mono text-xs"
          >
            {match.content}
          </code>
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
}

export default TerminalFormattedText;
