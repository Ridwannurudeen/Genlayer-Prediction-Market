import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

export interface TradeParams {
  marketId: string;
  contractAddress: string;
  positionType: "yes" | "no";
  shares: number;
  price: number;
}

export interface TradeResult {
  transactionHash: string;
  status: "pending" | "accepted" | "finalized" | "failed";
}

export const useGenLayerTrading = () => {
  const { address, isConnected, chainId, switchToGenLayer } = useWalletAuth();
  const [isPending, setIsPending] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  // Create GenLayer client with wallet integration
  const getClient = useCallback(() => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    // Create client using the connected wallet address
    // The SDK will use window.ethereum for signing transactions
    return createClient({
      chain: testnetAsimov,
      account: address as `0x${string}`,
    });
  }, [address]);

  // Execute a trade on the GenLayer blockchain
  const executeTrade = useCallback(
    async (params: TradeParams): Promise<TradeResult> => {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet first");
      }

      // Check if on GenLayer network
      if (chainId !== 4221) {
        toast.info("Please switch to GenLayer Testnet", {
          action: {
            label: "Switch Network",
            onClick: switchToGenLayer,
          },
        });
        throw new Error("Please switch to GenLayer Testnet");
      }

      setIsPending(true);
      setCurrentTxHash(null);

      try {
        const client = getClient();

        // Convert position type to contract format
        const outcomeIndex = params.positionType === "yes" ? 0 : 1;
        const amountInWei = BigInt(Math.floor(params.shares * params.price * 1e18));

        // Call the buy_shares function on the prediction market contract
        const transactionHash = await client.writeContract({
          address: params.contractAddress as `0x${string}`,
          functionName: "buy_shares",
          args: [outcomeIndex, params.shares],
          value: amountInWei,
        });

        setCurrentTxHash(transactionHash);

        toast.success("Transaction submitted!", {
          description: `Hash: ${transactionHash.slice(0, 10)}...`,
          action: {
            label: "View",
            onClick: () =>
              window.open(
                `https://explorer-asimov.genlayer.com/tx/${transactionHash}`,
                "_blank"
              ),
          },
        });

        // Wait for transaction to be accepted
        const receipt = await client.waitForTransactionReceipt({
          hash: transactionHash,
          status: "ACCEPTED" as any,
        });

        if (receipt) {
          toast.success("Trade confirmed!", {
            description: `Successfully bought ${params.shares} ${params.positionType.toUpperCase()} shares`,
          });

          return {
            transactionHash,
            status: "accepted",
          };
        }

        return {
          transactionHash,
          status: "pending",
        };
      } catch (error: any) {
        console.error("Trade execution error:", error);
        
        // Handle user rejection
        if (error?.code === 4001 || error?.message?.includes("rejected")) {
          toast.error("Transaction rejected", {
            description: "You rejected the transaction in your wallet",
          });
          throw new Error("Transaction rejected by user");
        }

        // Handle other errors
        toast.error("Trade failed", {
          description: error?.message || "Unknown error occurred",
        });
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, chainId, switchToGenLayer, getClient]
  );

  // Read market data from a contract
  const readMarketData = useCallback(
    async (contractAddress: string) => {
      try {
        const client = getClient();

        const [totalYes, totalNo, resolved, winner] = await Promise.all([
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_total_shares",
            args: [0], // Yes outcome
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_total_shares",
            args: [1], // No outcome
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "is_resolved",
            args: [],
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_winner",
            args: [],
          }).catch(() => null), // May not exist if not resolved
        ]);

        return {
          totalYesShares: Number(totalYes),
          totalNoShares: Number(totalNo),
          isResolved: Boolean(resolved),
          winner: winner !== null ? Number(winner) : null,
        };
      } catch (error) {
        console.error("Error reading market data:", error);
        return null;
      }
    },
    [getClient]
  );

  // Get user's position in a market
  const getUserPosition = useCallback(
    async (contractAddress: string) => {
      if (!address) return null;

      try {
        const client = getClient();

        const [yesShares, noShares] = await Promise.all([
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_user_shares",
            args: [address, 0], // Yes outcome
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_user_shares",
            args: [address, 1], // No outcome
          }),
        ]);

        return {
          yesShares: Number(yesShares),
          noShares: Number(noShares),
        };
      } catch (error) {
        console.error("Error reading user position:", error);
        return null;
      }
    },
    [address, getClient]
  );

  // Sell shares back to the market
  const sellShares = useCallback(
    async (
      contractAddress: string,
      positionType: "yes" | "no",
      shares: number
    ): Promise<TradeResult> => {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet first");
      }

      if (chainId !== 4221) {
        toast.info("Please switch to GenLayer Testnet", {
          action: {
            label: "Switch Network",
            onClick: switchToGenLayer,
          },
        });
        throw new Error("Please switch to GenLayer Testnet");
      }

      setIsPending(true);

      try {
        const client = getClient();
        const outcomeIndex = positionType === "yes" ? 0 : 1;

        const transactionHash = await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: "sell_shares",
          args: [outcomeIndex, shares],
          value: BigInt(0),
        });

        setCurrentTxHash(transactionHash);

        toast.success("Sell order submitted!", {
          description: `Hash: ${transactionHash.slice(0, 10)}...`,
        });

        await client.waitForTransactionReceipt({
          hash: transactionHash,
          status: "ACCEPTED" as any,
        });

        toast.success("Shares sold!", {
          description: `Successfully sold ${shares} ${positionType.toUpperCase()} shares`,
        });

        return {
          transactionHash,
          status: "accepted",
        };
      } catch (error: any) {
        if (error?.code === 4001) {
          toast.error("Transaction rejected");
          throw new Error("Transaction rejected by user");
        }
        toast.error("Sell failed", { description: error?.message });
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, chainId, switchToGenLayer, getClient]
  );

  // Claim winnings after market resolution
  const claimWinnings = useCallback(
    async (contractAddress: string): Promise<TradeResult> => {
      if (!isConnected || !address) {
        throw new Error("Please connect your wallet first");
      }

      setIsPending(true);

      try {
        const client = getClient();

        const transactionHash = await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: "claim_winnings",
          args: [],
          value: BigInt(0),
        });

        setCurrentTxHash(transactionHash);

        await client.waitForTransactionReceipt({
          hash: transactionHash,
          status: "ACCEPTED" as any,
        });

        toast.success("Winnings claimed!", {
          description: "Your winnings have been sent to your wallet",
        });

        return {
          transactionHash,
          status: "accepted",
        };
      } catch (error: any) {
        toast.error("Claim failed", { description: error?.message });
        throw error;
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, getClient]
  );

  return {
    executeTrade,
    sellShares,
    claimWinnings,
    readMarketData,
    getUserPosition,
    isPending,
    currentTxHash,
    isOnGenLayer: chainId === 4221,
  };
};
