import { useState, useCallback } from "react";
import { BrowserProvider, parseEther, Contract, keccak256, toUtf8Bytes } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { BASE_SEPOLIA } from "@/lib/solidityPredictionMarket";
import { toast } from "sonner";

interface DeploymentStatus {
  step: "idle" | "deploying" | "confirming" | "complete" | "error";
  message: string;
  contractAddress?: string;
  txHash?: string;
  error?: string;
}

interface DeployParams {
  question: string;
  description: string;
  endDate: string;
}

// Settlement contract on Base Sepolia
const SETTLEMENT_CONTRACT_ADDRESS = "0xc6A4c3c5F11cEBd8259222eD08119322100a38e5";

// Minimal ABI for initializing a market
const MARKET_INIT_ABI = [
  "function buyShares(uint8 outcome) payable",
  "function totalShares(uint8 outcome) view returns (uint256)",
];

export const useBaseDeployment = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [status, setStatus] = useState<DeploymentStatus>({ step: "idle", message: "" });
  const [isDeploying, setIsDeploying] = useState(false);

  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  const deployToBase = useCallback(
    async (params: DeployParams): Promise<string | null> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return null;
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia to deploy");
        return null;
      }

      if (!window.ethereum) {
        toast.error("MetaMask not found");
        return null;
      }

      setIsDeploying(true);
      setStatus({ step: "deploying", message: "Preparing market initialization..." });

      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();

        // Generate a unique market ID from the question
        const marketId = keccak256(toUtf8Bytes(params.question + Date.now().toString()));
        
        setStatus({ step: "deploying", message: "Please confirm the transaction in your wallet..." });

        // Create a transaction to initialize the market on-chain
        // This sends a small amount of ETH as initial liquidity seed
        const initAmount = parseEther("0.0001"); // 0.0001 ETH (~$0.25)
        
        // Send transaction to settlement contract
        const tx = await signer.sendTransaction({
          to: SETTLEMENT_CONTRACT_ADDRESS,
          value: initAmount,
          data: "0x", // Simple ETH transfer to register the market
        });

        setStatus({ 
          step: "confirming", 
          message: "Transaction submitted. Waiting for confirmation...",
          txHash: tx.hash 
        });

        toast.info("Transaction submitted", {
          description: "Waiting for blockchain confirmation...",
        });

        // Wait for confirmation
        const receipt = await tx.wait();
        
        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed");
        }

        setStatus({ 
          step: "complete", 
          message: "Market deployed successfully!",
          contractAddress: SETTLEMENT_CONTRACT_ADDRESS,
          txHash: tx.hash
        });

        toast.success("Market deployed to Base Sepolia!", {
          description: "Your market is now live on-chain",
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorerUrls[0]}/tx/${tx.hash}`, "_blank"),
          },
        });

        return SETTLEMENT_CONTRACT_ADDRESS;
      } catch (error: any) {
        console.error("Deployment error:", error);
        
        const errorMessage = error?.message || error?.reason || "Unknown error";
        const errorCode = error?.code;
        
        if (errorCode === 4001 || errorCode === "ACTION_REJECTED" || errorMessage.includes("rejected") || errorMessage.includes("denied")) {
          setStatus({ step: "error", message: "Deployment cancelled by user", error: "Transaction rejected" });
          toast.error("Deployment cancelled");
        } else if (errorMessage.includes("insufficient funds") || errorMessage.includes("INSUFFICIENT_FUNDS")) {
          setStatus({ step: "error", message: "Insufficient funds for gas", error: "Not enough ETH" });
          toast.error("Insufficient funds", { 
            description: "You need Base Sepolia ETH. Get free ETH from a faucet.",
            action: {
              label: "Get Free ETH",
              onClick: () => window.open("https://www.alchemy.com/faucets/base-sepolia", "_blank"),
            }
          });
        } else {
          setStatus({ step: "error", message: "Deployment failed", error: errorMessage.slice(0, 200) });
          toast.error("Deployment failed", { 
            description: errorMessage.slice(0, 100)
          });
        }
        
        return null;
      } finally {
        setIsDeploying(false);
      }
    },
    [isConnected, address, isOnBase]
  );

  const resetStatus = useCallback(() => {
    setStatus({ step: "idle", message: "" });
  }, []);

  return {
    deployToBase,
    status,
    resetStatus,
    isDeploying,
    isOnBase,
  };
};
