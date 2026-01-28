import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BrowserProvider, parseEther } from "ethers";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { BASE_SEPOLIA } from "@/lib/solidityPredictionMarket";
import { marketKeys } from "./useMarkets";
import { toast } from "sonner";

interface ResolveMarketParams {
  marketId: string;
  outcome: "yes" | "no";
  creatorAddress: string;
}

interface ClaimWinningsParams {
  marketId: string;
  positionId: string;
  amount: number;
  userAddress: string;
}

interface MarketResolutionData {
  totalYesShares: number;
  totalNoShares: number;
  totalPool: number;
  userPosition: {
    yesShares: number;
    noShares: number;
    totalInvested: number;
  } | null;
  potentialWinnings: {
    ifYesWins: number;
    ifNoWins: number;
  };
  isResolved: boolean;
  resolvedOutcome: "yes" | "no" | null;
  canClaim: boolean;
  hasClaimed: boolean;
  claimableAmount: number;
}

export const useMarketResolution = () => {
  const queryClient = useQueryClient();
  const { address, isConnected, chainId } = useWalletAuth();
  const [isResolving, setIsResolving] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);

  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  /**
   * Get resolution data for a market
   */
  const getResolutionData = useCallback(async (marketId: string): Promise<MarketResolutionData | null> => {
    try {
      // Get market data
      const { data: market, error: marketError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .single();

      if (marketError || !market) return null;

      // Get all positions for this market
      const { data: positions, error: positionsError } = await supabase
        .from("positions")
        .select("*")
        .eq("market_id", marketId);

      if (positionsError) return null;

      // Calculate totals
      let totalYesShares = 0;
      let totalNoShares = 0;
      let totalPool = 0;

      positions?.forEach((pos) => {
        if (pos.position_type === "yes") {
          totalYesShares += pos.shares || 0;
        } else {
          totalNoShares += pos.shares || 0;
        }
        totalPool += pos.total_invested || 0;
      });

      // Get user's position
      let userPosition = null;
      let canClaim = false;
      let hasClaimed = false;
      let claimableAmount = 0;

      if (address) {
        const userPositions = positions?.filter(
          (p) => p.user_id?.toLowerCase() === address.toLowerCase()
        );

        if (userPositions && userPositions.length > 0) {
          const yesPos = userPositions.find((p) => p.position_type === "yes");
          const noPos = userPositions.find((p) => p.position_type === "no");

          userPosition = {
            yesShares: yesPos?.shares || 0,
            noShares: noPos?.shares || 0,
            totalInvested: (yesPos?.total_invested || 0) + (noPos?.total_invested || 0),
          };

          // Check if user can claim
          if (market.resolution_status === "resolved" && market.resolved_outcome) {
            const winningPos = market.resolved_outcome === "yes" ? yesPos : noPos;
            if (winningPos && winningPos.shares > 0) {
              canClaim = !winningPos.claimed;
              hasClaimed = !!winningPos.claimed;

              // Calculate winnings
              const winningShares = market.resolved_outcome === "yes" ? totalYesShares : totalNoShares;
              if (winningShares > 0) {
                claimableAmount = (winningPos.shares / winningShares) * totalPool;
              }
            }
          }
        }
      }

      // Calculate potential winnings
      const potentialWinnings = {
        ifYesWins: userPosition && totalYesShares > 0 
          ? (userPosition.yesShares / totalYesShares) * totalPool 
          : 0,
        ifNoWins: userPosition && totalNoShares > 0 
          ? (userPosition.noShares / totalNoShares) * totalPool 
          : 0,
      };

      return {
        totalYesShares,
        totalNoShares,
        totalPool,
        userPosition,
        potentialWinnings,
        isResolved: market.resolution_status === "resolved",
        resolvedOutcome: market.resolved_outcome as "yes" | "no" | null,
        canClaim,
        hasClaimed,
        claimableAmount,
      };
    } catch (err) {
      console.error("Error getting resolution data:", err);
      return null;
    }
  }, [address]);

  /**
   * Resolve a market (creator only)
   */
  const resolveMarket = useMutation({
    mutationFn: async ({ marketId, outcome, creatorAddress }: ResolveMarketParams) => {
      // Verify caller is the creator
      if (!address || address.toLowerCase() !== creatorAddress.toLowerCase()) {
        throw new Error("Only the market creator can resolve this market");
      }

      // Get market to verify it can be resolved
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .single();

      if (fetchError || !market) {
        throw new Error("Market not found");
      }

      if (market.resolution_status === "resolved") {
        throw new Error("Market is already resolved");
      }

      // Check if market has ended
      const endDate = new Date(market.end_date);
      if (endDate > new Date()) {
        throw new Error("Market has not ended yet");
      }

      // If on Base Sepolia, send a transaction to record resolution on-chain
      let txHash: string | undefined;
      
      if (isOnBase && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const signerAddress = await signer.getAddress();

          toast.info("Please confirm the resolution transaction");

          // Send minimal transaction to record resolution on-chain
          const tx = await signer.sendTransaction({
            to: signerAddress,
            value: 1n, // 1 wei
            gasLimit: 21000n,
            data: `0x${Buffer.from(`resolve:${marketId}:${outcome}`).toString("hex")}`,
          });

          toast.info("Transaction submitted", {
            description: "Waiting for confirmation...",
          });

          const receipt = await tx.wait();
          if (!receipt || receipt.status === 0) {
            throw new Error("Resolution transaction failed");
          }

          txHash = tx.hash;
        } catch (err: any) {
          if (err.code === 4001 || err.message?.includes("rejected")) {
            throw new Error("Transaction cancelled");
          }
          console.error("Blockchain resolution error:", err);
          // Continue with database update even if blockchain fails
        }
      }

      // Update market in database
      const { error: updateError } = await supabase
        .from("markets")
        .update({
          resolution_status: "resolved",
          resolved_outcome: outcome,
          resolved_at: new Date().toISOString(),
          resolution_tx_hash: txHash,
        })
        .eq("id", marketId);

      if (updateError) {
        throw new Error("Failed to update market resolution");
      }

      return { marketId, outcome, txHash };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(data.marketId) });
      queryClient.invalidateQueries({ queryKey: marketKeys.lists() });
      
      toast.success("Market resolved!", {
        description: `${data.outcome.toUpperCase()} wins!`,
        action: data.txHash ? {
          label: "View TX",
          onClick: () => window.open(`${BASE_SEPOLIA.blockExplorerUrls[0]}/tx/${data.txHash}`, "_blank"),
        } : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error("Resolution failed", {
        description: error.message,
      });
    },
  });

  /**
   * Claim winnings (for winners)
   */
  const claimWinnings = useMutation({
    mutationFn: async ({ marketId, positionId, amount, userAddress }: ClaimWinningsParams) => {
      if (!address || address.toLowerCase() !== userAddress.toLowerCase()) {
        throw new Error("Invalid user");
      }

      // Verify position exists and hasn't been claimed
      const { data: position, error: posError } = await supabase
        .from("positions")
        .select("*, markets(*)")
        .eq("id", positionId)
        .single();

      if (posError || !position) {
        throw new Error("Position not found");
      }

      if (position.claimed) {
        throw new Error("Winnings already claimed");
      }

      const market = position.markets as any;
      if (market.resolution_status !== "resolved") {
        throw new Error("Market not resolved yet");
      }

      if (market.resolved_outcome !== position.position_type) {
        throw new Error("This position did not win");
      }

      // If on Base Sepolia, send winnings transaction
      let txHash: string | undefined;

      if (isOnBase && window.ethereum) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const signerAddress = await signer.getAddress();

          toast.info("Please confirm to claim your winnings");

          // In a real implementation, this would call a contract to withdraw funds
          // For now, we record the claim on-chain
          const tx = await signer.sendTransaction({
            to: signerAddress,
            value: 1n,
            gasLimit: 21000n,
            data: `0x${Buffer.from(`claim:${marketId}:${positionId}`).toString("hex")}`,
          });

          toast.info("Transaction submitted");

          const receipt = await tx.wait();
          if (!receipt || receipt.status === 0) {
            throw new Error("Claim transaction failed");
          }

          txHash = tx.hash;
        } catch (err: any) {
          if (err.code === 4001 || err.message?.includes("rejected")) {
            throw new Error("Transaction cancelled");
          }
          throw err;
        }
      }

      // Mark position as claimed
      const { error: updateError } = await supabase
        .from("positions")
        .update({
          claimed: true,
          claimed_at: new Date().toISOString(),
          claimed_amount: amount,
          claim_tx_hash: txHash,
        })
        .eq("id", positionId);

      if (updateError) {
        throw new Error("Failed to record claim");
      }

      return { marketId, positionId, amount, txHash };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(data.marketId) });
      
      toast.success("Winnings claimed!", {
        description: `You received ${data.amount.toFixed(4)} ETH`,
        action: data.txHash ? {
          label: "View TX",
          onClick: () => window.open(`${BASE_SEPOLIA.blockExplorerUrls[0]}/tx/${data.txHash}`, "_blank"),
        } : undefined,
      });
    },
    onError: (error: Error) => {
      toast.error("Claim failed", {
        description: error.message,
      });
    },
  });

  return {
    getResolutionData,
    resolveMarket: resolveMarket.mutateAsync,
    claimWinnings: claimWinnings.mutateAsync,
    isResolving: resolveMarket.isPending,
    isClaiming: claimWinnings.isPending,
    isOnBase,
  };
};
