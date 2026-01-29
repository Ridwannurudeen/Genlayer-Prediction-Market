import { Brain, AlertTriangle, TrendingUp, Sparkles, Shield, Activity, Cpu, Globe, Database, Radio } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIInsight } from "@/types/market";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  insight: AIInsight;
  className?: string;
}

// Neural Confidence Gauge Component
const NeuralConfidenceGauge = ({ value }: { value: number }) => {
  const circumference = 2 * Math.PI * 36; // radius of 36
  const strokeDashoffset = circumference - (value / 100) * circumference;
  
  // Derive color from value without changing schema
  const getGaugeColor = (val: number) => {
    if (val >= 70) return { stroke: "#22c55e", glow: "rgba(34, 197, 94, 0.5)" };
    if (val >= 40) return { stroke: "#f59e0b", glow: "rgba(245, 158, 11, 0.5)" };
    return { stroke: "#ef4444", glow: "rgba(239, 68, 68, 0.5)" };
  };
  
  const colors = getGaugeColor(value);
  
  return (
    <div className="relative w-24 h-24">
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ backgroundColor: colors.glow }}
      />
      
      {/* Background ring */}
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke="currentColor"
          strokeWidth="6"
          fill="none"
          className="text-white/5"
        />
        {/* Animated progress ring */}
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke={colors.stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
          style={{
            filter: `drop-shadow(0 0 6px ${colors.glow})`,
          }}
        />
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{value}%</span>
        <span className="text-[10px] text-white/50 uppercase tracking-wider">Confidence</span>
      </div>
      
      {/* Pulse animation dot */}
      <div 
        className="absolute top-1 right-3 w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: colors.stroke }}
      />
    </div>
  );
};

// Floating Source Node Component
const SourceNode = ({ 
  icon: Icon, 
  label, 
  delay 
}: { 
  icon: React.ElementType; 
  label: string;
  delay: number;
}) => (
  <div 
    className="group relative flex flex-col items-center gap-1 animate-float"
    style={{ 
      animationDelay: `${delay}ms`,
      animationDuration: '3s',
    }}
  >
    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm group-hover:bg-white/10 group-hover:border-purple-500/50 transition-all duration-300 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)]">
      <Icon className="h-4 w-4 text-purple-400/70 group-hover:text-purple-400" />
    </div>
    <span className="text-[9px] text-white/40 group-hover:text-white/70 transition-colors truncate max-w-[60px] text-center">
      {label}
    </span>
    
    {/* Connection line */}
    <div className="absolute top-4 left-1/2 w-px h-4 bg-gradient-to-b from-purple-500/30 to-transparent -z-10" />
  </div>
);

// Factor source icon mapper
const getFactorIcon = (factor: string) => {
  const lowerFactor = factor.toLowerCase();
  if (lowerFactor.includes('market') || lowerFactor.includes('price')) return TrendingUp;
  if (lowerFactor.includes('data') || lowerFactor.includes('api')) return Database;
  if (lowerFactor.includes('news') || lowerFactor.includes('media')) return Radio;
  if (lowerFactor.includes('web') || lowerFactor.includes('source')) return Globe;
  return Cpu;
};

export const AIInsightCard = ({ insight, className }: AIInsightCardProps) => {
  const getRiskStyles = (level: string) => {
    switch (level) {
      case "low": 
        return { 
          bg: "bg-emerald-500/10", 
          text: "text-emerald-400", 
          border: "border-emerald-500/30",
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
          icon: Shield 
        };
      case "medium": 
        return { 
          bg: "bg-amber-500/10", 
          text: "text-amber-400", 
          border: "border-amber-500/30",
          glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
          icon: AlertTriangle 
        };
      case "high": 
        return { 
          bg: "bg-red-500/10", 
          text: "text-red-400", 
          border: "border-red-500/30",
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
          icon: AlertTriangle 
        };
      default: 
        return { 
          bg: "bg-white/5", 
          text: "text-white/70", 
          border: "border-white/10",
          glow: "",
          icon: Shield 
        };
    }
  };

  const riskStyles = getRiskStyles(insight.riskLevel);
  const RiskIcon = riskStyles.icon;

  return (
    <Card className={cn(
      // Liquid Glass Effect
      "relative overflow-hidden",
      "bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-purple-900/30",
      "backdrop-blur-xl",
      "border border-white/10",
      "shadow-[0_0_40px_rgba(168,85,247,0.1)]",
      className
    )}>
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 animate-pulse" style={{ animationDuration: '4s' }} />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }}
      />

      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center gap-3">
          {/* AI Brain icon with glow */}
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500 rounded-lg blur-md opacity-30 animate-pulse" />
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-400" />
            </div>
          </div>
          
          <div className="flex-1">
            <span className="text-base font-semibold text-white flex items-center gap-2">
              AI Analysis
              <Sparkles className="h-3.5 w-3.5 text-purple-400 animate-pulse" />
            </span>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
              Neural Network Insight
            </span>
          </div>
          
          {/* Live indicator */}
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400/70 uppercase tracking-wide font-mono">Live</span>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative space-y-5 pt-2">
        {/* Summary with tech styling */}
        <div className="relative p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <Activity className="absolute top-3 right-3 h-3 w-3 text-purple-500/30" />
          <p className="text-sm text-white/70 leading-relaxed font-light">
            {insight.summary}
          </p>
        </div>

        {/* Risk & Confidence Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Risk Level */}
          <div className="space-y-2">
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest font-mono">
              Risk Assessment
            </span>
            <div className={cn(
              "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
              riskStyles.bg, 
              riskStyles.text,
              riskStyles.border,
              riskStyles.glow
            )}>
              <RiskIcon className="h-4 w-4" />
              <span className="text-sm font-semibold tracking-wide">
                {insight.riskLevel.charAt(0).toUpperCase() + insight.riskLevel.slice(1)}
              </span>
            </div>
          </div>

          {/* Neural Confidence Gauge */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest font-mono mb-2">
              AI Confidence
            </span>
            <NeuralConfidenceGauge value={insight.confidenceScore} />
          </div>
        </div>

        {/* Source Web - Key Factors as floating nodes */}
        {insight.factors && insight.factors.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest font-mono">
                Data Sources Analyzed
              </span>
              <span className="text-[10px] text-purple-400/70 font-mono">
                {insight.factors.length} nodes
              </span>
            </div>
            
            {/* Floating Source Web */}
            <div className="relative p-4 rounded-lg bg-white/[0.02] border border-white/5 overflow-hidden">
              {/* Central connection point */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500/30 blur-sm" />
              
              {/* Source nodes */}
              <div className="flex flex-wrap justify-center gap-4">
                {insight.factors.map((factor, index) => (
                  <SourceNode 
                    key={index}
                    icon={getFactorIcon(factor)}
                    label={factor}
                    delay={index * 200}
                  />
                ))}
              </div>
              
              {/* Connection lines animation */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="transparent" />
                    <stop offset="50%" stopColor="rgb(168,85,247)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        )}

        {/* Bottom tech decoration */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Cpu className="h-3 w-3 text-white/20" />
            <span className="text-[9px] text-white/30 font-mono">GenLayer Neural Engine v2.0</span>
          </div>
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 h-3 rounded-full bg-purple-500/30 animate-pulse"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
      
      {/* CSS for float animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </Card>
  );
};
