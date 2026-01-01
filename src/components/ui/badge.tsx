import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm",
        outline: 
          "text-foreground border-border",
        success:
          "border-transparent bg-status-executing/15 text-status-executing border border-status-executing/30",
        warning:
          "border-transparent bg-status-planning/15 text-status-planning border border-status-planning/30",
        info:
          "border-transparent bg-primary/15 text-primary border border-primary/30",
        cognitive:
          "border-transparent bg-cognitive/15 text-cognitive border border-cognitive/30",
        governance:
          "border-transparent bg-governance/15 text-governance border border-governance/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
