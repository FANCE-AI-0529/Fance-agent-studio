import { useState } from "react";
import { FileText, ChevronDown, ChevronUp, ExternalLink, Network } from "lucide-react";
import { Badge } from "../ui/badge.tsx";
import { Button } from "../ui/button.tsx";
import { cn } from "../../lib/utils.ts";
import { motion, AnimatePresence } from "framer-motion";
import { CitationDetailDialog } from "./CitationDetailDialog.tsx";

export interface Citation {
  id: string;
  chunkId: string;
  content: string;
  similarity: number;
  documentId: string;
  documentName: string;
  pageNumber?: number;
  knowledgeBaseName: string;
  relatedNodes?: {
    id: string;
    name: string;
    type: string;
  }[];
}

interface CitationCardProps {
  citations: Citation[];
  className?: string;
}

export function CitationCard({ citations, className }: CitationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  if (citations.length === 0) return null;

  const displayedCitations = isExpanded ? citations : citations.slice(0, 2);

  return (
    <div className={cn("mt-2", className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <FileText className="h-3.5 w-3.5" />
        <span className="font-medium">知识来源</span>
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
          {citations.length} 条引用
        </Badge>
        <div className="flex-1" />
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {/* Citations List */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2">
              {displayedCitations.map((citation, index) => (
                <motion.div
                  key={citation.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group rounded-lg border border-border bg-card/50 p-3 cursor-pointer hover:bg-card/80 transition-colors"
                  onClick={() => setSelectedCitation(citation)}
                >
                  {/* Document Info */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium truncate flex-1">
                      {citation.documentName}
                    </span>
                    {citation.pageNumber && (
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                        第 {citation.pageNumber} 页
                      </Badge>
                    )}
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "h-4 px-1.5 text-[10px]",
                        citation.similarity >= 0.9 && "bg-status-executing/20 text-status-executing",
                        citation.similarity >= 0.7 && citation.similarity < 0.9 && "bg-primary/20 text-primary",
                        citation.similarity < 0.7 && "bg-muted text-muted-foreground"
                      )}
                    >
                      {(citation.similarity * 100).toFixed(1)}%
                    </Badge>
                  </div>

                  {/* Content Preview */}
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    "{citation.content}"
                  </p>

                  {/* Related Entities */}
                  {citation.relatedNodes && citation.relatedNodes.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Network className="h-3 w-3 text-cognitive" />
                      {citation.relatedNodes.slice(0, 3).map((node) => (
                        <Badge
                          key={node.id}
                          variant="outline"
                          className="h-4 px-1.5 text-[9px] border-cognitive/30 text-cognitive"
                        >
                          {node.name}
                        </Badge>
                      ))}
                      {citation.relatedNodes.length > 3 && (
                        <span className="text-[9px] text-muted-foreground">
                          +{citation.relatedNodes.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Expand hint */}
                  <div className="flex items-center justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[9px] text-muted-foreground flex items-center gap-1">
                      点击查看详情
                      <ExternalLink className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Dialog */}
      <CitationDetailDialog
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
