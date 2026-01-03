import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDailyInspiration, useIncrementInspirationView } from "@/hooks/useDailyInspiration";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const categoryColors: Record<string, string> = {
  "效率提升": "bg-primary/10 text-primary",
  "生活助手": "bg-cognitive/10 text-cognitive",
  "学习成长": "bg-governance/10 text-governance",
  "创意灵感": "bg-status-executing/10 text-status-executing",
  general: "bg-muted text-muted-foreground",
};

export function DailyInspiration() {
  const navigate = useNavigate();
  const { data: inspirations, isLoading, refetch } = useDailyInspiration(3);
  const incrementView = useIncrementInspirationView();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-daily-inspiration');
      if (error) throw error;
      toast.success("今日灵感已更新");
      refetch();
    } catch (err) {
      console.error('Failed to generate inspiration:', err);
      toast.error("生成失败，请稍后重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCardClick = (inspirationId: string) => {
    incrementView(inspirationId);
    navigate(`/inspiration/${inspirationId}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">今日灵感</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!inspirations || inspirations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">今日灵感</h2>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Sparkles className="h-3 w-3" />
            每日更新
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={handleGenerateNew}
          disabled={isGenerating}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
          {isGenerating ? '生成中...' : '刷新灵感'}
        </Button>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-3 gap-4">
        {inspirations.map((inspiration, index) => (
          <InspirationCard 
            key={inspiration.id} 
            inspiration={inspiration} 
            index={index}
            onClick={() => handleCardClick(inspiration.id)}
          />
        ))}
      </div>

      {/* Mobile: Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {inspirations.map((inspiration, index) => (
              <CarouselItem key={inspiration.id}>
                <InspirationCard 
                  inspiration={inspiration} 
                  index={index}
                  onClick={() => handleCardClick(inspiration.id)}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>
    </div>
  );
}

interface InspirationCardProps {
  inspiration: {
    id: string;
    title: string;
    description: string | null;
    story_content: string | null;
    category: string;
    view_count: number;
  };
  index: number;
  onClick: () => void;
}

function InspirationCard({ inspiration, index, onClick }: InspirationCardProps) {
  const colorClass = categoryColors[inspiration.category] || categoryColors.general;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
    >
      {/* Category Badge */}
      <Badge className={`${colorClass} mb-3 text-[10px]`}>
        {inspiration.category}
      </Badge>

      {/* Title */}
      <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors line-clamp-2">
        {inspiration.title}
      </h3>

      {/* Description */}
      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {inspiration.description}
      </p>

      {/* Story Quote */}
      {inspiration.story_content && (
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <p className="text-xs text-muted-foreground italic line-clamp-3">
            {inspiration.story_content}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {inspiration.view_count.toLocaleString()} 人看过
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 group-hover:text-primary">
          了解更多
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
        </Button>
      </div>

      {/* Hover Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
