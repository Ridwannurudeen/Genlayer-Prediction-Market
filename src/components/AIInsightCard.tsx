import { Brain, AlertTriangle, TrendingUp, Sparkles, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIInsight } from "@/types/market";
import { cn } from "@/lib/utils";

interface AIInsightCardProps {
  insight: AIInsight | null; // Updated to accept null
  className?: string;
}

export const AIInsightCard = ({ insight, className }: AIInsightCardProps) => {
  // 1. ADDED LOADING GUARD: 
  // This prevents the "Cannot read properties of null" error.
  if (!insight) {
    return (
      <Card className={cn("border border-border animate-pulse", className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-muted-foreground/50" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-3 w-full bg-muted rounded" />
            <div className="h-3 w-2/3 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRiskStyles = (level: string) => {
    // Normalizing level to lowercase to prevent string mismatch errors
    const normalizedLevel = level?.toLowerCase() || "default";
    switch (normalizedLevel) {
      case "low": return { bg: "bg-yes-light", text: "text-yes", icon: Shield };
      case "medium": return { bg: "bg-amber-50", text: "text-amber-600", icon: AlertTriangle };
      case "high": return { bg: "bg-no-light", text: "text-no", icon: AlertTriangle };
      default: return { bg: "bg-secondary", text: "text-foreground", icon: Shield };
    }
  };

  const riskStyles = getRiskStyles(insight.riskLevel);
  const RiskIcon = riskStyles.icon;

  return (
    <Card className={cn("border border-border", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Brain className="h-5 w-5 text-muted-foreground" />
          AI Analysis
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {insight.summary}
        </p>

        {/* Risk & Confidence Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Risk Level
            </span>
            <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", riskStyles.bg, riskStyles.text)}>
              <RiskIcon className="h-3 w-3" />
              {insight.riskLevel ? insight.riskLevel.charAt(0).toUpperCase() + insight.riskLevel.slice(1) : "Unknown"}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Confidence
            </span>
            <div className="flex items-center gap-2">
              <Progress value={insight.confidenceScore} className="h-1.5 flex-1" />
              <span className="text-sm font-semibold">{insight.confidenceScore}%</span>
            </div>
          </div>
        </div>

        {/* Key Factors */}
        {insight.factors && insight.factors.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Key Factors
            </span>
            <div className="flex flex-wrap gap-1.5">
              {insight.factors.map((factor, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-secondary text-xs rounded-md text-foreground"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};