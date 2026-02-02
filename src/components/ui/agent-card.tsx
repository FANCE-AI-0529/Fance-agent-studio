import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Unified AgentCard component for consistent styling across Studio and Consumer views
 * Design tokens: Uses semantic colors from index.css
 */
const agentCardVariants = cva(
  "bg-card border transition-all duration-200",
  {
    variants: {
      variant: {
        default: "rounded-xl border-border shadow-sm hover:shadow-md",
        glass: "rounded-xl border-border/50 backdrop-blur-lg shadow-lg bg-card/80",
        compact: "rounded-lg border-border shadow-sm",
        elevated: "rounded-xl border-border shadow-md hover:shadow-lg",
      },
      interactive: {
        true: "cursor-pointer hover:border-primary/50 active:scale-[0.99]",
        false: "",
      },
      padding: {
        none: "",
        sm: "p-3",
        md: "p-4",
        lg: "p-5",
      },
    },
    defaultVariants: {
      variant: "default",
      interactive: false,
      padding: "md",
    },
  }
);

export interface AgentCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof agentCardVariants> {}

const AgentCard = React.forwardRef<HTMLDivElement, AgentCardProps>(
  ({ className, variant, interactive, padding, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(agentCardVariants({ variant, interactive, padding }), className)}
        {...props}
      />
    );
  }
);
AgentCard.displayName = "AgentCard";

const AgentCardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center gap-3 mb-3", className)}
    {...props}
  />
));
AgentCardHeader.displayName = "AgentCardHeader";

const AgentCardAvatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
      className
    )}
    {...props}
  />
));
AgentCardAvatar.displayName = "AgentCardAvatar";

const AgentCardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 min-w-0", className)}
    {...props}
  />
));
AgentCardContent.displayName = "AgentCardContent";

const AgentCardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "font-medium text-foreground truncate group-hover:text-primary transition-colors",
      className
    )}
    {...props}
  />
));
AgentCardTitle.displayName = "AgentCardTitle";

const AgentCardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground truncate", className)}
    {...props}
  />
));
AgentCardDescription.displayName = "AgentCardDescription";

const AgentCardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-between mt-3 pt-3 border-t border-border", className)}
    {...props}
  />
));
AgentCardFooter.displayName = "AgentCardFooter";

export {
  AgentCard,
  AgentCardHeader,
  AgentCardAvatar,
  AgentCardContent,
  AgentCardTitle,
  AgentCardDescription,
  AgentCardFooter,
  agentCardVariants,
};
