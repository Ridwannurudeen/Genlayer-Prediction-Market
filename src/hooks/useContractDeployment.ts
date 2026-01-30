import { useState, useCallback } from "react";
import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { generatePredictionMarketContract, getContractConstructorArgs, ContractParams } from "@/lib/contractGenerator";
import { toast } from "sonner";

export interface DeploymentStatus {
  step: "idle" | "generating" | "deploying" | "waiting" | "success" | "error";
  message: string;
  transactionHash?: string;
  contractAddress?: string;
  error?: string;
}

export const useContractDeployment = () => {
  const { address, isConnected, chainId, switchToGenLayer } = useWalletAuth();
  const [status, setStatus] = useState<DeploymentStatus>({
    step: "idle",
    message: "",
  });

  const getClient = useCallback(() => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    return createClient({
      chain: testnetAsimov,
      account: address as `0x${string}`,
    });
  }, [address]);

  const deployPredictionMarket = useCallback(
    async (params: ContractParams): Promise<string | null> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return null;
      }

      // Check current network directly from wallet (not React state which may be stale)
      try {
        const currentChainId = await window.ethereum?.request({ method: "eth_chainId" });
        const currentChainIdNum = parseInt(currentChainId, 16);
        
        console.log("GenLayer deployment - Current chainId:", currentChainIdNum, "Expected: 4221");
        
        if (currentChainIdNum !== 4221) {
          toast.info("Please switch to GenLayer Testnet", {
            action: {
              label: "Switch Network",
              onClick: switchToGenLayer,
            },
          });
          return null;
        }
      } catch (e) {
        console.error("Could not check chainId:", e);
      }

      try {
        // Step 1: Generate contract code
        setStatus({
          step: "generating",
          message: "Generating Intelligent Contract code...",
        });

        const contractCode = generatePredictionMarketContract(params);
        const constructorArgs = getContractConstructorArgs(params);
        
        console.log("=== GENLAYER DEPLOYMENT ===");
        console.log("Question:", params.question);
        console.log("Resolution source:", params.resolutionSource);

        // Step 2: Deploy contract
        setStatus({
          step: "deploying",
          message: "Deploying to GenLayer Testnet...",
        });

        const client = getClient();

        // Use the genlayer-js SDK to deploy the contract
        const transactionHash = await client.deployContract({
          code: contractCode,
          args: constructorArgs,
          leaderOnly: false,
        });

        const txHashStr = String(transactionHash);
        console.log("GenLayer TX Hash:", txHashStr);

        // Mark as success immediately after deployment submission
        setStatus({
          step: "success",
          message: "Contract deployment submitted to GenLayer!",
          transactionHash: txHashStr,
        });

        toast.success("Intelligent Contract deployment submitted!", {
          description: "Your contract is being processed by validators",
          duration: 10000,
          action: {
            label: "View on Explorer",
            onClick: () =>
              window.open(
                `https://explorer-asimov.genlayer.com/tx/${txHashStr}`,
                "_blank"
              ),
          },
        });

        return txHashStr;
      } catch (error: any) {
        console.error("GenLayer deployment error:", error);

        // Handle user rejection
        if (error?.code === 4001 || error?.message?.includes("rejected")) {
          setStatus({
            step: "error",
            message: "Transaction rejected by user",
            error: "You rejected the transaction in your wallet",
          });
          toast.error("Deployment cancelled");
          return null;
        }

        setStatus({
          step: "error",
          message: "Deployment failed",
          error: error?.message || "Unknown error occurred",
        });

        toast.error("GenLayer deployment failed", {
          description: error?.message || "Unknown error occurred",
        });

        return null;
      }
    },
    [isConnected, address, switchToGenLayer, getClient]
  );

  const resetStatus = useCallback(() => {
    setStatus({
      step: "idle",
      message: "",
    });
  }, []);

  return {
    deployPredictionMarket,
    status,
    resetStatus,
    isDeploying: status.step !== "idle" && status.step !== "success" && status.step !== "error",
  };
};
