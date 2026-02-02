import React from "react";
import { X, Reply, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface QuotedMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface MessageQuoteReplyProps {
  quotedMessage: QuotedMessage | null;
  onClear: () => void;
  className?: string;
}

interface QuotePreviewProps {
  message: QuotedMessage;
  onClear: () => void;
  className?: string;
}

// Quote preview shown above input
export function QuotePreview({ message, onClear, className }: QuotePreviewProps) {
  const truncatedContent = message.content.length > 100 
    ? message.content.substring(0, 100) + "..." 
    : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: 10, height: 0 }}
      className={cn(
        "flex items-start gap-2 px-3 py-2 bg-muted/50 border-l-2 border-primary rounded-r-lg",
        className
      )}
    >
      <Reply className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-xs font-medium text-primary">
          {message.role === "user" ? "回复你的消息" : "回复 AI 的消息"}
        </span>
        <p className="text-xs text-muted-foreground truncate">
          {truncatedContent}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
      </Button>
    </motion.div>
  );
}

// Quote display in message bubble
interface InlineQuoteProps {
  quotedContent: string;
  quotedRole: "user" | "assistant";
  className?: string;
}

export function InlineQuote({ quotedContent, quotedRole, className }: InlineQuoteProps) {
  const truncatedContent = quotedContent.length > 80 
    ? quotedContent.substring(0, 80) + "..." 
    : quotedContent;

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 mb-2 bg-muted/30 border-l-2 rounded-r-md",
        quotedRole === "user" ? "border-primary/50" : "border-muted-foreground/50",
        className
      )}
    >
      <Quote className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          {quotedRole === "user" ? "你" : "AI"}
        </span>
        <p className="text-xs text-muted-foreground/80 line-clamp-2">
          {truncatedContent}
        </p>
      </div>
    </div>
  );
}

// Hook for managing quote state
interface UseMessageQuoteReturn {
  quotedMessage: QuotedMessage | null;
  setQuotedMessage: (message: QuotedMessage | null) => void;
  clearQuote: () => void;
  quoteMessage: (message: QuotedMessage) => void;
}

export function useMessageQuote(): UseMessageQuoteReturn {
  const [quotedMessage, setQuotedMessage] = React.useState<QuotedMessage | null>(null);

  const clearQuote = React.useCallback(() => {
    setQuotedMessage(null);
  }, []);

  const quoteMessage = React.useCallback((message: QuotedMessage) => {
    setQuotedMessage(message);
  }, []);

  return {
    quotedMessage,
    setQuotedMessage,
    clearQuote,
    quoteMessage,
  };
}

// Quote button to add to message actions
interface QuoteButtonProps {
  message: QuotedMessage;
  onQuote: (message: QuotedMessage) => void;
  className?: string;
}

export function QuoteButton({ message, onQuote, className }: QuoteButtonProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 text-muted-foreground hover:text-foreground", className)}
      onClick={() => onQuote(message)}
      title="引用回复"
    >
      <Reply className="h-3 w-3" />
    </Button>
  );
}

// Main export for quote reply input area
export function MessageQuoteReply({ quotedMessage, onClear, className }: MessageQuoteReplyProps) {
  return (
    <AnimatePresence>
      {quotedMessage && (
        <QuotePreview
          message={quotedMessage}
          onClear={onClear}
          className={className}
        />
      )}
    </AnimatePresence>
  );
}

export default MessageQuoteReply;
