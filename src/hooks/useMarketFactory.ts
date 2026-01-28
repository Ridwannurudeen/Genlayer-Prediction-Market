import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseEther } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

// Factory contract address (deployed on Base Sepolia)
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7";

// Factory ABI
const FACTORY_ABI = [
  "function createMarket(string calldata _question, string calldata _description, uint256 _durationDays) external payable returns (address marketAddress, uint256 marketId)",
  "function getAllMarkets() external view returns (address[] memory)",
  "function getMarketsByCreator(address _creator) external view returns (address[] memory)",
  "function marketCount() external view returns (uint256)",
  "function creationFee() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, address indexed marketAddress, address indexed creator, string question, uint256 endTime)",
];

// Base Sepolia config
const BASE_SEPOLIA = {
  chainId: 84532,
  blockExplorer: "https://sepolia.basescan.org",
};

interface DeployMarketResult {
  success: boolean;
  contractAddress?: string;
  marketId?: number;
  txHash?: string;
  error?: string;
}

export const useMarketFactory = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnBase = chainId === BASE_SEPOLIA.chainId;

  /**
   * Deploy a new prediction market contract via the Factory
   */
  const deployMarket = useCallback(
    async (
      question: string,
      description: string,
      durationDays: number
    ): Promise<DeployMarketResult> => {
      // Validation
      if (!isConnected || !address) {
        toast.error("Please connect your wallet");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia network", {
          action: {
            label: "Switch Network",
            onClick: async () => {
              try {
                await window.ethereum?.request({
                  method: "wallet_switchEthereumChain",
                  params: [{ chainId: "0x14a34" }],
                });
              } catch (e) {
                console.error("Failed to switch network:", e);
              }
            },
          },
        });
        return { success: false, error: "Wrong network" };
      }

      if (!window.ethereum) {
        toast.error("MetaMask not found");
        return { success: false, error: "MetaMask not found" };
      }

      if (!question.trim()) {
        toast.error("Please enter a market question");
        return { success: false, error: "Empty question" };
      }

      if (durationDays < 1 || durationDays > 365) {
        toast.error("Duration must be between 1 and 365 days");
        return { success: false, error: "Invalid duration" };
      }

      setIsDeploying(true);
      setError(null);

      try {
        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

        // Check creation fee (should be 0 for testnet)
        const creationFee = await factory.creationFee();
        console.log("Creation fee:", creationFee.toString());

        toast.info("Please confirm in your wallet", {
          description: "Deploying your market contract on Base Sepolia",
        });

        // Call createMarket on the factory
        const tx = await factory.createMarket(
          question,
          description || "No description provided",
          durationDays,
          { 
            value: creationFee,
            gasLimit: 3000000n, // Higher gas limit for contract deployment
          }
        );

        console.log("Transaction sent:", tx.hash);

        toast.loading("Deploying contract...", {
          description: "This may take 10-30 seconds",
        });

        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error("Contract deployment failed");
        }

        // Parse the MarketCreated event to get the contract address
        let contractAddress: string | undefined;
        let marketId: number | undefined;

        for (const log of receipt.logs) {
          try {
            const parsed = factory.interface.parseLog({
              topics: log.topics as string[],
              data: log.data,
            });
            
            if (parsed?.name === "MarketCreated") {
              marketId = Number(parsed.args[0]);
              contractAddress = parsed.args[1];
              console.log("✅ Market deployed!");
              console.log("   Market ID:", marketId);
              console.log("   Contract:", contractAddress);
              break;
            }
          } catch (e) {
            // Not the event we're looking for
          }
        }

        if (!contractAddress) {
          // Fallback: try to get from return value or logs
          console.warn("Could not parse MarketCreated event, checking logs...");
          
          // The contract address might be in the last log
          if (receipt.logs.length > 0) {
            const lastLog = receipt.logs[receipt.logs.length - 1];
            if (lastLog.address && lastLog.address !== FACTORY_ADDRESS) {
              contractAddress = lastLog.address;
            }
          }
        }

        toast.dismiss();
        toast.success("Market contract deployed! 🎉", {
          description: contractAddress 
            ? `Contract: ${contractAddress.slice(0, 10)}...${contractAddress.slice(-8)}`
            : "Check BaseScan for details",
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorer}/tx/${tx.hash}`, "_blank"),
          },
        });

        return {
          success: true,
          contractAddress,
          marketId,
          txHash: tx.hash,
        };
      } catch (err: any) {
        console.error("Deploy market error:", err);
        
        const errorMessage = err?.message || "Unknown error";
        const errorCode = err?.code;

        toast.dismiss();

        // User rejected
        if (errorCode === 4001 || errorCode === "ACTION_REJECTED" || 
            errorMessage.includes("rejected") || errorMessage.includes("denied")) {
          setError("Transaction cancelled");
          toast.error("Transaction cancelled by user");
          return { success: false, error: "Cancelled" };
        }

        // Insufficient funds
        if (errorMessage.includes("insufficient funds") || errorMessage.includes("INSUFFICIENT_FUNDS")) {
          setError("Insufficient funds");
          toast.error("Insufficient funds", {
            description: "You need Base Sepolia ETH to deploy",
            action: {
              label: "Get Free ETH",
              onClick: () => window.open("https://www.alchemy.com/faucets/base-sepolia", "_blank"),
            },
          });
          return { success: false, error: "Insufficient funds" };
        }

        setError(errorMessage);
        toast.error("Deployment failed", { description: errorMessage.slice(0, 100) });
        return { success: false, error: errorMessage };
      } finally {
        setIsDeploying(false);
      }
    },
    [isConnected, address, isOnBase]
  );

  /**
   * Get all markets deployed via the factory
   */
  const getAllFactoryMarkets = useCallback(async (): Promise<string[]> => {
    try {
      if (!window.ethereum) return [];
      
      const provider = new BrowserProvider(window.ethereum);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      
      const markets = await factory.getAllMarkets();
      return markets as string[];
    } catch (err) {
      console.error("Error getting factory markets:", err);
      return [];
    }
  }, []);

  /**
   * Get markets created by a specific address
   */
  const getMarketsByCreator = useCallback(async (creator: string): Promise<string[]> => {
    try {
      if (!window.ethereum) return [];
      
      const provider = new BrowserProvider(window.ethereum);
      const factory = new Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);
      
      const markets = await factory.getMarketsByCreator(creator);
      return markets as string[];
    } catch (err) {
      console.error("Error getting creator markets:", err);
      return [];
    }
  }, []);

  return {
    deployMarket,
    getAllFactoryMarkets,
    getMarketsByCreator,
    isDeploying,
    error,
    isOnBase,
    factoryAddress: FACTORY_ADDRESS,
  };
};
