import { Users, CheckCircle2, Clock, AlertTriangle, Brain, Wifi, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatorConsensusProps {
  validatorCount: number;
  consensusPercentage?: number | null;
  status: string;
  className?: string;
}

// Thinking Validator Node Animation
const ValidatorNode = ({ 
  index, 
  isThinking, 
  isAgreed 
}: { 
  index: number; 
  isThinking: boolean;
  isAgreed: boolean;
}) => (
  <div 
    className={cn(
      "relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
      isAgreed 
        ? "bg-emerald-500/20 border-2 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
        : isThinking 
          ? "bg-purple-500/20 border-2 border-purple-500/50 animate-pulse" 
          : "bg-white/5 border border-white/10"
    )}
    style={{ animationDelay: `${index * 200}ms` }}
  >
    <Brain className={cn(
      "h-5 w-5 transition-colors",
      isAgreed ? "text-emerald-400" : isThinking ? "text-purple-400" : "text-white/30"
    )} />
    
    {/* Connection lines */}
    {isThinking && (
      <div className="absolute inset-0 rounded-full">
        <div className="absolute top-1/2 left-full w-4 h-px bg-gradient-to-r from-purple-500/50 to-transparent animate-pulse" />
        <div className="absolute top-full left-1/2 h-4 w-px bg-gradient-to-b from-purple-500/50 to-transparent animate-pulse" />
      </div>
    )}
    
    {/* Status indicator */}
    <div className={cn(
      "absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-slate-900",
      isAgreed ? "bg-emerald-500" : isThinking ? "bg-purple-500 animate-ping" : "bg-white/20"
    )} />
  </div>
);

// Neural Network Animation for "Thinking" state
const ThinkingAnimation = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Animated neural connections */}
    <svg className="absolute inset-0 w-full h-full">
      <defs>
        <linearGradient id="neuralGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(168,85,247,0)" />
          <stop offset="50%" stopColor="rgba(168,85,247,0.5)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0)" />
        </linearGradient>
      </defs>
      
      {/* Animated paths */}
      {[...Array(6)].map((_, i) => (
        <line
          key={i}
          x1={`${10 + i * 15}%`}
          y1="10%"
          x2={`${20 + i * 12}%`}
          y2="90%"
          stroke="url(#neuralGradient)"
          strokeWidth="1"
          className="animate-pulse"
          style={{ animationDelay: `${i * 100}ms`, opacity: 0.3 }}
        />
      ))}
    </svg>
    
    {/* Floating particles */}
    {[...Array(8)].map((_, i) => (
      <div
        key={i}
        className="absolute w-1 h-1 rounded-full bg-purple-500/50 animate-float"
        style={{
          left: `${10 + Math.random() * 80}%`,
          top: `${10 + Math.random() * 80}%`,
          animationDelay: `${i * 300}ms`,
          animationDuration: `${2 + Math.random() * 2}s`,
        }}
      />
    ))}
  </div>
);

export const ValidatorConsensus = ({
  validatorCount,
  consensusPercentage,
  status,
  className,
}: ValidatorConsensusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "resolved_yes":
        return {
          icon: CheckCircle2,
          label: "Resolved YES",
          color: "text-emerald-400",
          bg: "bg-emerald-500/10",
          border: "border-emerald-500/30",
          glow: "shadow-[0_0_30px_rgba(16,185,129,0.2)]",
          isThinking: false,
          isResolved: true,
        };
      case "resolved_no":
        return {
          icon: CheckCircle2,
          label: "Resolved NO",
          color: "text-red-400",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          glow: "shadow-[0_0_30px_rgba(239,68,68,0.2)]",
          isThinking: false,
          isResolved: true,
        };
      case "pending_resolution":
        return {
          icon: Brain,
          label: "AI Validators Thinking",
          color: "text-purple-400",
          bg: "bg-purple-500/10",
          border: "border-purple-500/30",
          glow: "shadow-[0_0_30px_rgba(168,85,247,0.3)]",
          isThinking: true,
          isResolved: false,
        };
      case "disputed":
        return {
          icon: AlertTriangle,
          label: "Disputed",
          color: "text-amber-400",
          bg: "bg-amber-500/10",
          border: "border-amber-500/30",
          glow: "shadow-[0_0_30px_rgba(245,158,11,0.2)]",
          isThinking: false,
          isResolved: false,
        };
      default:
        return {
          icon: Clock,
          label: "Open",
          color: "text-white/60",
          bg: "bg-white/5",
          border: "border-white/10",
          glow: "",
          isThinking: false,
          isResolved: false,
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className={cn(
      "relative p-5 rounded-xl overflow-hidden",
      "bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50",
      "backdrop-blur-xl",
      "border",
      config.border,
      config.glow,
      className
    )}>
      {/* Background effects */}
      {config.isThinking && <ThinkingAnimation />}
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between mb-5">
        <span className="text-sm font-medium flex items-center gap-2 text-white/90">
          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          Validator Consensus
        </span>
        
        {/* Status Badge */}
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full border",
          config.bg,
          config.color,
          config.border
        )}>
          {config.isThinking && (
            <div className="flex gap-1">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
            </div>
          )}
          <StatusIcon className={cn("h-4 w-4", config.isThinking && "animate-pulse")} />
          <span className="text-xs font-semibold tracking-wide">{config.label}</span>
        </div>
      </div>

      {/* Validator Nodes Visualization */}
      {config.isThinking && (
        <div className="relative flex justify-center gap-3 mb-5 py-4">
          {[...Array(Math.min(validatorCount, 5))].map((_, i) => (
            <ValidatorNode 
              key={i} 
              index={i} 
              isThinking={config.isThinking}
              isAgreed={config.isResolved}
            />
          ))}
          
          {/* Central processing indicator */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full border border-purple-500/20 flex items-center justify-center">
            <Activity className="h-6 w-6 text-purple-400/50 animate-pulse" />
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="relative grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <p className="text-3xl font-bold text-white tracking-tight">{validatorCount}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-1">Active Validators</p>
        </div>
        
        {consensusPercentage !== null && consensusPercentage !== undefined && (
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <p className="text-3xl font-bold text-white tracking-tight">{consensusPercentage}%</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-1">Consensus</p>
            
            {/* Mini progress bar */}
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  consensusPercentage >= 70 ? "bg-emerald-500" : consensusPercentage >= 40 ? "bg-amber-500" : "bg-red-500"
                )}
                style={{ width: `${consensusPercentage}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Info footer */}
      {status === "open" && (
        <div className="relative mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Wifi className="h-3 w-3 text-purple-400/50" />
            <p className="text-[10px] text-white/40 font-mono">
              Resolution via GenLayer Intelligent Contracts • AI-Powered Consensus
            </p>
          </div>
        </div>
      )}
      
      {/* CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
          50% { transform: translateY(-10px) scale(1.2); opacity: 1; }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
