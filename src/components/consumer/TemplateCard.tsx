import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Star, ArrowRight, Loader2 } from "lucide-react";
import { AgentTemplate } from "@/hooks/useAgentTemplates";
import { DynamicIcon } from "@/components/ui/dynamic-icon";
import { cn } from "@/lib/utils";

interface TemplateCardProps {
  template: AgentTemplate;
  onSelect: (template: AgentTemplate) => void;
  isLoading?: boolean;
  variant?: "default" | "compact" | "featured";
}

export function TemplateCard({
  template,
  onSelect,
  isLoading,
  variant = "default",
}: TemplateCardProps) {
  const formatUsageCount = (count: number) => {
    if (count >= 10000) return `${(count / 10000).toFixed(1)}万`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
    return count.toString();
  };

  if (variant === "compact") {
    return (
      <motion.button
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onSelect(template)}
        disabled={isLoading}
        className={cn(
          "group relative flex items-center gap-3 p-3 rounded-xl",
          "bg-gradient-to-r",
          template.bg_gradient || "from-primary/10 to-primary/5",
          "border border-border/50 hover:border-primary/30",
          "backdrop-blur-sm transition-all duration-200",
          "text-left w-full"
        )}
      >
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
            "bg-background/80"
          )}
        >
          <DynamicIcon
            name={template.icon_id}
            className="h-5 w-5 text-primary"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{template.name}</h4>
          <p className="text-xs text-muted-foreground truncate">
            {template.description}
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </motion.button>
    );
  }

  if (variant === "featured") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          className={cn(
            "group cursor-pointer overflow-hidden",
            "border-border/50 hover:border-primary/40",
            "bg-gradient-to-br",
            template.bg_gradient || "from-card to-card",
            "transition-all duration-300"
          )}
          onClick={() => onSelect(template)}
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center",
                  "bg-primary/10 group-hover:bg-primary/20 transition-colors"
                )}
              >
                <DynamicIcon
                  name={template.icon_id}
                  className="h-7 w-7 text-primary"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">
                    {template.name}
                  </h3>
                  {template.is_featured && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      热门
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {template.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {formatUsageCount(template.usage_count)} 人使用
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {template.rating.toFixed(1)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        立即使用
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "group cursor-pointer h-full",
          "border-border/50 hover:border-primary/30",
          "bg-card/50 hover:bg-card",
          "transition-all duration-200"
        )}
        onClick={() => onSelect(template)}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                "bg-gradient-to-br",
                template.bg_gradient || "from-primary/20 to-primary/10"
              )}
            >
              <DynamicIcon
                name={template.icon_id}
                className="h-5 w-5 text-primary"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm truncate">{template.name}</h4>
              <p className="text-xs text-muted-foreground">
                {template.category}
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {template.description}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3 w-3" />
              {formatUsageCount(template.usage_count)}
            </span>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2.5 text-xs"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                "使用"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
