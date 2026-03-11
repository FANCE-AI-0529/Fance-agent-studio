import React from "react";
import { 
  Sparkles, 
  TrendingUp, 
  Star, 
  Users, 
  ArrowRight,
  Bot,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.tsx";
import { Button } from "../ui/button.tsx";
import { Badge } from "../ui/badge.tsx";
import { ScrollArea, ScrollBar } from "../ui/scroll-area.tsx";
import { Skeleton } from "../ui/skeleton.tsx";
import { cn } from "../../lib/utils.ts";
import { motion } from "framer-motion";
import { useAgentRecommendation } from "../../hooks/useAgentRecommendation.ts";
import { useEffect } from "react";

interface AgentRecommendationPanelProps {
  onSelectAgent?: (agentId: string) => void;
  userContext?: string;
  className?: string;
}

// Recommendation card item
function RecommendationCard({ 
  agent, 
  onSelect,
  index 
}: { 
  agent: {
    id: string;
    name: string;
    category: string | null;
    rating: number | null;
    usage_count: number | null;
    matchScore: number;
    reason: string;
    popularInCategory?: boolean;
  };
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card 
        className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group min-w-[200px]"
        onClick={onSelect}
      >
        <CardContent className="p-4 space-y-3">
          {/* Header with icon and score */}
          <div className="flex items-start justify-between">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <Badge variant="secondary" className="text-xs gap-1">
              <Sparkles className="h-3 w-3" />
              {agent.matchScore}%
            </Badge>
          </div>

          {/* Name and category */}
          <div>
            <h4 className="font-medium text-sm group-hover:text-primary transition-colors line-clamp-1">
              {agent.name}
            </h4>
            {agent.category && (
              <span className="text-xs text-muted-foreground">
                {agent.category}
              </span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {agent.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                {agent.rating.toFixed(1)}
              </div>
            )}
            {agent.usage_count && (
              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {agent.usage_count > 1000 
                  ? `${(agent.usage_count / 1000).toFixed(1)}k` 
                  : agent.usage_count}
              </div>
            )}
            {agent.popularInCategory && (
              <Badge variant="outline" className="text-[10px] h-4 px-1">
                <TrendingUp className="h-2 w-2 mr-0.5" />
                热门
              </Badge>
            )}
          </div>

          {/* Reason */}
          <p className="text-xs text-muted-foreground/80 line-clamp-2">
            {agent.reason}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Loading skeleton
function RecommendationSkeleton() {
  return (
    <Card className="min-w-[200px]">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
        </div>
        <Skeleton className="h-6 w-full" />
      </CardContent>
    </Card>
  );
}

export function AgentRecommendationPanel({ 
  onSelectAgent,
  userContext,
  className 
}: AgentRecommendationPanelProps) {
  const { 
    recommendations, 
    isLoading, 
    error, 
    fetchRecommendations,
    getPersonalizedRecommendations 
  } = useAgentRecommendation();

  // Fetch recommendations on mount or when context changes
  useEffect(() => {
    if (userContext) {
      getPersonalizedRecommendations(userContext);
    } else {
      fetchRecommendations();
    }
  }, [userContext, fetchRecommendations, getPersonalizedRecommendations]);

  if (error) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <p className="text-sm">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            为你推荐
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs gap-1"
            onClick={() => fetchRecommendations()}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                刷新
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="w-full">
          <div className="flex gap-3 p-4">
            {isLoading ? (
              <>
                <RecommendationSkeleton />
                <RecommendationSkeleton />
                <RecommendationSkeleton />
              </>
            ) : recommendations.length > 0 ? (
              recommendations.map((agent, index) => (
                <RecommendationCard
                  key={agent.id}
                  agent={agent}
                  index={index}
                  onSelect={() => onSelectAgent?.(agent.id)}
                />
              ))
            ) : (
              <div className="flex items-center justify-center w-full py-8 text-muted-foreground">
                <p className="text-sm">暂无推荐</p>
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AgentRecommendationPanel;
