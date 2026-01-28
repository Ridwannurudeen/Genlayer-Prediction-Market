import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

// GenLayer Testnet config
export const GENLAYER_TESTNET = {
  chainId: 4221,
  chainIdHex: "0x107d",
  chainName: "GenLayer Testnet Asimov",
  rpcUrl: "https://studio.genlayer.com/api/",
  explorerUrl: "https://explorer-asimov.genlayer.com",
};

// Contract ABI for reading GenLayer intelligent contracts
const RESOLVER_ABI = [
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function resolution_source() view returns (string)",
  "function end_time() view returns (uint256)",
  "function resolved() view returns (bool)",
  "function outcome() view returns (uint8)",
  "function resolution_reasoning() view returns (string)",
  "function resolve() returns (uint8)",
  "function get_market_info() view returns (tuple(string,string,string,uint256,address,bool,uint8,string))",
];

interface GenLayerMarketInfo {
  question: string;
  description: string;
  resolutionSource: string;
  endTime: number;
  creator: string;
  resolved: boolean;
  outcome: number;
  reasoning: string;
}

interface ResolveResult {
  success: boolean;
  outcome?: number;
  reasoning?: string;
  txHash?: string;
  error?: string;
}

export const useGenLayer = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isResolving, setIsResolving] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const isOnGenLayer = chainId === GENLAYER_TESTNET.chainId;

  // Switch to GenLayer network
  const switchToGenLayer = useCallback(async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found");
      return false;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER_TESTNET.chainIdHex }],
      });
      return true;
    } catch (switchError: any) {
      // Chain not added, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: GENLAYER_TESTNET.chainIdHex,
                chainName: GENLAYER_TESTNET.chainName,
                rpcUrls: [GENLAYER_TESTNET.rpcUrl],
                blockExplorerUrls: [GENLAYER_TESTNET.explorerUrl],
              },
            ],
          });
          return true;
        } catch (addError) {
          console.error("Failed to add GenLayer network:", addError);
          toast.error("Failed to add GenLayer network");
          return false;
        }
      }
      console.error("Failed to switch to GenLayer:", switchError);
      toast.error("Failed to switch network");
      return false;
    }
  }, []);

  // Get GenLayer client
  const getClient = useCallback(() => {
    if (!address) throw new Error("Wallet not connected");

    return createClient({
      chain: testnetAsimov,
      endpoint: GENLAYER_TESTNET.rpcUrl,
    });
  }, [address]);

  // Read market info from GenLayer contract
  const readMarketInfo = useCallback(
    async (contractAddress: string): Promise<GenLayerMarketInfo | null> => {
      try {
        const client = getClient();

        const result = await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: "get_market_info",
          args: [],
        });

        // Parse the tuple result
        if (Array.isArray(result)) {
          return {
            question: result[0] as string,
            description: result[1] as string,
            resolutionSource: result[2] as string,
            endTime: Number(result[3]),
            creator: result[4] as string,
            resolved: result[5] as boolean,
            outcome: Number(result[6]),
            reasoning: result[7] as string,
          };
        }

        return null;
      } catch (error) {
        console.error("Read GenLayer market info error:", error);
        return null;
      }
    },
    [getClient]
  );

  // Check if market is resolved
  const checkResolutionStatus = useCallback(
    async (
      contractAddress: string
    ): Promise<{ resolved: boolean; outcome: number; reasoning: string } | null> => {
      try {
        const client = getClient();

        const [resolved, outcome, reasoning] = await Promise.all([
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "resolved",
            args: [],
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "outcome",
            args: [],
          }),
          client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "resolution_reasoning",
            args: [],
          }).catch(() => ""),
        ]);

        return {
          resolved: resolved as boolean,
          outcome: Number(outcome),
          reasoning: (reasoning as string) || "",
        };
      } catch (error) {
        console.error("Check resolution status error:", error);
        return null;
      }
    },
    [getClient]
  );

  // Resolve market using AI validators
  const resolveMarket = useCallback(
    async (contractAddress: string): Promise<ResolveResult> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnGenLayer) {
        toast.info("Please switch to GenLayer Testnet", {
          description: "AI resolution requires GenLayer network",
          action: {
            label: "Switch Network",
            onClick: switchToGenLayer,
          },
        });
        return { success: false, error: "Wrong network" };
      }

      setIsResolving(true);

      try {
        const client = getClient();

        toast.info("Submitting to AI validators...", {
          description: "This may take a few moments",
        });

        // Call resolve function
        const txHash = await client.writeContract({
          address: contractAddress as `0x${string}`,
          functionName: "resolve",
          args: [],
          value: BigInt(0),
        });

        toast.info("Transaction submitted", {
          description: "Waiting for validator consensus...",
          action: {
            label: "View TX",
            onClick: () =>
              window.open(
                `${GENLAYER_TESTNET.explorerUrl}/tx/${txHash}`,
                "_blank"
              ),
          },
        });

        // Wait for transaction
        const receipt = await client.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          status: "ACCEPTED",
        });

        // Get the outcome
        const status = await checkResolutionStatus(contractAddress);

        const outcomeText = status?.outcome === 1 ? "YES" : "NO";

        toast.success(`Market resolved: ${outcomeText}`, {
          description: status?.reasoning?.slice(0, 100) || "Resolution complete",
        });

        return {
          success: true,
          outcome: status?.outcome,
          reasoning: status?.reasoning,
          txHash: txHash as string,
        };
      } catch (error: any) {
        console.error("Resolve market error:", error);

        if (error?.code === 4001 || error?.message?.includes("rejected")) {
          toast.error("Transaction rejected");
          return { success: false, error: "Transaction rejected" };
        }

        toast.error("Resolution failed", {
          description: error?.message || "Unknown error",
        });

        return { success: false, error: error?.message };
      } finally {
        setIsResolving(false);
      }
    },
    [isConnected, address, isOnGenLayer, getClient, switchToGenLayer, checkResolutionStatus]
  );

  // Deploy new GenLayer contract (via GenLayer Studio)
  // Note: Actual deployment happens in GenLayer Studio, this provides the config
  const getDeploymentConfig = useCallback(
    (
      question: string,
      description: string,
      resolutionSource: string,
      durationDays: number
    ) => {
      return {
        contractCode: "PredictionMarketResolver",
        constructorArgs: {
          question,
          description,
          resolution_source: resolutionSource,
          duration_days: durationDays,
        },
        studioUrl: `https://studio.genlayer.com/contracts/deploy`,
      };
    },
    []
  );

  return {
    // State
    isOnGenLayer,
    isResolving,
    isDeploying,

    // Network
    switchToGenLayer,

    // Read
    readMarketInfo,
    checkResolutionStatus,

    // Write
    resolveMarket,

    // Deploy helper
    getDeploymentConfig,

    // Constants
    explorerUrl: GENLAYER_TESTNET.explorerUrl,
  };
};
