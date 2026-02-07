import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

// GenLayer Testnet config
export const GENLAYER_TESTNET = {
  chainId: 4221,
  chainIdHex: "0x107d",
  chainName: "GenLayer Asimov Testnet",
  rpcUrl: "https://genlayer-testnet.rpc.caldera.xyz/http",
  explorerUrl: "https://explorer-asimov.genlayer.com",
};

interface GenLayerMarketInfo {
  question: string;
  description: string;
  endDate: string;
  creator: string;
  resolved: boolean;
  outcome: number;
  reasoning: string;
  confidence: number;
  resolutionSources: string[];
}

interface ResolveResult {
  success: boolean;
  resolved?: boolean;
  outcome?: number;
  reasoning?: string;
  txHash?: string;
  error?: string;
}

const parseGenLayerStatus = (status: unknown) => {
  if (!status || typeof status !== "object") return null;

  const obj = status as Record<string, unknown>;
  const resolvedRaw = obj.has_resolved ?? obj.resolved ?? obj.is_resolved;
  const outcomeRaw = obj.outcome ?? -1;
  const reasoningRaw = obj.resolution_reasoning ?? obj.reasoning ?? "";
  const sourcesRaw = obj.resolution_sources ?? [];

  return {
    resolved: Boolean(resolvedRaw),
    outcome: Number(outcomeRaw),
    reasoning: String(reasoningRaw || ""),
    question: String(obj.question ?? ""),
    description: String(obj.description ?? ""),
    endDate: String(obj.end_date ?? ""),
    creator: String(obj.creator ?? ""),
    confidence: Number(obj.confidence ?? 0),
    resolutionSources: Array.isArray(sourcesRaw) ? sourcesRaw.map(String) : [],
  };
};

export const useGenLayer = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isResolving, setIsResolving] = useState(false);
  const [isDeploying, _setIsDeploying] = useState(false);

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
    } catch (switchError: unknown) {
      // Chain not added, add it
      const err = switchError as { code?: number };
      if (err.code === 4902) {
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
    return createClient({
      chain: testnetAsimov,
      endpoint: GENLAYER_TESTNET.rpcUrl,
      ...(address ? { account: address as `0x${string}` } : {}),
    });
  }, [address]);

  const getJsonRpcAccount = useCallback(() => {
    if (!address) return undefined;
    return { address: address as `0x${string}`, type: "json-rpc" as const };
  }, [address]);


  // Read market info from GenLayer contract
  const readMarketInfo = useCallback(
    async (contractAddress: string): Promise<GenLayerMarketInfo | null> => {
      try {
        const client = getClient();

        try {
          const result = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_status",
            args: [],
            jsonSafeReturn: true,
          });

          const parsed = parseGenLayerStatus(result);
          if (parsed) {
            return {
              question: parsed.question,
              description: parsed.description,
              endDate: parsed.endDate,
              creator: parsed.creator,
              resolved: parsed.resolved,
              outcome: parsed.outcome,
              reasoning: parsed.reasoning,
              confidence: parsed.confidence,
              resolutionSources: parsed.resolutionSources,
            };
          }
        } catch {
          // Fallback to older contract interface
        }

        const legacyResult = await client.readContract({
          address: contractAddress as `0x${string}`,
          functionName: "get_market_info",
          args: [],
        });

        if (Array.isArray(legacyResult)) {
          return {
            question: legacyResult[0] as string,
            description: legacyResult[1] as string,
            endDate: String(legacyResult[3] ?? ""),
            creator: String(legacyResult[4] ?? ""),
            resolved: Boolean(legacyResult[5]),
            outcome: Number(legacyResult[6]),
            reasoning: String(legacyResult[7] ?? ""),
            confidence: 0,
            resolutionSources: [],
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

        try {
          const status = await client.readContract({
            address: contractAddress as `0x${string}`,
            functionName: "get_status",
            args: [],
            jsonSafeReturn: true,
          });

          const parsed = parseGenLayerStatus(status);
          if (parsed) {
            return {
              resolved: parsed.resolved,
              outcome: parsed.outcome,
              reasoning: parsed.reasoning,
            };
          }
        } catch {
          // Fallback to older contract interface
        }

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
        const account = getJsonRpcAccount();

        if (!account) {
          toast.error("Wallet not connected");
          return { success: false, error: "Wallet not connected" };
        }

        toast.info("Submitting to AI validators...", {
          description: "This may take a few moments",
        });

        // Call resolve function
        const txHash = await client.writeContract({
          account,
          address: contractAddress as `0x${string}`,
          functionName: "resolve",
          args: [],
          value: 0n,
        });

        toast.info("Resolution submitted to validators", {
          description: "Finality can take a few minutes. You can refresh to see the final outcome.",
          action: {
            label: "View TX",
            onClick: () =>
              window.open(
                `${GENLAYER_TESTNET.explorerUrl}/tx/${txHash}`,
                "_blank"
              ),
          },
        });

        // Wait for transaction acceptance
        await client.waitForTransactionReceipt({
          hash: txHash as `0x${string}`,
          status: TransactionStatus.ACCEPTED,
        });

        // Get the outcome
        const status = await checkResolutionStatus(contractAddress);

        if (!status?.resolved) {
          return {
            success: true,
            resolved: false,
            outcome: status?.outcome,
            reasoning: status?.reasoning,
            txHash: txHash as string,
          };
        }

        const outcomeText = status.outcome === 1 ? "YES" : "NO";

        toast.success(`Market resolved: ${outcomeText}`, {
          description: status.reasoning?.slice(0, 100) || "Resolution complete",
        });

        return {
          success: true,
          resolved: true,
          outcome: status.outcome,
          reasoning: status.reasoning,
          txHash: txHash as string,
        };
      } catch (error: unknown) {
        console.error("Resolve market error:", error);
        const err = error as { code?: number | string; message?: string };

        if (err?.code === 4001 || err?.message?.includes("rejected")) {
          toast.error("Transaction rejected");
          return { success: false, error: "Transaction rejected" };
        }

        toast.error("Resolution failed", {
          description: err?.message || "Unknown error",
        });

        return { success: false, error: err?.message };
      } finally {
        setIsResolving(false);
      }
    },
    [isConnected, address, isOnGenLayer, getClient, getJsonRpcAccount, switchToGenLayer, checkResolutionStatus]
  );

  // Deploy new GenLayer contract (via GenLayer Studio)
  // Note: Actual deployment happens in GenLayer Studio, this provides the config
  const getDeploymentConfig = useCallback(
    (
      question: string,
      description: string,
      resolutionSource: string,
      endDate: string
    ) => {
      return {
        contractCode: "PredictionMarket",
        constructorArgs: {
          question,
          description,
          end_date: endDate,
          resolution_sources: [resolutionSource],
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
