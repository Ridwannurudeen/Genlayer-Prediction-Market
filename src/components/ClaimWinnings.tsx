import { useState, useEffect } from "react";
import { Trophy, Coins, Loader2, PartyPopper, ExternalLink, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMarketResolution } from "@/hooks/useMarketResolution";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ClaimWinningsProps {
  marketId: string;
  resolvedOutcome: "yes" | "no";
  onClaimed?: () => void;
}

export const ClaimWinnings = ({
  marketId,
  resolvedOutcome,
  onClaimed,
}: ClaimWinningsProps) => {
  const { address, isConnected } = useWalletAuth();
  const { claimWinnings, isClaiming, getResolutionData } = useMarketResolution();
  
  const [resolutionData, setResolutionData] = useState<any>(null);
  const [userPosition, setUserPosition] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch user's position and resolution data
  useEffect(() => {
    const fetchData = async () => {
      if (!address || !marketId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Get resolution data
        const data = await getResolutionData(marketId);
        setResolutionData(data);

        // Get user's winning position
        const { data: positions } = await supabase
          .from("positions")
          .select("*")
          .eq("market_id", marketId)
          .eq("user_id", address)
          .eq("position_type", resolvedOutcome);

        if (positions && positions.length > 0) {
          setUserPosition(positions[0]);
        }
      } catch (err) {
        console.error("Error fetching claim data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address, marketId, resolvedOutcome, getResolutionData]);

  const handleClaim = async () => {
    if (!userPosition || !address || !resolutionData) return;

    try {
      await claimWinnings({
        marketId,
        positionId: userPosition.id,
        amount: resolutionData.claimableAmount,
        userAddress: address,
      });
      
      // Refresh data
      const data = await getResolutionData(marketId);
      setResolutionData(data);
      setUserPosition({ ...userPosition, claimed: true });
      
      onClaimed?.();
    } catch (err) {
      // Error handled in hook
    }
  };

  if (isLoading) {
    return (
      <Card className="border border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
        </CardContent>
      </Card>
    );
  }

  // Not connected
  if (!isConnected || !address) {
    return null;
  }

  // User didn't participate or bet on losing side
  if (!userPosition || userPosition.shares <= 0) {
    // Check if user bet on the losing side
    if (resolutionData?.userPosition) {
      const losingShares = resolvedOutcome === "yes" 
        ? resolutionData.userPosition.noShares 
        : resolutionData.userPosition.yesShares;
      
      if (losingShares > 0) {
        return (
          <Card className="border border-rose-500/30 bg-rose-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center">
                  <XCircle className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-medium text-neutral-200">Better Luck Next Time</h3>
                  <p className="text-sm text-neutral-500">
                    Your {resolvedOutcome === "yes" ? "NO" : "YES"} position did not win
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      }
    }
    return null;
  }

  // Already claimed
  if (userPosition.claimed) {
    return (
      <Card className="border border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-emerald-400">Winnings Claimed!</h3>
              <p className="text-sm text-neutral-500">
                You received {userPosition.claimed_amount?.toFixed(4) || resolutionData?.claimableAmount?.toFixed(4)} ETH
              </p>
            </div>
            {userPosition.claim_tx_hash && (
              <a
                href={`https://sepolia.basescan.org/tx/${userPosition.claim_tx_hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Can claim winnings
  const winningAmount = resolutionData?.claimableAmount || 0;

  return (
    <Card className="border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 overflow-hidden">
      {/* Celebration effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-emerald-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      <CardContent className="relative p-5">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-yellow-500/20 flex items-center justify-center flex-shrink-0">
            <Trophy className="w-7 h-7 text-yellow-400" />
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">
              🎉 You Won!
            </h3>
            <p className="text-sm text-neutral-400 mb-4">
              Your {resolvedOutcome.toUpperCase()} position won! Claim your share of the prize pool.
            </p>

            <div className="p-3 rounded-xl bg-neutral-900/60 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-500">Your winning shares</span>
                <span className="font-semibold text-white">{userPosition.shares}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-neutral-500">Total prize pool</span>
                <span className="font-semibold text-white">
                  {resolutionData?.totalPool?.toFixed(4) || "0"} ETH
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                <span className="text-sm text-neutral-400">Your winnings</span>
                <span className="text-xl font-bold text-emerald-400">
                  {winningAmount.toFixed(4)} ETH
                </span>
              </div>
            </div>

            <Button
              onClick={handleClaim}
              disabled={isClaiming || winningAmount <= 0}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold shadow-lg shadow-emerald-900/30"
              size="lg"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <Coins className="w-5 h-5 mr-2" />
                  Claim {winningAmount.toFixed(4)} ETH
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
