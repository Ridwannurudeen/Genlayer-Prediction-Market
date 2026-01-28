import { useState, useCallback } from "react";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { useContractDeployment } from "@/hooks/useContractDeployment";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { toast } from "sonner";

// Factory contract on Base Sepolia
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7";

const FACTORY_ABI = [
  "function createMarket(string calldata _question, string calldata _description, uint256 _durationDays) external payable returns (address marketAddress, uint256 marketId)",
  "event MarketCreated(uint256 indexed marketId, address indexed marketAddress, address indexed creator, string question, uint256 endTime)",
];

const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: "0x14a34",
};

const GENLAYER = {
  chainId: 4221,
  chainIdHex: "0x107d",
};

export interface HybridDeploymentResult {
  baseContractAddress?: string;
  baseTxHash?: string;
  genLayerContractAddress?: string;
  genLayerTxHash?: string;
  success: boolean;
  error?: string;
}

export interface DeploymentStep {
  network: "base" | "genlayer" | "idle" | "done";
  status: "pending" | "deploying" | "success" | "error" | "skipped";
  message: string;
  txHash?: string;
  contractAddress?: string;
}

export const useHybridDeployment = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const { deployPredictionMarket: deployToGenLayer } = useContractDeployment();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [baseStep, setBaseStep] = useState<DeploymentStep>({
    network: "base",
    status: "pending",
    message: "Waiting...",
  });
  const [genLayerStep, setGenLayerStep] = useState<DeploymentStep>({
    network: "genlayer",
    status: "pending",
    message: "Waiting...",
  });

  const isOnBase = chainId === BASE_SEPOLIA.chainId;
  const isOnGenLayer = chainId === GENLAYER.chainId;

  // Switch to Base Sepolia
  const switchToBase = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainIdHex }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: BASE_SEPOLIA.chainIdHex,
            chainName: "Base Sepolia",
            rpcUrls: ["https://sepolia.base.org"],
            blockExplorerUrls: ["https://sepolia.basescan.org"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
          }],
        });
        return true;
      }
      return false;
    }
  }, []);

  // Switch to GenLayer
  const switchToGenLayer = useCallback(async () => {
    if (!window.ethereum) return false;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER.chainIdHex }],
      });
      return true;
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: GENLAYER.chainIdHex,
            chainName: "GenLayer Testnet",
            rpcUrls: ["https://studio.genlayer.com/api/"],
            blockExplorerUrls: ["https://explorer-asimov.genlayer.com"],
          }],
        });
        return true;
      }
      return false;
    }
  }, []);

  // Deploy to Base Sepolia
  const deployToBase = useCallback(async (
    question: string,
    description: string,
    durationDays: number
  ): Promise<{ contractAddress?: string; txHash?: string; success: boolean }> => {
    if (!window.ethereum || !address) {
      return { success: false };
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

      console.log("=== BASE DEPLOYMENT ===");
      console.log("Factory:", FACTORY_ADDRESS);
      console.log("Question:", question);
      console.log("Duration:", durationDays, "days");

      const tx = await factory.createMarket(question, description, durationDays);
      console.log("TX Hash:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("Receipt logs:", receipt.logs.length);

      // Parse MarketCreated event - try multiple possible argument names
      let contractAddress: string | undefined;
      
      for (const log of receipt.logs) {
        try {
          const parsed = factory.interface.parseLog(log);
          console.log("Parsed event:", parsed?.name, parsed?.args);
          
          if (parsed?.name === "MarketCreated") {
            // Try different possible arg names
            contractAddress = parsed.args.marketAddress 
              || parsed.args.market 
              || parsed.args.newMarket
              || parsed.args[0]; // First indexed arg is often the address
            
            console.log("Found MarketCreated event, address:", contractAddress);
            break;
          }
        } catch (e) {
          // Try to decode as raw address from topics
          if (log.topics && log.topics.length > 1) {
            // Topic[0] is event signature, Topic[1] might be indexed address
            const possibleAddress = "0x" + log.topics[1]?.slice(-40);
            if (possibleAddress && possibleAddress.length === 42) {
              console.log("Possible address from topic:", possibleAddress);
              // Verify it's a contract
              const code = await provider.getCode(possibleAddress);
              if (code !== "0x" && code.length > 2) {
                contractAddress = possibleAddress;
                console.log("Verified contract from topic:", contractAddress);
                break;
              }
            }
          }
        }
      }

      // Fallback: If no event found, try to get from transaction trace
      if (!contractAddress) {
        console.log("No event found, checking receipt...");
        // Sometimes the contract address is in the logs data
        for (const log of receipt.logs) {
          if (log.address && log.address !== FACTORY_ADDRESS) {
            const code = await provider.getCode(log.address);
            if (code !== "0x" && code.length > 2) {
              contractAddress = log.address;
              console.log("Found contract from log address:", contractAddress);
              break;
            }
          }
        }
      }

      console.log("Final contract address:", contractAddress);

      return {
        contractAddress,
        txHash: tx.hash,
        success: true,
      };
    } catch (error: any) {
      console.error("Base deployment error:", error);
      return { success: false };
    }
  }, [address]);

  // Deploy to both networks
  const deployHybrid = useCallback(async (params: {
    question: string;
    description: string;
    category: string;
    endDate: Date;
    resolutionSource: string;
    deployBase: boolean;
    deployGenLayer: boolean;
  }): Promise<HybridDeploymentResult> => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet");
      return { success: false, error: "Wallet not connected" };
    }

    setIsDeploying(true);
    
    const result: HybridDeploymentResult = { success: true };
    const durationDays = Math.max(1, Math.ceil((params.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

    // Step 1: Deploy to Base Sepolia (for trading)
    if (params.deployBase) {
      setBaseStep({
        network: "base",
        status: "deploying",
        message: "Switching to Base Sepolia...",
      });

      // Switch network if needed
      if (!isOnBase) {
        const switched = await switchToBase();
        if (!switched) {
          setBaseStep({
            network: "base",
            status: "error",
            message: "Failed to switch to Base Sepolia",
          });
          setIsDeploying(false);
          return { success: false, error: "Failed to switch to Base Sepolia" };
        }
        // Wait for network switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setBaseStep({
        network: "base",
        status: "deploying",
        message: "Deploying trading contract...",
      });

      toast.info("Deploying to Base Sepolia...", {
        description: "Please confirm in MetaMask",
      });

      const baseResult = await deployToBase(
        params.question,
        params.description,
        durationDays
      );

      if (baseResult.success && baseResult.contractAddress) {
        result.baseContractAddress = baseResult.contractAddress;
        result.baseTxHash = baseResult.txHash;
        setBaseStep({
          network: "base",
          status: "success",
          message: "Trading contract deployed!",
          txHash: baseResult.txHash,
          contractAddress: baseResult.contractAddress,
        });
        toast.success("Base Sepolia contract deployed!");
      } else {
        setBaseStep({
          network: "base",
          status: "error",
          message: "Deployment failed",
        });
        result.success = false;
        result.error = "Base deployment failed";
      }
    } else {
      setBaseStep({
        network: "base",
        status: "skipped",
        message: "Skipped",
      });
    }

    // Step 2: Deploy to GenLayer (for AI resolution)
    if (params.deployGenLayer) {
      setGenLayerStep({
        network: "genlayer",
        status: "deploying",
        message: "Switching to GenLayer...",
      });

      // Switch network if needed
      const currentChainId = await window.ethereum?.request({ method: "eth_chainId" });
      if (parseInt(currentChainId, 16) !== GENLAYER.chainId) {
        const switched = await switchToGenLayer();
        if (!switched) {
          setGenLayerStep({
            network: "genlayer",
            status: "error",
            message: "Failed to switch to GenLayer",
          });
          setIsDeploying(false);
          return result;
        }
        // Wait for network switch
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setGenLayerStep({
        network: "genlayer",
        status: "deploying",
        message: "Deploying AI resolution contract...",
      });

      toast.info("Deploying to GenLayer...", {
        description: "Please confirm in MetaMask",
      });

      const genLayerTxHash = await deployToGenLayer({
        question: params.question,
        description: params.description,
        endDate: params.endDate.toISOString(),
        resolutionSource: params.resolutionSource,
      });

      if (genLayerTxHash) {
        result.genLayerTxHash = genLayerTxHash;
        // Note: Contract address comes from transaction receipt, 
        // but GenLayer SDK has issues getting it immediately
        setGenLayerStep({
          network: "genlayer",
          status: "success",
          message: "AI resolution contract submitted!",
          txHash: genLayerTxHash,
        });
        toast.success("GenLayer contract submitted!");
      } else {
        setGenLayerStep({
          network: "genlayer",
          status: "error",
          message: "Deployment failed",
        });
      }
    } else {
      setGenLayerStep({
        network: "genlayer",
        status: "skipped",
        message: "Skipped",
      });
    }

    setIsDeploying(false);
    return result;
  }, [isConnected, address, isOnBase, switchToBase, switchToGenLayer, deployToBase, deployToGenLayer]);

  const resetSteps = useCallback(() => {
    setBaseStep({ network: "base", status: "pending", message: "Waiting..." });
    setGenLayerStep({ network: "genlayer", status: "pending", message: "Waiting..." });
  }, []);

  return {
    deployHybrid,
    isDeploying,
    baseStep,
    genLayerStep,
    resetSteps,
    isOnBase,
    isOnGenLayer,
    switchToBase,
    switchToGenLayer,
  };
};
