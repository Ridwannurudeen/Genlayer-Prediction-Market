import { memo, useState } from "react";
import { Link } from "react-router-dom";
import { Calendar, TrendingUp, Users, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  id: string;
  title: string;
  probability: number;
  volume: number;
  endDate: string;
  category: string;
  verified?: boolean;
  hasContract?: boolean;
  validatorCount?: number;
  onQuickVote?: (marketId: string, vote: "yes" | "no") => void;
  isVoting?: boolean;
}

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
  return `$${volume.toFixed(0)}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Ended";
  if (diffDays === 0) return "Ends today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays}d left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w left`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const MarketCard = memo(({
  id,
  title,
  probability,
  volume,
  endDate,
  category,
  verified = false,
  hasContract = false,
  validatorCount = 0,
  onQuickVote,
  isVoting = false,
}: MarketCardProps) => {
  const [hoveredSide, setHoveredSide] = useState<"yes" | "no" | null>(null);
  const [optimisticProb, setOptimisticProb] = useState<number | null>(null);
  
  const displayProbability = optimisticProb ?? probability;
  const yesPrice = displayProbability;
  const noPrice = 100 - displayProbability;

  const handleQuickVote = (vote: "yes" | "no", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Optimistic update animation
    if (vote === "yes") {
      setOptimisticProb(Math.min(99, probability + 2));
    } else {
      setOptimisticProb(Math.max(1, probability - 2));
    }
    
    onQuickVote?.(id, vote);
    
    // Reset after animation
    setTimeout(() => setOptimisticProb(null), 1500);
  };

  return (
    <Link to={`/market/${id}`} className="block group">
      <div className={cn(
        "relative h-full rounded-2xl overflow-hidden transition-all duration-300",
        // Glassmorphism effect
        "bg-neutral-900/70 backdrop-blur-md",
        "border border-neutral-800/60",
        // Hover state
        "hover:border-neutral-600 hover:bg-neutral-900/90",
        "hover:shadow-xl hover:shadow-black/20",
        "hover:-translate-y-1"
      )}>
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="relative p-4 flex flex-col h-full">
          {/* Category & Badges Row */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-neutral-800/80 px-2 py-0.5 rounded-md">
              {category}
            </span>
            {verified && (
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
            {hasContract && (
              <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                On-chain
              </span>
            )}
          </div>

          {/* Title */}
          <h3 className="font-bold text-white text-base leading-snug mb-4 line-clamp-2 group-hover:text-neutral-100 transition-colors flex-grow">
            {title}
          </h3>

          {/* Polymarket-style Probability Bar */}
          <div className="mt-auto">
            <div className="relative h-12 rounded-xl overflow-hidden bg-neutral-800/60 border border-neutral-700/30">
              {/* Probability Fill */}
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600/30 via-emerald-500/20 to-emerald-500/10 transition-all duration-500 ease-out"
                style={{ width: `${displayProbability}%` }}
              />
              
              {/* Yes/No Buttons */}
              <div className="absolute inset-0 flex">
                {/* Yes Side */}
                <button
                  onClick={(e) => handleQuickVote("yes", e)}
                  onMouseEnter={() => setHoveredSide("yes")}
                  onMouseLeave={() => setHoveredSide(null)}
                  disabled={isVoting}
                  className={cn(
                    "flex-1 flex items-center justify-between px-4 transition-all duration-200 rounded-l-xl",
                    "hover:bg-emerald-500/20 active:bg-emerald-500/30",
                    hoveredSide === "yes" && "bg-emerald-500/15"
                  )}
                >
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    hoveredSide === "yes" ? "text-emerald-300" : "text-emerald-400"
                  )}>
                    Yes
                  </span>
                  <span className={cn(
                    "text-xl font-bold tabular-nums transition-all",
                    hoveredSide === "yes" ? "text-emerald-200 scale-110" : "text-emerald-400"
                  )}>
                    {yesPrice}¢
                  </span>
                </button>

                {/* Divider */}
                <div className="w-px bg-neutral-700/60 my-2" />

                {/* No Side */}
                <button
                  onClick={(e) => handleQuickVote("no", e)}
                  onMouseEnter={() => setHoveredSide("no")}
                  onMouseLeave={() => setHoveredSide(null)}
                  disabled={isVoting}
                  className={cn(
                    "flex-1 flex items-center justify-between px-4 transition-all duration-200 rounded-r-xl",
                    "hover:bg-rose-500/20 active:bg-rose-500/30",
                    hoveredSide === "no" && "bg-rose-500/15"
                  )}
                >
                  <span className={cn(
                    "text-xl font-bold tabular-nums transition-all",
                    hoveredSide === "no" ? "text-rose-200 scale-110" : "text-rose-400"
                  )}>
                    {noPrice}¢
                  </span>
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    hoveredSide === "no" ? "text-rose-300" : "text-rose-400"
                  )}>
                    No
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Footer */}
          <div className="flex items-center justify-between mt-3 text-[11px] text-neutral-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 hover:text-neutral-400 transition-colors">
                <TrendingUp className="w-3 h-3" />
                {formatVolume(volume)}
              </span>
              {validatorCount > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {validatorCount}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(endDate)}
            </span>
          </div>
        </div>

        {/* Hover glow effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          "bg-gradient-to-t from-emerald-500/5 via-transparent to-blue-500/5"
        )} />
      </div>
    </Link>
  );
});

MarketCard.displayName = "MarketCard";

export { MarketCard };
export type { MarketCardProps };
