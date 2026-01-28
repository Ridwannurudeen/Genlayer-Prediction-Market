import { cn } from "@/lib/utils";

interface GenLayerLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export const GenLayerLogo = ({ className, size = "md", showText = true }: GenLayerLogoProps) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "bg-foreground rounded flex items-center justify-center",
          sizeClasses[size]
        )}
      >
        <span
          className={cn(
            "text-background font-bold",
            size === "sm" ? "text-[10px]" : size === "md" ? "text-xs" : "text-sm"
          )}
        >
          GL
        </span>
      </div>
      {showText && (
        <span className={cn("font-semibold", textSizeClasses[size])}>
          GenLayer <span className="text-muted-foreground font-normal">Markets</span>
        </span>
      )}
    </div>
  );
};
