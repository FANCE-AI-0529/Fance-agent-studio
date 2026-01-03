import { useState } from "react";
import { motion } from "framer-motion";
import { 
  TrendingUp, 
  Heart, 
  Copy, 
  Bot, 
  Play, 
  Loader2,
  Flame,
  Star,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useTrendingAgents, useToggleAgentLike, TrendingAgent } from "@/hooks/useTrendingAgents";
import { useAgentClone } from "@/hooks/useAgentClone";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type SortBy = "usage" | "likes" | "recent" | "rating";

export function TrendingAgents() {
  const [sortBy, setSortBy] = useState<SortBy>("usage");
  const { data: agents, isLoading } = useTrendingAgents(sortBy, 6);
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">热门 Agent 榜</h2>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Flame className="h-3 w-3" />
            实时更新
          </Badge>
        </div>
        
        <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
          <TabsList className="h-8">
            <TabsTrigger value="usage" className="text-xs h-7 px-3">
              最多使用
            </TabsTrigger>
            <TabsTrigger value="likes" className="text-xs h-7 px-3">
              最多点赞
            </TabsTrigger>
            <TabsTrigger value="recent" className="text-xs h-7 px-3">
              最新热门
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : !agents || agents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>暂无热门 Agent</p>
          <p className="text-sm">成为第一个发布 Agent 的创作者吧！</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent, index) => (
            <TrendingAgentCard 
              key={agent.id} 
              agent={agent} 
              rank={index + 1}
              isLoggedIn={!!user}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TrendingAgentCardProps {
  agent: TrendingAgent;
  rank: number;
  isLoggedIn: boolean;
}

function TrendingAgentCard({ agent, rank, isLoggedIn }: TrendingAgentCardProps) {
  const navigate = useNavigate();
  const toggleLike = useToggleAgentLike();
  const cloneAgent = useAgentClone();

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("请先登录后再点赞");
      return;
    }
    toggleLike.mutate(agent.id);
  };

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLoggedIn) {
      toast.error("请先登录后再复刻");
      return;
    }
    cloneAgent.mutate(agent.id);
  };

  const handlePlay = () => {
    navigate(`/runtime?agent=${agent.id}`);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <span className="text-lg">🥇</span>;
    if (rank === 2) return <span className="text-lg">🥈</span>;
    if (rank === 3) return <span className="text-lg">🥉</span>;
    return <span className="text-sm font-mono text-muted-foreground">#{rank}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.05 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
      onClick={handlePlay}
    >
      {/* Rank Badge */}
      <div className="absolute top-3 left-3">
        {getRankBadge(rank)}
      </div>

      {/* Featured Badge */}
      {agent.is_featured && (
        <Badge className="absolute top-3 right-3 bg-primary/10 text-primary text-[10px]">
          <Star className="h-3 w-3 mr-1" />
          精选
        </Badge>
      )}

      {/* Agent Info */}
      <div className="flex items-start gap-3 mt-6">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
            {agent.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate">
            {agent.department || agent.category || "通用助手"}
          </p>
        </div>
      </div>

      {/* Tags */}
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {agent.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-[10px] h-5">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Play className="h-3 w-3" />
          {formatNumber(agent.usage_count)} 次使用
        </span>
        <span className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          {formatNumber(agent.likes_count)}
        </span>
        <span className="flex items-center gap-1">
          <Copy className="h-3 w-3" />
          {formatNumber(agent.clones_count)}
        </span>
      </div>

      {/* Author */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={agent.author_avatar || undefined} />
            <AvatarFallback className="text-xs">
              {agent.author_name?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate max-w-20">
            {agent.author_name || "匿名创作者"}
          </span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleLike}
            disabled={toggleLike.isPending}
          >
            <Heart 
              className={`h-4 w-4 ${agent.is_liked ? "fill-red-500 text-red-500" : ""}`}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleClone}
            disabled={cloneAgent.isPending}
          >
            {cloneAgent.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + "万";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}
