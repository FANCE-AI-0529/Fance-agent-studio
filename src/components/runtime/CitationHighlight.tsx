import React, { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils.ts";
import { FileText, X, ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea } from "../ui/scroll-area.tsx";
import { toast } from "../../hooks/use-toast.ts";

/**
 * Citation Highlight System
 * 引用高亮系统 - 点击引用来源时高亮对应知识片段
 */

// ========== Types ==========

export interface CitationSource {
  id: string;
  chunkId: string;
  content: string;
  documentName: string;
  pageNumber?: number;
  similarity: number;
  highlightRanges?: { start: number; end: number }[];
}

interface CitationHighlightContextType {
  activeCitation: CitationSource | null;
  setActiveCitation: (citation: CitationSource | null) => void;
  highlightedChunkId: string | null;
  setHighlightedChunkId: (id: string | null) => void;
}

// ========== Context ==========

const CitationHighlightContext = createContext<CitationHighlightContextType>({
  activeCitation: null,
  setActiveCitation: () => {},
  highlightedChunkId: null,
  setHighlightedChunkId: () => {},
});

export function CitationHighlightProvider({ children }: { children: React.ReactNode }) {
  const [activeCitation, setActiveCitation] = useState<CitationSource | null>(null);
  const [highlightedChunkId, setHighlightedChunkId] = useState<string | null>(null);

  return (
    <CitationHighlightContext.Provider 
      value={{ 
        activeCitation, 
        setActiveCitation, 
        highlightedChunkId, 
        setHighlightedChunkId 
      }}
    >
      {children}
    </CitationHighlightContext.Provider>
  );
}

export function useCitationHighlight() {
  return useContext(CitationHighlightContext);
}

// ========== Clickable Citation Marker ==========

interface CitationMarkerProps {
  citation: CitationSource;
  index: number;
  className?: string;
}

export function CitationMarker({ citation, index, className }: CitationMarkerProps) {
  const { setActiveCitation, highlightedChunkId } = useCitationHighlight();
  const isHighlighted = highlightedChunkId === citation.chunkId;

  const handleClick = useCallback(() => {
    setActiveCitation(citation);
  }, [citation, setActiveCitation]);

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center",
        "w-5 h-5 rounded-full text-[10px] font-medium",
        "bg-primary/20 text-primary border border-primary/30",
        "hover:bg-primary/30 hover:scale-110",
        "transition-all duration-200 cursor-pointer",
        isHighlighted && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        className
      )}
      title={`查看引用: ${citation.documentName}`}
    >
      {index + 1}
    </button>
  );
}

// ========== Citation Detail Panel ==========

interface CitationDetailPanelProps {
  className?: string;
}

