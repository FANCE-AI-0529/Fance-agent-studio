import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface EnhancedTypewriterProps {
  /** The text to display with typewriter effect */
  text: string;
  /** Characters per second (default: 50) */
  speed?: number;
  /** Delay before starting in ms */
  delay?: number;
  /** Class name for the container */
  className?: string;
  /** Called when typing completes */
  onComplete?: () => void;
  /** Whether to show cursor */
  showCursor?: boolean;
  /** Cursor blink speed in ms */
  cursorBlinkSpeed?: number;
  /** Enable smooth streaming mode (for AI responses) */
  streamingMode?: boolean;
}

/**
 * P1-02: EnhancedTypewriter - 增强打字机效果
 * - 更平滑的流式输出
 * - 支持代码块识别
 * - 自适应速度（代码块加速）
 */
export function EnhancedTypewriter({
  text,
  speed = 50,
  delay = 0,
  className,
  onComplete,
  showCursor = true,
  cursorBlinkSpeed = 530,
  streamingMode = false,
}: EnhancedTypewriterProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const previousTextRef = useRef("");
  const indexRef = useRef(0);
  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  // Detect if we're inside a code block
  const isInCodeBlock = useCallback((text: string, position: number) => {
    const textUpToPosition = text.slice(0, position);
    const codeBlockMatches = textUpToPosition.match(/```/g);
    return codeBlockMatches ? codeBlockMatches.length % 2 === 1 : false;
  }, []);

  // Get adaptive speed based on content type
  const getAdaptiveSpeed = useCallback(
    (char: string, position: number) => {
      const baseInterval = 1000 / speed;

      // Speed up for code blocks
      if (isInCodeBlock(text, position)) {
        return baseInterval * 0.3; // 3x faster in code blocks
      }

      // Slight pause after punctuation
      if (['.', '!', '?', '。', '！', '？'].includes(char)) {
        return baseInterval * 2;
      }

      // Slight pause after commas
      if ([',', '，', ';', '；'].includes(char)) {
        return baseInterval * 1.5;
      }

      return baseInterval;
    },
    [speed, text, isInCodeBlock]
  );

  // Animation loop using requestAnimationFrame for smoother rendering
  const animate = useCallback(
    (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const elapsed = time - lastTimeRef.current;

      if (indexRef.current < text.length) {
        const currentChar = text[indexRef.current];
        const interval = getAdaptiveSpeed(currentChar, indexRef.current);

        if (elapsed >= interval) {
          // Handle multi-byte characters (Chinese, emoji, etc.)
          const charToAdd = text.slice(indexRef.current, indexRef.current + 1);
          setDisplayedText((prev) => prev + charToAdd);
          indexRef.current += 1;
          lastTimeRef.current = time;
        }

        requestRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
        onComplete?.();
      }
    },
    [text, getAdaptiveSpeed, onComplete]
  );

  // Handle streaming mode - when text updates, append new content
  useEffect(() => {
    if (streamingMode && text !== previousTextRef.current) {
      // Text has been updated (streaming)
      if (text.startsWith(previousTextRef.current)) {
        // New text is appended, just update displayed
        setDisplayedText(text);
        indexRef.current = text.length;
      } else {
        // Text completely changed, reset
        indexRef.current = 0;
        setDisplayedText("");
        setIsComplete(false);
      }
      previousTextRef.current = text;
      return;
    }

    // Non-streaming mode - standard typewriter
    if (!streamingMode && text !== previousTextRef.current) {
      // Reset on text change
      indexRef.current = 0;
      setDisplayedText("");
      setIsComplete(false);
      setIsStarted(false);
      previousTextRef.current = text;

      // Start with delay
      const startTimer = setTimeout(() => {
        setIsStarted(true);
        lastTimeRef.current = 0;
        requestRef.current = requestAnimationFrame(animate);
      }, delay);

      return () => {
        clearTimeout(startTimer);
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
        }
      };
    }
  }, [text, delay, animate, streamingMode]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  return (
    <span className={cn("relative", className)}>
      {displayedText}
      {showCursor && !isComplete && (
        <motion.span
          className="inline-block w-0.5 h-[1.1em] ml-0.5 bg-current align-text-bottom"
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: cursorBlinkSpeed / 1000,
            repeat: Infinity,
            repeatType: "reverse",
          }}
        />
      )}
    </span>
  );
}

/**
 * Code block aware typewriter
 * Renders code blocks immediately, types regular text
 */
interface CodeAwareTypewriterProps extends Omit<EnhancedTypewriterProps, 'text'> {
  content: string;
  /** Render function for code blocks */
  renderCodeBlock?: (code: string, language: string) => React.ReactNode;
}

export function CodeAwareTypewriter({
  content,
  speed = 50,
  className,
  onComplete,
  renderCodeBlock,
  ...props
}: CodeAwareTypewriterProps) {
  const [completedBlocks, setCompletedBlocks] = useState(0);

  // Parse content into segments
  const segments = useMemo(() => {
    const result: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Text before code block
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }
      // Code block
      result.push({
        type: 'code',
        content: match[2],
        language: match[1] || 'plaintext',
      });
      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < content.length) {
      result.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content]);

  const handleSegmentComplete = useCallback(() => {
    setCompletedBlocks((prev) => {
      const next = prev + 1;
      if (next >= segments.filter((s) => s.type === 'text').length) {
        onComplete?.();
      }
      return next;
    });
  }, [segments, onComplete]);

  return (
    <div className={cn("space-y-2", className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'code') {
          // Render code block immediately
          return renderCodeBlock ? (
            <div key={index}>{renderCodeBlock(segment.content, segment.language!)}</div>
          ) : (
            <pre
              key={index}
              className="p-3 rounded-lg bg-muted overflow-x-auto"
            >
              <code className="text-sm font-mono">{segment.content}</code>
            </pre>
          );
        }

        // Typewriter for text segments
        return (
          <EnhancedTypewriter
            key={index}
            text={segment.content}
            speed={speed}
            onComplete={handleSegmentComplete}
            {...props}
          />
        );
      })}
    </div>
  );
}

export default EnhancedTypewriter;
