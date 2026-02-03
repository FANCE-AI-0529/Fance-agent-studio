import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  X,
  MessageSquare,
  Calendar,
  Bot,
  User,
  ArrowUp,
  ArrowDown,
  Filter,
  Loader2,
  HighlighterIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

export interface SearchableMessage {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: Date;
  sessionId?: string;
  agentName?: string;
}

interface SearchResult {
  message: SearchableMessage;
  matchedText: string;
  matchIndex: number;
  context: { before: string; after: string };
}

interface MessageSearchPanelProps {
  messages: SearchableMessage[];
  isOpen: boolean;
  onClose: () => void;
  onSelectMessage: (messageId: string) => void;
  currentSessionId?: string;
}

// Highlight matched text in search results
function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${escapeRegExp(query)})`, "gi"));
  
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-primary/30 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function MessageSearchPanel({
  messages,
  isOpen,
  onClose,
  onSelectMessage,
  currentSessionId,
}: MessageSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [filters, setFilters] = useState({
    includeUser: true,
    includeAssistant: true,
    currentSessionOnly: false,
    dateRange: "all" as "all" | "today" | "week" | "month",
  });

  // Filter and search messages
  const searchResults = useMemo((): SearchResult[] => {
    if (!query.trim()) return [];

    setIsSearching(true);
    
    const filteredMessages = messages.filter((msg) => {
      // Role filter
      if (!filters.includeUser && msg.role === "user") return false;
      if (!filters.includeAssistant && msg.role === "assistant") return false;
      
      // Session filter
      if (filters.currentSessionOnly && msg.sessionId !== currentSessionId) {
        return false;
      }
      
      // Date filter
      const now = new Date();
      const msgDate = new Date(msg.createdAt);
      if (filters.dateRange === "today") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (msgDate < today) return false;
      } else if (filters.dateRange === "week") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (msgDate < weekAgo) return false;
      } else if (filters.dateRange === "month") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (msgDate < monthAgo) return false;
      }

      // Content search
      return msg.content.toLowerCase().includes(query.toLowerCase());
    });

    const results = filteredMessages.map((msg) => {
      const lowerContent = msg.content.toLowerCase();
      const lowerQuery = query.toLowerCase();
      const matchIndex = lowerContent.indexOf(lowerQuery);
      
      // Extract context around match
      const contextStart = Math.max(0, matchIndex - 40);
      const contextEnd = Math.min(msg.content.length, matchIndex + query.length + 40);
      
      return {
        message: msg,
        matchedText: msg.content.slice(matchIndex, matchIndex + query.length),
        matchIndex,
        context: {
          before: (contextStart > 0 ? "..." : "") + 
                  msg.content.slice(contextStart, matchIndex),
          after: msg.content.slice(matchIndex + query.length, contextEnd) +
                 (contextEnd < msg.content.length ? "..." : ""),
        },
      };
    });

    setIsSearching(false);
    setCurrentResultIndex(0);
    
    return results;
  }, [query, messages, filters, currentSessionId]);

  const handlePrevResult = useCallback(() => {
    setCurrentResultIndex((prev) => 
      prev > 0 ? prev - 1 : searchResults.length - 1
    );
  }, [searchResults.length]);

  const handleNextResult = useCallback(() => {
    setCurrentResultIndex((prev) => 
      prev < searchResults.length - 1 ? prev + 1 : 0
    );
  }, [searchResults.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        if (e.ctrlKey || e.metaKey) {
          handleNextResult();
        } else if (searchResults.length > 0) {
          onSelectMessage(searchResults[currentResultIndex].message.id);
        }
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowUp" && e.altKey) {
        handlePrevResult();
      } else if (e.key === "ArrowDown" && e.altKey) {
        handleNextResult();
      }
    },
    [handleNextResult, handlePrevResult, searchResults, currentResultIndex, onSelectMessage, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-lg"
        >
          <div className="p-3 space-y-3">
            {/* Search Input */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="搜索消息内容..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-9 pr-24"
                />
                {query && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : searchResults.length > 0 ? (
                      <span className="text-xs text-muted-foreground">
                        {currentResultIndex + 1}/{searchResults.length}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">无结果</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handlePrevResult}
                      disabled={searchResults.length === 0}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleNextResult}
                      disabled={searchResults.length === 0}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Filter Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-10 w-10">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">筛选条件</div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="filter-user"
                          checked={filters.includeUser}
                          onCheckedChange={(checked) =>
                            setFilters((f) => ({ ...f, includeUser: !!checked }))
                          }
                        />
                        <label htmlFor="filter-user" className="text-sm flex items-center gap-1.5">
                          <User className="h-3 w-3" />
                          用户消息
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="filter-assistant"
                          checked={filters.includeAssistant}
                          onCheckedChange={(checked) =>
                            setFilters((f) => ({ ...f, includeAssistant: !!checked }))
                          }
                        />
                        <label htmlFor="filter-assistant" className="text-sm flex items-center gap-1.5">
                          <Bot className="h-3 w-3" />
                          助手消息
                        </label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="filter-session"
                          checked={filters.currentSessionOnly}
                          onCheckedChange={(checked) =>
                            setFilters((f) => ({ ...f, currentSessionOnly: !!checked }))
                          }
                        />
                        <label htmlFor="filter-session" className="text-sm flex items-center gap-1.5">
                          <MessageSquare className="h-3 w-3" />
                          仅当前对话
                        </label>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs text-muted-foreground">时间范围</label>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { value: "all", label: "全部" },
                          { value: "today", label: "今天" },
                          { value: "week", label: "本周" },
                          { value: "month", label: "本月" },
                        ].map((option) => (
                          <Badge
                            key={option.value}
                            variant={filters.dateRange === option.value ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() =>
                              setFilters((f) => ({
                                ...f,
                                dateRange: option.value as typeof filters.dateRange,
                              }))
                            }
                          >
                            {option.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Search Results */}
            {query && searchResults.length > 0 && (
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={result.message.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        "p-2.5 rounded-lg cursor-pointer transition-colors",
                        "border border-transparent hover:border-border",
                        index === currentResultIndex
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-accent/50"
                      )}
                      onClick={() => {
                        setCurrentResultIndex(index);
                        onSelectMessage(result.message.id);
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <div
                          className={cn(
                            "p-1.5 rounded-full flex-shrink-0",
                            result.message.role === "user"
                              ? "bg-primary/10"
                              : "bg-secondary"
                          )}
                        >
                          {result.message.role === "user" ? (
                            <User className="h-3 w-3" />
                          ) : (
                            <Bot className="h-3 w-3" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                            <span>
                              {result.message.role === "user" ? "用户" : result.message.agentName || "助手"}
                            </span>
                            <span>•</span>
                            <span>
                              {formatDistanceToNow(result.message.createdAt, {
                                addSuffix: true,
                                locale: zhCN,
                              })}
                            </span>
                          </div>
                          
                          <p className="text-sm leading-relaxed">
                            <span className="text-muted-foreground">
                              {result.context.before}
                            </span>
                            <HighlightedText text={result.matchedText} query={query} />
                            <span className="text-muted-foreground">
                              {result.context.after}
                            </span>
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Empty State */}
            {query && !isSearching && searchResults.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">没有找到匹配 "{query}" 的消息</p>
                <p className="text-xs mt-1">尝试调整筛选条件或更换关键词</p>
              </div>
            )}

            {/* Keyboard Hints */}
            <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd> 跳转
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Alt+↑↓</kbd> 上/下一条
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd> 关闭
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
