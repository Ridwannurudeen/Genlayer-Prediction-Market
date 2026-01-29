import { useState, useMemo, useEffect } from "react";
import { Header } from "@/components/Header";
import { MarketGrid } from "@/components/MarketGrid";
import { ConnectionStatus } from "@/components/ConnectionStatus";
import { MultiFaucet } from "@/components/MultiFaucet";
import { HowItWorks } from "@/components/HowItWorks";
import { DemoResolvedMarket } from "@/components/DemoResolvedMarket";
import { ActivityTicker } from "@/components/ActivityTicker";
import { useMarkets, DbMarket } from "@/hooks/useMarkets";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { Clock, BarChart3, Zap, Brain, Play, Droplets, ExternalLink, ArrowRight, Sparkles, X } from "lucide-react";
import { Market } from "@/types/market";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Convert database market to UI market format
const toUiMarket = (dbMarket: DbMarket): Market => ({
  id: dbMarket.id,
  title: dbMarket.title,
  probability: Number(dbMarket.probability) || 50, // Default to 50% if 0 or null
  volume: Number(dbMarket.volume),
  category: dbMarket.category,
  verified: dbMarket.verified,
  endDate: dbMarket.end_date,
  description: dbMarket.description || "",
  aiInsight: {
    summary: "AI analysis available on market detail page",
    riskLevel: "medium" as const,
    confidenceScore: 0.7,
    factors: [],
  },
  priceHistory: [],
});

