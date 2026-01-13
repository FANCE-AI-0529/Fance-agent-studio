import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentTemplate } from "@/hooks/useAgentTemplates";
import { TemplateCard } from "./TemplateCard";
import { cn } from "@/lib/utils";

interface TemplateGridProps {
  templates: AgentTemplate[];
  onSelect: (template: AgentTemplate) => void;
  isLoading?: boolean;
  loadingTemplateId?: string;
  variant?: "default" | "compact" | "featured";
  columns?: 2 | 3 | 4;
  className?: string;
}

export function TemplateGrid({
  templates,
  onSelect,
  isLoading,
  loadingTemplateId,
  variant = "default",
  columns = 4,
  className,
}: TemplateGridProps) {
  if (isLoading) {
    return <TemplateGridSkeleton columns={columns} variant={variant} />;
  }

  if (!templates?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        暂无可用模板
      </div>
    );
  }

  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("grid gap-4", gridCols[columns], className)}
    >
      {templates.map((template, index) => (
        <motion.div
          key={template.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
        >
          <TemplateCard
            template={template}
            onSelect={onSelect}
            isLoading={loadingTemplateId === template.id}
            variant={variant}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}

function TemplateGridSkeleton({
  columns,
  variant,
}: {
  columns: number;
  variant: string;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  const count = variant === "featured" ? 4 : 8;

  return (
    <div className={cn("grid gap-4", gridCols[columns as keyof typeof gridCols])}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 rounded-lg border border-border/50">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-8 w-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-14 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// Export section component for home page
interface TemplateSectionProps {
  title: string;
  description?: string;
  templates: AgentTemplate[];
  onSelect: (template: AgentTemplate) => void;
  isLoading?: boolean;
  loadingTemplateId?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function TemplateSection({
  title,
  description,
  templates,
  onSelect,
  isLoading,
  loadingTemplateId,
  showViewAll,
  onViewAll,
}: TemplateSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary hover:underline"
          >
            查看全部
          </button>
        )}
      </div>
      <TemplateGrid
        templates={templates}
        onSelect={onSelect}
        isLoading={isLoading}
        loadingTemplateId={loadingTemplateId}
        variant="featured"
        columns={2}
      />
    </section>
  );
}
