import { cn } from "@/lib/utils";

interface FanceLogoIconProps {
  size?: number;
  className?: string;
}

export const FanceLogoIcon = ({ size = 32, className }: FanceLogoIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn("flex-shrink-0", className)}
  >
    <rect x="2" y="2" width="44" height="44" rx="10" fill="hsl(var(--primary))" />
    <path
      d="M14 12H34V18H20V22H30V28H20V36H14V12Z"
      fill="white"
    />
  </svg>
);

interface FanceLogoFullProps {
  iconSize?: number;
  showVersion?: boolean;
  className?: string;
}

export const FanceLogoFull = ({ 
  iconSize = 40, 
  showVersion = false,
  className 
}: FanceLogoFullProps) => (
  <div className={cn("flex items-center gap-3", className)}>
    <FanceLogoIcon size={iconSize} />
    <div className="flex flex-col">
      <span className="font-bold text-lg tracking-tight text-foreground">
        FANCE<span className="text-primary">.AI</span>
      </span>
      {showVersion && (
        <span className="text-[10px] text-muted-foreground">v1.0</span>
      )}
    </div>
  </div>
);

// Large version for auth page
export const FanceLogoLarge = ({ className }: { className?: string }) => (
  <div className={cn("flex flex-col items-center gap-4", className)}>
    <FanceLogoIcon size={64} />
    <span className="font-bold text-3xl tracking-tight text-foreground">
      FANCE<span className="text-primary">.AI</span>
    </span>
  </div>
);
