import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface MarketData {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
}

interface AnalysisResult {
  insight: string;
  confidence: number;
  risk: "low" | "medium" | "high";
  factors: string[];
  verified: boolean;
}

export const useMarketAnalysis = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [creditsExhausted, setCreditsExhausted] = useState(false);

  const analyzeMarket = async (marketData: MarketData): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("analyze-market", {
        body: { marketData },
      });

      if (error) {
        throw error;
      }

      // Check for credit exhaustion (402 code in response)
      if (data?.code === 402) {
        setCreditsExhausted(true);
        toast({
          title: "AI Credits Exhausted",
          description: "Add credits in your workspace settings to enable AI analysis.",
          variant: "destructive",
        });
        return null;
      }

      if (data?.code === 429) {
        toast({
          title: "Rate Limited",
          description: "Too many requests. Please wait a moment and try again.",
          variant: "destructive",
        });
        return null;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Clear exhausted state on success
      setCreditsExhausted(false);

      toast({
        title: "Analysis Complete",
        description: "AI insights have been generated for this market.",
      });

      return data as AnalysisResult;
    } catch (error) {
      console.error("Market analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Could not analyze market",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetCreditsState = () => setCreditsExhausted(false);

  return { analyzeMarket, isAnalyzing, creditsExhausted, resetCreditsState };
};