const Index = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<"volume" | "newest">("volume");
  const { data: dbMarkets, isLoading } = useMarkets();
  const { isConnected } = useWalletAuth();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(true);

  // Convert and set markets when data loads
  useEffect(() => {
    if (dbMarkets) {
      setMarkets(dbMarkets.map(toUiMarket));
    }
  }, [dbMarkets]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("markets-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "markets",
        },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setMarkets((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? toUiMarket(payload.new as DbMarket) : m
              )
            );
          } else if (payload.eventType === "INSERT") {
            setMarkets((prev) => [...prev, toUiMarket(payload.new as DbMarket)]);
          } else if (payload.eventType === "DELETE") {
            setMarkets((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredMarkets = useMemo(() => {
    let result = [...markets];

    // Filter by category
    if (activeCategory !== "All") {
      result = result.filter((m) => m.category === activeCategory);
    }

    // Sort
    if (sortBy === "volume") {
      result.sort((a, b) => b.volume - a.volume);
    } else {
      result.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    }

    return result;
  }, [markets, activeCategory, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        activeCategory={activeCategory} 
        onCategoryChange={setActiveCategory} 
      />

      {/* Neural Activity Ticker */}
      <ActivityTicker />

      <main className="container py-4">
        {/* Compact Hero Banner */}
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-500/10 via-slate-900/50 to-blue-500/10 border border-purple-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <Zap className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <p className="font-semibold text-sm text-white/90">GenLayer Intelligent Contracts</p>
                <p className="text-[10px] text-white/50 font-mono uppercase tracking-wider">
                  AI-Powered Resolution • Validator Consensus
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400/80 font-mono">LIVE</span>
            </div>
          </div>
        </div>

        {/* Platform Intel - Compact Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {/* Card 1: How It Works */}
          <Dialog>
            <DialogTrigger asChild>
              <button className="group relative p-4 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/10 hover:border-purple-500/30 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)] text-left">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
                    <Brain className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white/90 mb-1">How It Works</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
                      AI validators analyze real-world data to resolve markets automatically
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-purple-400 font-medium uppercase tracking-wider group-hover:text-purple-300">
                  <span>Learn More</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-slate-900 border-white/10">
              <DialogHeader>
                <DialogTitle className="text-white/90 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-purple-400" />
                  How GenLayer Resolution Works
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4">
                <HowItWorks />
              </div>
            </DialogContent>
          </Dialog>

          {/* Card 2: AI Resolution Demo */}
          <Sheet>
            <SheetTrigger asChild>
              <button className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-950/50 to-slate-900/80 border border-emerald-500/20 hover:border-emerald-500/40 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(16,185,129,0.1)] text-left">
                <div className="flex items-start gap-3">
                  <div className="relative w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                    <Play className="h-5 w-5 text-emerald-400" />
                    <div className="absolute inset-0 rounded-lg bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-white/90 mb-1">Live Demo</h3>
                    <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
                      See AI resolution in action with a real resolved market example
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3 text-[10px] text-emerald-400 font-medium uppercase tracking-wider group-hover:text-emerald-300">
                  <span>View Example</span>
                  <Sparkles className="h-3 w-3" />
                </div>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-xl bg-slate-900 border-white/10 overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-white/90 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  AI Resolution Example
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <DemoResolvedMarket />
              </div>
            </SheetContent>
          </Sheet>

          {/* Card 3: Quick Links / Faucets */}
          {isConnected ? (
            <Sheet>
              <SheetTrigger asChild>
                <button className="group relative p-4 rounded-xl bg-gradient-to-br from-blue-950/50 to-slate-900/80 border border-blue-500/20 hover:border-blue-500/40 backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)] text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                      <Droplets className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-white/90 mb-1">Get Testnet Tokens</h3>
                      <p className="text-[11px] text-white/50 leading-relaxed line-clamp-2">
                        Faucets for GenLayer GEN and Base Sepolia ETH
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-3 text-[10px] text-blue-400 font-medium uppercase tracking-wider group-hover:text-blue-300">
                    <span>Open Faucets</span>
                    <Droplets className="h-3 w-3" />
                  </div>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md bg-slate-900 border-white/10 overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-white/90 flex items-center gap-2">
                    <Droplets className="h-5 w-5 text-blue-400" />
                    Testnet Faucets
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6">
                  <MultiFaucet />
                </div>
              </SheetContent>
            </Sheet>
          ) : (
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-800/40 border border-white/5 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Droplets className="h-5 w-5 text-white/30" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-white/50 mb-1">Quick Links</h3>
                  <div className="space-y-1.5 mt-2">
                    <a 
                      href="https://www.genlayer.com/testnet" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-purple-400 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      GenLayer Faucet
                    </a>
                    <a 
                      href="https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-white/40 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Base Sepolia Faucet
                    </a>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-white/30 mt-3 font-mono">
                Connect wallet for full faucet access
              </p>
            </div>
          )}
        </div>

        {/* Sticky Category Bar + Sort Controls */}
        <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-background/80 backdrop-blur-md border-b border-white/5 mb-4">
          <div className="flex items-center justify-between gap-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono uppercase tracking-wider hidden sm:inline">Sort</span>
              <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10">
                <button
                  onClick={() => setSortBy("volume")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                    sortBy === "volume"
                      ? "bg-purple-500/20 text-purple-400 font-semibold shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <BarChart3 className="h-3 w-3" />
                  Volume
                </button>
                <button
                  onClick={() => setSortBy("newest")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md transition-all duration-200 ${
                    sortBy === "newest"
                      ? "bg-purple-500/20 text-purple-400 font-semibold shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                      : "text-white/50 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  Newest
                </button>
              </div>
            </div>

            {/* Market Count & Connection Status */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40 font-mono">
                {filteredMarkets.length} market{filteredMarkets.length !== 1 ? 's' : ''}
              </span>
              <ConnectionStatus isConnected={isRealtimeConnected} />
            </div>
          </div>
        </div>

        {/* Markets Grid - Now prominently visible */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-white/5 border border-white/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <MarketGrid markets={filteredMarkets} />
        )}

        {!isLoading && filteredMarkets.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-white/20" />
            </div>
            <p className="text-white/50 text-sm">No markets found in this category.</p>
            <button 
              onClick={() => setActiveCategory("All")}
              className="mt-3 text-xs text-purple-400 hover:text-purple-300 font-medium"
            >
              View all markets →
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
