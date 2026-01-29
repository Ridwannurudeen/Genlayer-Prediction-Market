import { useNavigate } from "react-router-dom";
import { Market } from "@/types/market";
import { Bookmark, TrendingUp, TrendingDown, Zap, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MarketCardProps {
  market: Market;
  previousProbability?: number;
}

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(0)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
  return `$${volume}`;
};

const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Crypto":
      return "₿";
    case "Politics":
      return "🏛️";
    case "Tech":
      return "🚀";
    case "Finance":
      return "📈";
    case "World":
      return "🌍";
    case "Sports":
      return "⚽";
    case "Culture":
      return "🎭";
    default:
      return "📊";
  }
};

// AI Confidence Indicator Dot
const ConfidenceDot = ({ confidence }: { confidence: number }) => {
  const isHighConfidence = confidence >= 70;
  const isMediumConfidence = confidence >= 40 && confidence < 70;
  
  return (
    <div className="absolute top-3 right-3 z-10">
      <div className="relative group">
        {/* Glow effect */}
        <div 
          className={cn(
            "absolute inset-0 rounded-full blur-md transition-opacity",
            isHighConfidence && "bg-emerald-500 opacity-50",
            isMediumConfidence && "bg-purple-500 opacity-50 animate-pulse",
            !isHighConfidence && !isMediumConfidence && "bg-amber-500 opacity-30 animate-pulse"
          )}
        />
        
        {/* Main dot */}
        <div 
          className={cn(
            "relative w-2.5 h-2.5 rounded-full border",
            isHighConfidence && "bg-emerald-500 border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]",
            isMediumConfidence && "bg-purple-500 border-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]",
            !isHighConfidence && !isMediumConfidence && "bg-amber-500 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
          )}
        />
        
        {/* Tooltip */}
        <div className="absolute -top-8 right-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="px-2 py-1 rounded bg-slate-800 border border-white/10 text-[9px] text-white/70 font-mono whitespace-nowrap">
            AI: {confidence}%
          </div>
        </div>
      </div>
    </div>
  );
};

export const MarketCard = ({ market, previousProbability }: MarketCardProps) => {
  const navigate = useNavigate();
  const [isFlashing, setIsFlashing] = useState(false);
  const [flashDirection, setFlashDirection] = useState<"up" | "down" | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Detect price changes and trigger flash animation
  useEffect(() => {
    if (previousProbability !== undefined && previousProbability !== market.probability) {
      setFlashDirection(market.probability > previousProbability ? "up" : "down");
      setIsFlashing(true);
      
      const timeout = setTimeout(() => {
        setIsFlashing(false);
        setFlashDirection(null);
      }, 600);

      return () => clearTimeout(timeout);
    }
  }, [market.probability, previousProbability]);

  const change = previousProbability !== undefined 
    ? market.probability - previousProbability 
    : 0;

  // Derive confidence from market data (using aiInsight if available)
  const confidence = market.aiInsight?.confidenceScore || 50;

  return (
    <div
      onClick={() => navigate(`/market/${market.id}`)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        // Base styles
        "relative group cursor-pointer overflow-hidden",
        // Glass card effect
        "bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50",
        "backdrop-blur-xl rounded-xl",
        "border border-white/10",
        // Hover lift effect (CSS-only, Framer Motion alternative)
        "transition-all duration-300 ease-out",
        isHovered && "transform -translate-y-1 scale-[1.02]",
        isHovered && "shadow-[0_20px_40px_rgba(0,0,0,0.3),0_0_30px_rgba(168,85,247,0.1)]",
        isHovered && "border-purple-500/30",
        // Flash states
        isFlashing && flashDirection === "up" && "ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]",
        isFlashing && flashDirection === "down" && "ring-2 ring-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
      )}
    >
      {/* Background gradient on hover */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 opacity-0 transition-opacity duration-300",
        isHovered && "opacity-100"
      )} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* AI Confidence Dot */}
      <ConfidenceDot confidence={confidence} />

      <div className="relative p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0 transition-all duration-300",
            "bg-white/5 border border-white/10",
            isHovered && "bg-purple-500/20 border-purple-500/30"
          )}>
            {getCategoryIcon(market.category)}
          </div>
          <div className="flex-1 min-w-0 pr-4">
            {/* Title with text shadow for pop effect */}
            <h3 className={cn(
              "font-semibold text-sm leading-snug line-clamp-2 text-white/90 transition-all duration-300",
              isHovered && "text-white",
              // Text shadow for depth
              "[text-shadow:0_1px_2px_rgba(0,0,0,0.3)]"
            )}>
              {market.title}
            </h3>
          </div>
        </div>

        {/* Probability Display */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <span className="text-[9px] text-white/40 font-mono uppercase tracking-widest">PROBABILITY</span>
            <div className={cn(
              "text-3xl font-bold transition-all duration-300 tracking-tight",
              isFlashing && flashDirection === "up" && "text-emerald-400",
              isFlashing && flashDirection === "down" && "text-red-400",
              !isFlashing && "text-white"
            )}>
              {market.probability}%
            </div>
          </div>
          
          {/* Change indicator */}
          {change !== 0 && (
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
              change > 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            )}>
              {change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {change > 0 ? "+" : ""}{change.toFixed(0)}%
            </div>
          )}
        </div>

        {/* Yes/No Buttons with depth effect */}
        <div className="flex gap-2 mb-4">
          <button 
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              "hover:bg-emerald-500 hover:text-white hover:border-emerald-400",
              "hover:shadow-[0_4px_0_0_#065f46,0_6px_15px_rgba(16,185,129,0.3)]",
              "active:shadow-[0_2px_0_0_#065f46] active:translate-y-[2px]"
            )}
          >
            Yes
          </button>
          <button 
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200",
              "bg-red-500/20 text-red-400 border border-red-500/30",
              "hover:bg-red-500 hover:text-white hover:border-red-400",
              "hover:shadow-[0_4px_0_0_#991b1b,0_6px_15px_rgba(239,68,68,0.3)]",
              "active:shadow-[0_2px_0_0_#991b1b] active:translate-y-[2px]"
            )}
          >
            No
          </button>
        </div>

        {/* Footer with refined typography */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-white/30 font-mono uppercase tracking-widest">VOL</span>
              <span className="text-xs text-white/60 font-semibold">{formatVolume(market.volume)}</span>
            </div>
            
            {market.verified && (
              <span className="text-emerald-400 text-xs">✓</span>
            )}
            
            <div className="flex items-center gap-1 text-purple-400/60">
              <Brain className="h-3 w-3" />
              <Zap className="h-3 w-3" />
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); }}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors group/bookmark"
          >
            <Bookmark className="h-4 w-4 text-white/30 group-hover/bookmark:text-purple-400 transition-colors" />
          </button>
        </div>
      </div>

      {/* Bottom glow line on hover */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent opacity-0 transition-opacity duration-300",
        isHovered && "opacity-100"
      )} />
    </div>
  );
};