export function CitationDetailPanel({ className }: CitationDetailPanelProps) {
  const { activeCitation, setActiveCitation, setHighlightedChunkId } = useCitationHighlight();
  const [copied, setCopied] = useState(false);

  const handleClose = useCallback(() => {
    setActiveCitation(null);
    setHighlightedChunkId(null);
  }, [setActiveCitation, setHighlightedChunkId]);

  const handleCopy = useCallback(async () => {
    if (!activeCitation) return;
    
    await navigator.clipboard.writeText(activeCitation.content);
    setCopied(true);
    toast({
      title: "已复制",
      description: "引用内容已复制到剪贴板",
    });
    
    setTimeout(() => setCopied(false), 2000);
  }, [activeCitation]);

  // Highlight effect when panel opens
  React.useEffect(() => {
    if (activeCitation) {
      setHighlightedChunkId(activeCitation.chunkId);
    }
  }, [activeCitation, setHighlightedChunkId]);

  return (
    <AnimatePresence>
      {activeCitation && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className={cn(
            "fixed bottom-20 right-4 z-50",
            "w-96 max-h-[60vh]",
            "bg-card/95 backdrop-blur-xl",
            "border border-border/50 rounded-2xl",
            "shadow-2xl shadow-black/20",
            "flex flex-col overflow-hidden",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium truncate max-w-48">
                {activeCitation.documentName}
              </span>
              {activeCitation.pageNumber && (
                <Badge variant="outline" className="text-[10px] h-5">
                  P.{activeCitation.pageNumber}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="flex-1 max-h-80">
            <div className="p-4">
              <HighlightedContent 
                content={activeCitation.content}
                highlightRanges={activeCitation.highlightRanges}
              />
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-border/50 bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge 
                variant="secondary" 
                className={cn(
                  "text-[10px]",
                  activeCitation.similarity >= 0.9 && "bg-green-500/20 text-green-400",
                  activeCitation.similarity >= 0.7 && activeCitation.similarity < 0.9 && "bg-primary/20 text-primary",
                  activeCitation.similarity < 0.7 && "bg-muted text-muted-foreground"
                )}
              >
                相似度 {(activeCitation.similarity * 100).toFixed(1)}%
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                ID: {activeCitation.chunkId.slice(0, 8)}...
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              查看文档
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ========== Highlighted Content Renderer ==========

interface HighlightedContentProps {
  content: string;
  highlightRanges?: { start: number; end: number }[];
  className?: string;
}

export function HighlightedContent({ 
  content, 
  highlightRanges = [],
  className 
}: HighlightedContentProps) {
  // If no highlight ranges, show full content with keyword highlighting
  if (highlightRanges.length === 0) {
    return (
      <div className={cn(
        "text-sm text-foreground leading-relaxed",
        className
      )}>
        {content}
      </div>
    );
  }

  // Sort ranges by start position
  const sortedRanges = [...highlightRanges].sort((a, b) => a.start - b.start);
  
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;

  sortedRanges.forEach((range, index) => {
    // Add text before highlight
    if (range.start > lastEnd) {
      parts.push(
        <span key={`text-${index}`} className="text-muted-foreground">
          {content.slice(lastEnd, range.start)}
        </span>
      );
    }

    // Add highlighted text
    parts.push(
      <motion.mark
        key={`highlight-${index}`}
        initial={{ backgroundColor: 'hsl(var(--primary) / 0.4)' }}
        animate={{ backgroundColor: 'hsl(var(--primary) / 0.2)' }}
        transition={{ duration: 1, repeat: Infinity, repeatType: 'reverse' }}
        className="bg-primary/20 text-foreground px-0.5 rounded"
      >
        {content.slice(range.start, range.end)}
      </motion.mark>
    );

    lastEnd = range.end;
  });

  // Add remaining text
  if (lastEnd < content.length) {
    parts.push(
      <span key="text-end" className="text-muted-foreground">
        {content.slice(lastEnd)}
      </span>
    );
  }

  return (
    <div className={cn(
      "text-sm leading-relaxed",
      className
    )}>
      {parts}
    </div>
  );
}

// ========== Inline Citation Reference ==========

interface InlineCitationProps {
  refId: string;
  source: string;
  children: React.ReactNode;
  className?: string;
}

export function InlineCitation({ refId, source, children, className }: InlineCitationProps) {
  const { setHighlightedChunkId, highlightedChunkId } = useCitationHighlight();
  const isHighlighted = highlightedChunkId === refId;

  return (
    <span
      className={cn(
        "relative inline cursor-pointer",
        "border-b border-dashed border-primary/40",
        "hover:border-primary hover:bg-primary/10",
        "transition-all duration-200",
        isHighlighted && "bg-primary/20 border-primary",
        className
      )}
      onClick={() => setHighlightedChunkId(isHighlighted ? null : refId)}
      title={`来源: ${source}`}
    >
      {children}
      <sup className="text-[9px] text-primary ml-0.5">[{refId.slice(-4)}]</sup>
    </span>
  );
}

export default {
  Provider: CitationHighlightProvider,
  Panel: CitationDetailPanel,
  Marker: CitationMarker,
  Inline: InlineCitation,
  Content: HighlightedContent,
  useHighlight: useCitationHighlight,
};
