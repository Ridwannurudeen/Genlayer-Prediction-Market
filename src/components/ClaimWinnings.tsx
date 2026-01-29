import { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, Zap, CheckCircle2, Coins, ExternalLink, PartyPopper } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBaseTrading } from "@/hooks/useBaseTrading";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { formatEther } from "ethers";

interface ClaimWinningsProps {
  baseContractAddress: string | null | undefined;
  onClaimComplete?: () => void;
}

export const ClaimWinnings = ({
  baseContractAddress,
  onClaimComplete,
}: ClaimWinningsProps) => {
  const { isConnected, address, switchToBase } = useWalletAuth();
  const { claimWinnings, readMarketData, getUserPosition, isOnBase, isPending } = useBaseTrading();

  const [marketData, setMarketData] = useState<{
    isResolved: boolean;
    winner: number;
    totalPool: string;
  } | null>(null);
  
  const [userPosition, setUserPosition] = useState<{
    yesShares: string;
    noShares: string;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);

  // Check market and user status
  const checkStatus = useCallback(async () => {
    if (!baseContractAddress) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const data = await readMarketData(baseContractAddress);
      if (data) {
        setMarketData({
          isResolved: data.isResolved,
          winner: data.winner,
          totalPool: data.totalPool,
        });
      }

      const position = await getUserPosition(baseContractAddress);
      if (position) {
        setUserPosition(position);
      }
    } catch (error) {
      console.error("Error checking claim status:", error);
    }

    setIsLoading(false);
  }, [baseContractAddress, readMarketData, getUserPosition]);

  useEffect(() => {
    if (isConnected) {
      checkStatus();
    } else {
      setIsLoading(false);
    }
  }, [isConnected, checkStatus]);

  // Calculate if user won and estimated winnings
  const calculateWinnings = () => {
    if (!marketData?.isResolved || !userPosition || !marketData.winner) {
      return { isWinner: false, shares: "0", estimatedWinnings: "0" };
    }

    const yesShares = parseFloat(userPosition.yesShares || "0");
    const noShares = parseFloat(userPosition.noShares || "0");
    
    // Winner: 1 = YES, 2 = NO
    const isYesWinner = marketData.winner === 1;
    const winningShares = isYesWinner ? yesShares : noShares;
    
    if (winningShares <= 0) {
      return { isWinner: false, shares: "0", estimatedWinnings: "0" };
    }

    // Rough estimate: user's share of the total pool
    // In practice, the contract calculates this based on total winning shares
    const totalPool = parseFloat(marketData.totalPool || "0");
    const estimatedWinnings = winningShares > 0 ? (winningShares * 2).toFixed(4) : "0";

    return {
      isWinner: true,
      shares: winningShares.toFixed(4),
      estimatedWinnings,
      outcome: isYesWinner ? "YES" : "NO",
    };
  };

  const handleClaim = async () => {
    if (!baseContractAddress) return;

    setIsClaiming(true);
    
    const result = await claimWinnings(baseContractAddress);
    
    if (result.success) {
      setHasClaimed(true);
      onClaimComplete?.();
    }
    
    setIsClaiming(false);
  };

  // Don't render if no contract
  if (!baseContractAddress) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/30 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            <span className="text-sm text-white/70">Checking winnings...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Market not resolved yet
  if (!marketData?.isResolved) {
    return null;
  }

  const winnings = calculateWinnings();

  // User already claimed
  if (hasClaimed) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-3 py-4">
            <PartyPopper className="h-8 w-8 text-emerald-400" />
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-400">Winnings Claimed!</p>
              <p className="text-xs text-white/50 font-mono">Check your wallet for ETH</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // User is a winner
  if (winnings.isWinner) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-amber-950/20 to-slate-900/90 backdrop-blur-xl border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        {/* Celebration particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 rounded-full bg-emerald-400/50 animate-float"
              style={{
                left: `${15 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 200}ms`,
                animationDuration: '3s',
              }}
            />
          ))}
        </div>
        
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <div className="absolute inset-0 rounded-lg bg-emerald-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <div>
                <span className="text-sm font-bold text-emerald-400">You Won!</span>
                <p className="text-[10px] text-white/50 font-mono">Market resolved {winnings.outcome}</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Winner
            </Badge>
          </div>

          {/* Winnings display */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-amber-500/10 border border-emerald-500/20 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Your Winning Shares</span>
              <span className="text-sm font-bold text-white/90 font-mono">{winnings.shares}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-white/40 font-mono uppercase tracking-widest">Estimated Payout</span>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-400" />
                <span className="text-lg font-bold text-emerald-400 font-mono">{winnings.estimatedWinnings} ETH</span>
              </div>
            </div>
          </div>

          {/* Claim Button */}
          {!isConnected ? (
            <p className="text-xs text-white/40 text-center font-mono">
              Connect wallet to claim winnings
            </p>
          ) : !isOnBase ? (
            <Button
              onClick={switchToBase}
              variant="outline"
              className="w-full gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
            >
              <Zap className="h-4 w-4" />
              Switch to Base Sepolia
            </Button>
          ) : (
            <Button
              onClick={handleClaim}
              disabled={isClaiming || isPending}
              className="w-full h-12 gap-2 bg-gradient-to-r from-emerald-500 to-amber-500 hover:from-emerald-600 hover:to-amber-600 text-white font-bold shadow-[0_4px_0_0_rgba(16,185,129,0.5),0_6px_20px_rgba(16,185,129,0.3)] active:shadow-[0_2px_0_0_rgba(16,185,129,0.5)] active:translate-y-[2px] transition-all"
            >
              {isClaiming || isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Trophy className="h-5 w-5" />
                  Claim {winnings.estimatedWinnings} ETH
                </>
              )}
            </Button>
          )}

          <p className="text-[10px] text-white/30 mt-3 text-center font-mono">
            ETH will be sent directly to your connected wallet
          </p>
        </CardContent>
        
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) scale(1); opacity: 0.5; }
            50% { transform: translateY(-15px) scale(1.5); opacity: 1; }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>
      </Card>
    );
  }

  // User is not a winner (has losing position or no position)
  if (marketData?.isResolved && !winnings.isWinner) {
    const hasPosition = parseFloat(userPosition?.yesShares || "0") > 0 || parseFloat(userPosition?.noShares || "0") > 0;
    
    if (!hasPosition) {
      return null; // No position to show
    }

    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-red-950/20 backdrop-blur-xl border-red-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Coins className="h-5 w-5 text-red-400/70" />
            </div>
            <div>
              <span className="text-sm font-medium text-white/70">Market Resolved</span>
              <p className="text-[10px] text-white/40 font-mono">
                Outcome: {marketData.winner === 1 ? 'YES' : 'NO'} - Your position did not win
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
