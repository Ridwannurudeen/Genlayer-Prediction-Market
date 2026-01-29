import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, Loader2, Sparkles, Share2, Bookmark, Info, Users, ExternalLink, Zap, AlertTriangle, Coins, RefreshCw, Activity, Radio, Cpu } from "lucide-react";
import { Header } from "@/components/Header";
import { AIInsightCard } from "@/components/AIInsightCard";
import { MarketChart } from "@/components/MarketChart";
import { ValidatorConsensus } from "@/components/ValidatorConsensus";
import { IntelligentContractBadge } from "@/components/IntelligentContractBadge";
import { GenLayerResolution } from "@/components/GenLayerResolution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMarket } from "@/hooks/useMarkets";
import { useMarketAnalysis } from "@/hooks/useMarketAnalysis";
import { useCreateTrade } from "@/hooks/usePositions";
import { useBaseTrading } from "@/hooks/useBaseTrading";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { WalletModal } from "@/components/WalletModal";
import { AIInsight } from "@/types/market";
import { toast } from "sonner";

type TradingToken = "ETH" | "USDC";

const formatVolume = (volume: number): string => {
  if (!volume || isNaN(volume)) return "$0";
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(2)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
  return `$${volume}`;
};

const formatDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const MarketDetail = () => {
  const { id } = useParams();
  const { data: market, isLoading, refetch: refetchMarket } = useMarket(id || "");
  const { analyzeMarket, isAnalyzing, creditsExhausted } = useMarketAnalysis();
  const createTrade = useCreateTrade();
  const { buyShares, isPending: isBlockchainPending, isOnBase, readMarketData, getUserPosition } = useBaseTrading();
  const { isConnected, address, chainId, switchToBase } = useWalletAuth();
  
  const [liveInsight, setLiveInsight] = useState<AIInsight | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no">("yes");
  const [amount, setAmount] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [useBlockchain, setUseBlockchain] = useState(true);
  const [selectedToken, setSelectedToken] = useState<TradingToken>("ETH");
  const [onChainData, setOnChainData] = useState<{ 
    yesPool: string; 
    noPool: string; 
    isResolved?: boolean; 
    winner?: number | null 
  } | null>(null);
  const [userPosition, setUserPosition] = useState<{ yesShares: string; noShares: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Function to refresh on-chain data
  const refreshOnChainData = useCallback(async () => {
    if (!market?.base_contract_address) return;
    
    setIsRefreshing(true);
    console.log("Refreshing on-chain data for:", market.base_contract_address);
    
    try {
      const data = await readMarketData(market.base_contract_address);
      console.log("Read market data result:", data);
      
      if (data) {
        setOnChainData({
          yesPool: data.yesShares || "0",
          noPool: data.noShares || "0",
          isResolved: data.isResolved,
          winner: data.winner,
        });
        console.log("Updated pools - Yes:", data.yesShares, "No:", data.noShares);
      }
    } catch (err) {
      console.error("Failed to read market data:", err);
    }

    try {
      const pos = await getUserPosition(market.base_contract_address);
      console.log("User position:", pos);
      if (pos) setUserPosition(pos);
    } catch (err) {
      console.error("Failed to get user position:", err);
    }
    
    setIsRefreshing(false);
  }, [market?.base_contract_address, readMarketData, getUserPosition]);

  // Fetch on-chain data on mount and when contract changes
  useEffect(() => {
    if (market?.base_contract_address && isConnected) {
      refreshOnChainData();
    }
  }, [market?.base_contract_address, isConnected, refreshOnChainData]);

  // Calculate live probability from on-chain pool data
  const calculateProbability = useCallback(() => {
    if (onChainData) {
      const yesPool = parseFloat(onChainData.yesPool || "0");
      const noPool = parseFloat(onChainData.noPool || "0");
      const totalPool = yesPool + noPool;
      
      console.log("Calculating probability - Yes Pool:", yesPool, "No Pool:", noPool, "Total:", totalPool);
      
      if (totalPool > 0) {
        const yesProb = Math.round((yesPool / totalPool) * 100);
        console.log("Calculated YES probability:", yesProb);
        return Math.max(1, Math.min(99, yesProb));
      }
    }
    return Number(market?.probability) || 50;
  }, [onChainData, market?.probability]);

  const probability = calculateProbability();

  const handleAnalyze = async () => {
    if (!market) return;
    
    const result = await analyzeMarket({
      id: market.id,
      title: market.title,
      probability: probability,
      volume: Number(market.volume) || 0,
      category: market.category,
    });

    if (result) {
      setLiveInsight({
        summary: result.insight,
        riskLevel: result.risk,
        confidenceScore: result.confidence,
        factors: result.factors,
      });
    }
  };

  const handleTrade = async () => {
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }

    if (!market || !amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const price = selectedOutcome === "yes" 
      ? probability / 100 
      : (100 - probability) / 100;
    
    const tradeAmount = parseFloat(amount);
    const shares = tradeAmount / price;

    try {
      if (useBlockchain && market.base_contract_address) {
        const result = await buyShares({
          contractAddress: market.base_contract_address,
          positionType: selectedOutcome,
          amount: tradeAmount,
        });
        
        if (result.success) {
          await createTrade.mutateAsync({
            marketId: market.id,
            positionType: selectedOutcome,
            shares,
            price,
          });
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          await refreshOnChainData();
          
          toast.success(`Bought ${selectedOutcome.toUpperCase()} shares! Odds updated.`);
        }
      } else {
        await createTrade.mutateAsync({
          marketId: market.id,
          positionType: selectedOutcome,
          shares,
          price,
        });
        toast.success(`Successfully bought ${selectedOutcome.toUpperCase()} shares!`);
      }
      
      setAmount("");
    } catch (error: any) {
      if (!error.message?.includes("rejected")) {
        toast.error(error.message || "Trade failed");
      }
    }
  };

  const hasBlockchainContract = !!market?.base_contract_address;
  const hasGenLayerContract = !!market?.intelligent_contract_address;
  const isTrading = createTrade.isPending || isBlockchainPending;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-secondary rounded w-3/4" />
            <div className="h-4 bg-secondary rounded w-1/2" />
            <div className="h-64 bg-secondary rounded" />
          </div>
        </main>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="text-center py-20">
            <h1 className="text-xl font-semibold mb-4">Market Not Found</h1>
            <Link to="/">
              <Button variant="outline" size="sm">Return to Markets</Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const potentialReturn = amount && parseFloat(amount) > 0
    ? (parseFloat(amount) / (selectedOutcome === "yes" ? probability : 100 - probability) * 100).toFixed(2) 
    : "0.00";

  const defaultInsight: AIInsight = {
    summary: "Click 'Run AI Analysis' to get intelligent insights about this market.",
    riskLevel: "medium",
    confidenceScore: 0,
    factors: [],
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Header - Futuristic */}
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-purple-900/20 backdrop-blur-xl border border-white/10 overflow-hidden">
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
              <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                   linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: '30px 30px',
                }}
              />
              
              <div className="relative space-y-4">
                {/* Badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-white/10 text-white/80 border-white/20 hover:bg-white/20">
                    {market.category || "General"}
                  </Badge>
                  {market.verified && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      ✓ Verified
                    </Badge>
                  )}
                  {hasGenLayerContract && (
                    <IntelligentContractBadge 
                      contractAddress={market.intelligent_contract_address}
                      resolutionSource={market.resolution_source}
                    />
                  )}
                  {hasBlockchainContract && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                      <Zap className="h-3 w-3 mr-1" />
                      Base Sepolia
                    </Badge>
                  )}
                </div>
                
                {/* Question with gradient text */}
                <h1 className="text-2xl md:text-3xl font-bold leading-tight bg-gradient-to-r from-white via-white to-purple-200 bg-clip-text text-transparent">
                  {market.title}
                </h1>
                
                {/* Stats row */}
                <div className="flex items-center gap-6 text-sm">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    </div>
                    <span className="font-mono">{formatVolume(Number(market.volume) || 0)}</span>
                    <span className="text-white/40">volume</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                      <Calendar className="h-3.5 w-3.5 text-amber-400" />
                    </div>
                    <span className="font-mono">{formatDate(market.end_date)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <div className="w-6 h-6 rounded-md bg-white/5 flex items-center justify-center">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                    </div>
                    <span className="font-mono">{market.validator_count || 0}</span>
                    <span className="text-white/40">validators</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Current Probability - Futuristic */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 backdrop-blur-xl border-white/10">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-red-500/5" />
              
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-purple-400" />
                    <span className="text-sm font-medium text-white/90">Current Probability</span>
                    <span className="text-[10px] text-white/40 font-mono uppercase tracking-wider">Live</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Share2 className="h-4 w-4 text-white/30 cursor-pointer hover:text-white/70 transition-colors" />
                    <Bookmark className="h-4 w-4 text-white/30 cursor-pointer hover:text-white/70 transition-colors" />
                  </div>
                </div>
                
                {/* Probability Bar - Enhanced */}
                <div className="relative h-14 bg-slate-800/50 rounded-xl overflow-hidden mb-5 border border-white/5">
                  {/* YES portion */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-600 to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${probability}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                  </div>
                  
                  {/* Labels */}
                  <div className="absolute inset-0 flex items-center justify-between px-5">
                    <span className="text-base font-bold text-white z-10 drop-shadow-lg">
                      Yes {probability}%
                    </span>
                    <span className="text-base font-bold text-white/80 z-10">
                      No {100 - probability}%
                    </span>
                  </div>
                </div>

                {/* Buy Buttons - Depth-based design with micro-interactions */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => { setSelectedOutcome("yes"); }}
                    className={`
                      relative group py-4 px-6 rounded-xl text-sm font-bold transition-all duration-300
                      bg-gradient-to-b from-emerald-500 to-emerald-600
                      hover:from-emerald-400 hover:to-emerald-500
                      shadow-[0_4px_0_0_#065f46,0_6px_20px_rgba(16,185,129,0.3)]
                      hover:shadow-[0_4px_0_0_#065f46,0_6px_30px_rgba(16,185,129,0.5)]
                      active:shadow-[0_2px_0_0_#065f46]
                      active:translate-y-[2px]
                      text-white
                    `}
                  >
                    <span className="relative z-10">Buy Yes</span>
                    {/* Inner glow on hover */}
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  
                  <button 
                    onClick={() => { setSelectedOutcome("no"); }}
                    className={`
                      relative group py-4 px-6 rounded-xl text-sm font-bold transition-all duration-300
                      bg-gradient-to-b from-red-500 to-red-600
                      hover:from-red-400 hover:to-red-500
                      shadow-[0_4px_0_0_#991b1b,0_6px_20px_rgba(239,68,68,0.3)]
                      hover:shadow-[0_4px_0_0_#991b1b,0_6px_30px_rgba(239,68,68,0.5)]
                      active:shadow-[0_2px_0_0_#991b1b]
                      active:translate-y-[2px]
                      text-white
                    `}
                  >
                    <span className="relative z-10">Buy No</span>
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Validator Consensus */}
            {(market.validator_count || 0) > 0 && (
              <ValidatorConsensus
                validatorCount={market.validator_count || 0}
                consensusPercentage={market.consensus_percentage || 0}
                status={market.resolution_status}
              />
            )}

            {/* Price Chart */}
            <MarketChart data={[]} />

            {/* Resolution Details - Futuristic */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 backdrop-blur-xl border-white/10">
              <CardContent className="relative p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    <Info className="h-4 w-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-white/90">Resolution Details</span>
                </div>
                <p className="text-sm text-white/60 leading-relaxed mb-4 font-light">
                  {market.description || "No description provided."}
                </p>
                {market.resolution_source && (
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Radio className="h-3 w-3 text-purple-400" />
                      <span className="font-mono uppercase tracking-wider">Data Source:</span>
                      <span className="text-white/60">{market.resolution_source}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trade Panel & AI */}
          <div className="space-y-4">
            {/* Blockchain Status - Futuristic */}
            {hasBlockchainContract && (
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-950/50 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-blue-500/20 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
                <CardContent className="relative p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 rounded-lg blur-md opacity-30 animate-pulse" />
                        <div className="relative w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                          <Zap className="h-4 w-4 text-blue-400" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-white/90">Base Sepolia Trading</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOnBase ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                          Connected
                        </Badge>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs bg-white/5 border-white/10 hover:bg-white/10"
                          onClick={switchToBase}
                        >
                          Switch to Base
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 hover:bg-white/10"
                        onClick={refreshOnChainData}
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-white/50 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Pool Data */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Yes Pool</span>
                      <p className="text-sm font-bold text-emerald-400 font-mono">
                        {parseFloat(onChainData?.yesPool || "0").toFixed(4)} ETH
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">No Pool</span>
                      <p className="text-sm font-bold text-red-400 font-mono">
                        {parseFloat(onChainData?.noPool || "0").toFixed(4)} ETH
                      </p>
                    </div>
                  </div>

                  {/* Contract Address */}
                  <div className="mt-3 pt-3 border-t border-white/5 text-[10px] text-white/40 font-mono">
                    Contract: {market.base_contract_address?.slice(0, 10)}...{market.base_contract_address?.slice(-6)}
                    <ExternalLink 
                      className="h-3 w-3 inline ml-1.5 cursor-pointer hover:text-white/70 transition-colors" 
                      onClick={() => window.open(`https://sepolia.basescan.org/address/${market.base_contract_address}`, "_blank")}
                    />
                  </div>

                  {/* User Position */}
                  {userPosition && (parseFloat(userPosition.yesShares || "0") > 0 || parseFloat(userPosition.noShares || "0") > 0) && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">Your Position</span>
                      <div className="flex gap-3 mt-1">
                        {parseFloat(userPosition.yesShares || "0") > 0 && (
                          <span className="text-sm text-emerald-400 font-mono font-semibold">{parseFloat(userPosition.yesShares).toFixed(4)} Yes</span>
                        )}
                        {parseFloat(userPosition.noShares || "0") > 0 && (
                          <span className="text-sm text-red-400 font-mono font-semibold">{parseFloat(userPosition.noShares).toFixed(4)} No</span>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* GenLayer AI Resolution */}
            {hasGenLayerContract && (
              <GenLayerResolution
                contractAddress={market.intelligent_contract_address}
                marketEndDate={market.end_date}
                onResolved={(outcome, reasoning) => {
                  console.log("Market resolved:", outcome === 1 ? "YES" : "NO");
                  console.log("Reasoning:", reasoning);
                }}
              />
            )}

            {/* Trade Panel - Futuristic */}
            <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 backdrop-blur-xl border-white/10 shadow-[0_0_40px_rgba(168,85,247,0.05)]">
              <CardContent className="relative p-5">
                {/* Outcome Tabs with glow effects */}
                <div className="flex gap-2 mb-5">
                  <button
                    onClick={() => setSelectedOutcome("yes")}
                    className={`
                      flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300
                      ${selectedOutcome === "yes"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                      }
                    `}
                  >
                    Yes {probability}¢
                  </button>
                  <button
                    onClick={() => setSelectedOutcome("no")}
                    className={`
                      flex-1 py-3 text-sm font-semibold rounded-lg transition-all duration-300
                      ${selectedOutcome === "no"
                        ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                        : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                      }
                    `}
                  >
                    No {100 - probability}¢
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Token Select */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-2 block">Trading Token</label>
                    <Select value={selectedToken} onValueChange={(v) => setSelectedToken(v as TradingToken)}>
                      <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white/90 focus:border-purple-500/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="ETH">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4 text-blue-400" />
                            <span>ETH (Base Sepolia)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="USDC">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            <span>USDC (Base Sepolia)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="text-[10px] text-white/40 uppercase tracking-wider font-mono mb-2 block">Amount ({selectedToken})</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white/90 placeholder:text-white/20 focus:border-purple-500/50 font-mono"
                    />
                  </div>

                  {/* Potential Return */}
                  <div className="flex justify-between items-center py-3 px-4 rounded-lg bg-white/[0.02] border border-white/5">
                    <span className="text-xs text-white/40">Potential return</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">{potentialReturn} {selectedToken}</span>
                  </div>

                  {/* Blockchain Toggle */}
                  {hasBlockchainContract && (
                    <div className="flex items-center justify-between py-3 border-t border-white/5">
                      <span className="text-xs text-white/50">Trade on blockchain</span>
                      <button
                        onClick={() => setUseBlockchain(!useBlockchain)}
                        className={`
                          relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300
                          ${useBlockchain 
                            ? "bg-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                            : "bg-white/10"
                          }
                        `}
                      >
                        <span
                          className={`
                            inline-block h-4 w-4 transform rounded-full transition-all duration-300
                            ${useBlockchain 
                              ? "translate-x-6 bg-emerald-400" 
                              : "translate-x-1 bg-white/50"
                            }
                          `}
                        />
                      </button>
                    </div>
                  )}

                  {/* Trade Button - Tactile depth effect */}
                  <Button 
                    onClick={handleTrade}
                    disabled={isTrading}
                    className={`
                      w-full h-12 gap-2 font-bold text-sm transition-all duration-300
                      ${selectedOutcome === "yes" 
                        ? "bg-gradient-to-b from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-[0_4px_0_0_#065f46,0_6px_20px_rgba(16,185,129,0.3)] active:shadow-[0_2px_0_0_#065f46] active:translate-y-[2px]" 
                        : "bg-gradient-to-b from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-[0_4px_0_0_#991b1b,0_6px_20px_rgba(239,68,68,0.3)] active:shadow-[0_2px_0_0_#991b1b] active:translate-y-[2px]"
                      }
                    `}
                  >
                    {isTrading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isBlockchainPending ? "Confirming on Chain..." : "Processing..."}
                      </>
                    ) : (
                      <>
                        {useBlockchain && hasBlockchainContract && <Zap className="h-4 w-4" />}
                        Buy {selectedOutcome === "yes" ? "Yes" : "No"}
                      </>
                    )}
                  </Button>

                  {!isConnected && (
                    <p className="text-[10px] text-center text-white/40 font-mono">
                      Connect wallet to start trading
                    </p>
                  )}

                  {hasBlockchainContract && useBlockchain && !isOnBase && isConnected && (
                    <p className="text-[10px] text-center text-amber-400/80 font-mono">
                      Switch to Base Sepolia for on-chain trading
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Credits Exhausted Banner */}
            {creditsExhausted && (
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-400">
                      AI Credits Exhausted
                    </p>
                    <p className="text-[10px] text-white/50 mt-1 font-mono">
                      Add credits in your workspace settings to enable AI-powered market analysis.
                    </p>
                    <a
                      href="https://lovable.dev/projects?settings=usage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Add AI Credits
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis Button - Futuristic */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || creditsExhausted}
              variant="outline"
              className="w-full h-12 gap-2 bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20 hover:border-purple-500/50 text-purple-400 font-semibold transition-all duration-300 shadow-[0_0_20px_rgba(168,85,247,0.1)] hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="animate-pulse">Analyzing with AI...</span>
                </>
              ) : creditsExhausted ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Credits Required
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Run AI Analysis
                </>
              )}
            </Button>

            <AIInsightCard insight={liveInsight || defaultInsight} />
          </div>
        </div>
      </main>

      <WalletModal 
        open={walletModalOpen} 
        onOpenChange={setWalletModalOpen}
      />
      
      {/* Global styles for animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
};

export default MarketDetail;
