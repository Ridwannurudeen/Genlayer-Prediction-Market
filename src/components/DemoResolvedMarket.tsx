import { CheckCircle2, Brain, ExternalLink, Users, TrendingUp, Calendar, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const DemoResolvedMarket = () => {
  // Demo data - showing a realistic resolved market example
  const demoMarket = {
    question: "Did Bitcoin exceed $100,000 by January 2025?",
    outcome: "YES",
    resolvedAt: "January 15, 2025",
    yesPool: "2.45 ETH",
    noPool: "1.12 ETH",
    validatorCount: 5,
    consensusPercent: 100,
    aiReasoning: `Based on data fetched from CoinGecko and CoinMarketCap APIs, Bitcoin (BTC) reached an all-time high of $108,268 on December 17, 2024. This clearly exceeds the $100,000 threshold specified in the market question. Multiple data sources confirm this price milestone was achieved before the January 2025 deadline.`,
    dataSources: ["CoinGecko API", "CoinMarketCap", "Binance Price Feed"],
  };

  return (
    <Card className="border-green-500/30 bg-green-500/5 overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-green-500/20 bg-green-500/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <Badge variant="outline" className="bg-green-500/20 text-green-600 border-green-500/30 text-xs">
                    ✓ Resolved
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Demo Market
                  </Badge>
                </div>
                <h3 className="font-semibold text-sm sm:text-base">{demoMarket.question}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Outcome */}
        <div className="p-4 sm:p-5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Final Outcome</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-green-500">{demoMarket.outcome}</span>
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Resolved</p>
              <p className="text-sm font-medium">{demoMarket.resolvedAt}</p>
            </div>
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Yes Pool</p>
              <p className="text-sm font-medium text-green-500">{demoMarket.yesPool}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">No Pool</p>
              <p className="text-sm font-medium text-red-500">{demoMarket.noPool}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Validators</p>
              <p className="text-sm font-medium">{demoMarket.validatorCount}/{demoMarket.validatorCount}</p>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-purple-500" />
            <span className="font-medium text-sm">AI Validator Reasoning</span>
            <Badge variant="secondary" className="text-xs">
              {demoMarket.consensusPercent}% Consensus
            </Badge>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border border-border">
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed italic">
              "{demoMarket.aiReasoning}"
            </p>
          </div>

          {/* Data Sources */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Data Sources Used:</p>
            <div className="flex flex-wrap gap-2">
              {demoMarket.dataSources.map((source, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {source}
                </Badge>
              ))}
            </div>
          </div>

          {/* Call to Action */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 inline mr-1" />
                This is how GenLayer resolves real markets automatically
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
