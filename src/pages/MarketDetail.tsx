import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Calendar, DollarSign, Loader2, Sparkles, Share2, Bookmark, Info, Users, ExternalLink, Zap, AlertTriangle, Coins } from "lucide-react";
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
  const { data: market, isLoading } = useMarket(id || "");
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
  const [onChainData, setOnChainData] = useState<{ yesShares: string; noShares: string; isResolved?: boolean; winner?: number | null } | null>(null);
  const [userPosition, setUserPosition] = useState<{ yesShares: string; noShares: string } | null>(null);

  // Fetch on-chain data if market has a Base contract
  useEffect(() => {
    if (market?.base_contract_address && isConnected) {
      readMarketData(market.base_contract_address)
        .then((data) => {
          if (data) {
            setOnChainData({
              yesShares: data.yesShares || "0",
              noShares: data.noShares || "0",
              isResolved: data.isResolved,
              winner: data.winner,
            });
          }
        })
        .catch((err) => {
          console.error("Failed to read market data:", err);
        });

      getUserPosition(market.base_contract_address)
        .then((pos) => {
          if (pos) setUserPosition(pos);
        })
        .catch((err) => {
          console.error("Failed to get user position:", err);
        });
    }
  }, [market?.base_contract_address, isConnected, readMarketData, getUserPosition]);

  const handleAnalyze = async () => {
    if (!market) return;
    
    const result = await analyzeMarket({
      id: market.id,
      title: market.title,
      probability: Number(market.probability) || 50,
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

    const probability = Number(market.probability) || 50;
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
          
          readMarketData(market.base_contract_address)
            .then((data) => {
              if (data) {
                setOnChainData({
                  yesShares: data.yesShares || "0",
                  noShares: data.noShares || "0",
                  isResolved: data.isResolved,
                  winner: data.winner,
                });
              }
            })
            .catch(console.error);

          getUserPosition(market.base_contract_address)
            .then((pos) => {
              if (pos) setUserPosition(pos);
            })
            .catch(console.error);
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

  const probability = Number(market.probability) || 50;
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
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Market Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {market.category || "General"}
                </Badge>
                {market.verified && (
                  <Badge variant="outline" className="text-xs text-yes border-yes/30">
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
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/30">
                    <Zap className="h-3 w-3 mr-1" />
                    Base Sepolia
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-semibold leading-tight">
                {market.title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  {formatVolume(Number(market.volume) || 0)} volume
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Ends {formatDate(market.end_date)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {market.validator_count || 0} validators
                </span>
              </div>
            </div>

            {/* Current Probability */}
            <Card className="border">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium">Current Probability</span>
                  <div className="flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                    <Bookmark className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                  </div>
                </div>
                
                <div className="relative h-10 bg-secondary rounded-full overflow-hidden mb-4">
                  <div
                    className="absolute inset-y-0 left-0 bg-yes rounded-full transition-all duration-500"
                    style={{ width: `${probability}%` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-4">
                    <span className="text-sm font-semibold text-white z-10">
                      Yes {probability}%
                    </span>
                    <span className="text-sm font-semibold text-foreground z-10">
                      No {100 - probability}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => { setSelectedOutcome("yes"); }}
                    className="py-3 px-6 rounded-full text-sm font-semibold bg-yes text-white hover:opacity-90 transition-opacity"
                  >
                    Buy Yes
                  </button>
                  <button 
                    onClick={() => { setSelectedOutcome("no"); }}
                    className="py-3 px-6 rounded-full text-sm font-semibold bg-no text-white hover:opacity-90 transition-opacity"
                  >
                    Buy No
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

            {/* Description */}
            <Card className="border">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Resolution Details</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {market.description || "No description provided."}
                </p>
                {market.resolution_source && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Data Source:</span> {market.resolution_source}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Trade Panel & AI */}
          <div className="space-y-4">
            {/* Blockchain Status */}
            {hasBlockchainContract && (
              <Card className="border border-blue-500/30 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-500" />
                      <span className="text-xs font-medium">Base Sepolia Trading</span>
                    </div>
                    {isOnBase ? (
                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-500/30">
                        Connected
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 text-xs"
                        onClick={switchToBase}
                      >
                        Switch to Base
                      </Button>
                    )}
                  </div>
                  {onChainData && (
                    <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Yes Pool:</span>
                        <span className="ml-1 font-medium">{parseFloat(onChainData.yesShares || "0").toFixed(4)} ETH</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">No Pool:</span>
                        <span className="ml-1 font-medium">{parseFloat(onChainData.noShares || "0").toFixed(4)} ETH</span>
                      </div>
                    </div>
                  )}
                  {userPosition && (parseFloat(userPosition.yesShares || "0") > 0 || parseFloat(userPosition.noShares || "0") > 0) && (
                    <div className="mt-2 pt-2 border-t border-border/50 text-xs">
                      <span className="text-muted-foreground">Your Position:</span>
                      {parseFloat(userPosition.yesShares || "0") > 0 && (
                        <span className="ml-2 text-yes font-medium">{parseFloat(userPosition.yesShares).toFixed(4)} Yes</span>
                      )}
                      {parseFloat(userPosition.noShares || "0") > 0 && (
                        <span className="ml-2 text-no font-medium">{parseFloat(userPosition.noShares).toFixed(4)} No</span>
                      )}
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

            {/* Trade Panel */}
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSelectedOutcome("yes")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedOutcome === "yes"
                        ? "bg-yes-light text-yes"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    Yes {probability}¢
                  </button>
                  <button
                    onClick={() => setSelectedOutcome("no")}
                    className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                      selectedOutcome === "no"
                        ? "bg-no-light text-no"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    No {100 - probability}¢
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Trading Token</label>
                    <Select value={selectedToken} onValueChange={(v) => setSelectedToken(v as TradingToken)}>
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ETH">
                          <div className="flex items-center gap-2">
                            <Coins className="h-4 w-4" />
                            <span>ETH (Base Sepolia)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="USDC">
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            <span>USDC (Base Sepolia)</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Amount ({selectedToken})</label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="h-10"
                    />
                  </div>

                  <div className="flex justify-between text-sm py-2 border-t border-border">
                    <span className="text-muted-foreground">Potential return</span>
                    <span className="font-semibold text-yes">{potentialReturn} {selectedToken}</span>
                  </div>

                  {hasBlockchainContract && (
                    <div className="flex items-center justify-between py-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Trade on blockchain</span>
                      <button
                        onClick={() => setUseBlockchain(!useBlockchain)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          useBlockchain ? "bg-yes" : "bg-secondary"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            useBlockchain ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  <Button 
                    onClick={handleTrade}
                    disabled={isTrading}
                    className={`w-full gap-2 ${selectedOutcome === "yes" ? "bg-yes hover:bg-yes/90" : "bg-no hover:bg-no/90"}`}
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
                    <p className="text-xs text-center text-muted-foreground">
                      Connect wallet to start trading
                    </p>
                  )}

                  {hasBlockchainContract && useBlockchain && !isOnBase && isConnected && (
                    <p className="text-xs text-center text-amber-600">
                      Switch to Base Sepolia for on-chain trading
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* AI Credits Exhausted Banner */}
            {creditsExhausted && (
              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                      AI Credits Exhausted
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add credits in your workspace settings to enable AI-powered market analysis.
                    </p>
                    <a
                      href="https://lovable.dev/projects?settings=usage"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400"
                    >
                      Add AI Credits
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* AI Analysis */}
            <Button
              onClick={handleAnalyze}
              disabled={isAnalyzing || creditsExhausted}
              variant="outline"
              className="w-full gap-2"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : creditsExhausted ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
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
    </div>
  );
};

export default MarketDetail;
