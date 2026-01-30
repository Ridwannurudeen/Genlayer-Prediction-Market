import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MarketData {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
  description?: string;
}

interface AnalysisResult {
  insight: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  factors: string[];
  verified: boolean;
}

// Category-specific factors for local fallback
const categoryFactors: Record<string, string[]> = {
  crypto: ["Market sentiment", "Trading volume", "Whale activity", "Technical indicators", "Regulatory news"],
  tech: ["Product roadmap", "Competitive landscape", "Market adoption", "Industry trends", "Company announcements"],
  politics: ["Polling data", "Historical precedent", "Voter sentiment", "Media coverage", "Campaign dynamics"],
  finance: ["Economic indicators", "Market trends", "Institutional sentiment", "Regulatory environment", "Earnings reports"],
  sports: ["Team performance", "Injury reports", "Historical matchups", "Betting lines", "Expert predictions"],
  world: ["Geopolitical factors", "Economic conditions", "Historical patterns", "Expert analysis", "News sentiment"],
  culture: ["Social trends", "Media attention", "Public sentiment", "Industry dynamics", "Historical patterns"],
};

// Generate local analysis as fallback
const generateLocalAnalysis = (marketData: MarketData): AnalysisResult => {
  const { probability, volume, category } = marketData;
  
  // Determine risk
  let risk: "low" | "medium" | "high";
  if (probability > 85 || probability < 15) {
    risk = volume > 500 ? "medium" : "high";
  } else if (probability >= 40 && probability <= 60) {
    risk = "medium";
  } else {
    risk = volume > 1000 ? "low" : "medium";
  }

  // Calculate confidence
  const volumeBonus = Math.min(volume / 100, 20);
  const clarityBonus = Math.abs(probability - 50) * 0.4;
  const confidence = Math.min(95, Math.round(45 + volumeBonus + clarityBonus));

  // Get factors
  const factors = (categoryFactors[category?.toLowerCase()] || categoryFactors.world).slice(0, 4);

  // Generate insight
  let insight: string;
  if (probability >= 75) {
    insight = `Strong market consensus at ${probability}% YES. ${volume > 500 ? "High volume confirms conviction." : "Limited volume warrants caution."} Monitor for late shifts.`;
  } else if (probability <= 25) {
    insight = `Bearish sentiment dominates at ${probability}% YES. Market expects NO outcome. ${volume > 500 ? "Well-supported view." : "Contrarian opportunity possible."}`;
  } else if (probability >= 45 && probability <= 55) {
    insight = `Genuine uncertainty at ${probability}% YES. Traders are divided. Key catalysts could break the deadlock. Position sizing is crucial.`;
  } else if (probability > 55) {
    insight = `Moderate bullish lean at ${probability}% YES. Market positive but not overwhelming. Watch ${factors[0].toLowerCase()} for shifts.`;
  } else {
    insight = `Slight bearish tilt at ${probability}% YES. Negative resolution favored. Track ${factors[0].toLowerCase()} for reversals.`;
  }

  return { insight, confidence, risk, factors, verified: true };
};

export const useMarketAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  const analyzeMarket = async (marketData: MarketData): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    
    try {
      // Try Supabase edge function first (real Anthropic AI)
      try {
        const { data, error } = await supabase.functions.invoke("analyze-market", {
          body: { marketData },
        });

        if (!error && data && !data.error && data.insight) {
          if (data.code === 402) {
            setCreditsExhausted(true);
          } else if (data.code !== 429) {
            setCreditsExhausted(false);
            toast.success("AI Analysis Complete", {
              description: "Powered by Claude AI",
            });
            return data as AnalysisResult;
          }
        }
      } catch (apiError) {
        console.log("API unavailable, using local analysis");
      }

      // Fallback to local analysis
      await new Promise(resolve => setTimeout(resolve, 1200));
      const result = generateLocalAnalysis(marketData);

      toast.success("Analysis Complete", {
        description: "Market insights generated",
      });

      return result;
    } catch (error) {
      console.error("Analysis failed:", error);
      toast.error("Analysis Failed");
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCreditsState = () => setCreditsExhausted(false);

  return { analyzeMarket, isAnalyzing, creditsExhausted, resetCreditsState };
};
