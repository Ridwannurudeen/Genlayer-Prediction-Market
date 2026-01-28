import { cn } from "@/lib/utils";

interface ProbabilityBarProps {
  probability: number;
  className?: string;
}

export const ProbabilityBar = ({ probability, className }: ProbabilityBarProps) => {
  const getColor = () => {
    if (probability >= 70) return "bg-success";
    if (probability >= 40) return "bg-primary";
    return "bg-warning";
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColor())}
          style={{ width: `${probability}%` }}
        />
      </div>
      <span className="text-sm font-mono font-semibold text-foreground min-w-[3rem] text-right">
        {probability}%
      </span>
    </div>
  );
};
