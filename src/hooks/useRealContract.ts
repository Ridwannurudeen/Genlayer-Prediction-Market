import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

// Contract ABIs (minimal for what we need)
const PREDICTION_MARKET_ABI = [
  "function buyYes() external payable",
  "function buyNo() external payable",
  "function buyShares(bool _isYes) external payable",
  "function resolve(bool _yesWins) external",
  "function claimWinnings() external",
  "function getClaimableAmount(address _user) external view returns (uint256)",
  "function getUserPosition(address _user) external view returns (uint256 _yesShares, uint256 _noShares, uint256 _totalInvested)",
  "function getMarketInfo() external view returns (string memory _question, string memory _description, uint256 _endTime, bool _isResolved, bool _winningOutcome, uint256 _totalYesShares, uint256 _totalNoShares, uint256 _totalPool)",
  "function getProbability() external view returns (uint256)",
  "function isMarketOpen() external view returns (bool)",
  "function creator() external view returns (address)",
  "function totalPool() external view returns (uint256)",
  "function totalYesShares() external view returns (uint256)",
  "function totalNoShares() external view returns (uint256)",
  "function isResolved() external view returns (bool)",
  "function winningOutcome() external view returns (bool)",
  "event SharesPurchased(address indexed buyer, bool isYes, uint256 shares, uint256 amount, uint256 timestamp)",
  "event MarketResolved(bool winningOutcome, uint256 totalPool, uint256 timestamp)",
  "event WinningsClaimed(address indexed user, uint256 amount, uint256 timestamp)",
];

const FACTORY_ABI = [
  "function createMarket(string calldata _question, string calldata _description, uint256 _durationDays) external payable returns (address marketAddress, uint256 marketId)",
  "function getAllMarkets() external view returns (address[] memory)",
  "function getMarketsByCreator(address _creator) external view returns (address[] memory)",
  "function getMarketInfo(uint256 _marketId) external view returns (address marketAddress, string memory question, uint256 endTime, bool isResolved, uint256 totalPool)",
  "function marketCount() external view returns (uint256)",
  "function creationFee() external view returns (uint256)",
  "event MarketCreated(uint256 indexed marketId, address indexed marketAddress, address indexed creator, string question, uint256 endTime)",
];

// Base Sepolia configuration
const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdHex: "0x14a34",
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
};

// Factory contract address (UPDATE AFTER DEPLOYMENT)
const FACTORY_ADDRESS = import.meta.env.VITE_FACTORY_ADDRESS || "";

interface MarketInfo {
  question: string;
  description: string;
  endTime: number;
  isResolved: boolean;
  winningOutcome: boolean;
  totalYesShares: string;
  totalNoShares: string;
  totalPool: string;
  probability: number;
  isOpen: boolean;
  creator: string;
}

interface UserPosition {
  yesShares: string;
  noShares: string;
  totalInvested: string;
  claimableAmount: string;
}

interface TradeResult {
  success: boolean;
  txHash?: string;
  shares?: number;
  error?: string;
}

export const useRealContract = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOnBase = chainId === BASE_SEPOLIA.chainId;

  // Get contract instance
  const getContract = useCallback(async (contractAddress: string) => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(contractAddress, PREDICTION_MARKET_ABI, signer);
  }, []);

  // Get factory contract instance
  const getFactoryContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    if (!FACTORY_ADDRESS) throw new Error("Factory address not configured");
    
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
  }, []);

  // Create a new market on-chain
  const createMarketOnChain = useCallback(
    async (question: string, description: string, durationDays: number): Promise<{
      success: boolean;
      marketAddress?: string;
      marketId?: number;
      txHash?: string;
      error?: string;
    }> => {
      if (!isConnected || !address) {
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        return { success: false, error: "Please switch to Base Sepolia" };
      }

      if (!FACTORY_ADDRESS) {
        return { success: false, error: "Factory contract not deployed" };
      }

      setIsPending(true);
      setError(null);

      try {
        const factory = await getFactoryContract();
        
        toast.info("Please confirm the transaction", {
          description: "Creating market on Base Sepolia",
        });

        const tx = await factory.createMarket(question, description, durationDays);
        
        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        const receipt = await tx.wait();
        
        // Parse the MarketCreated event
        const event = receipt.logs.find((log: any) => {
          try {
            const parsed = factory.interface.parseLog(log);
            return parsed?.name === "MarketCreated";
          } catch {
            return false;
          }
        });

        let marketAddress: string | undefined;
        let marketId: number | undefined;

        if (event) {
          const parsed = factory.interface.parseLog(event);
          marketId = Number(parsed?.args[0]);
          marketAddress = parsed?.args[1];
        }

        toast.success("Market created on-chain!", {
          description: `Contract: ${marketAddress?.slice(0, 10)}...`,
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorer}/tx/${tx.hash}`, "_blank"),
          },
        });

        return {
          success: true,
          marketAddress,
          marketId,
          txHash: tx.hash,
        };
      } catch (err: any) {
        const errorMessage = err?.message || "Unknown error";
        
        if (err.code === 4001 || errorMessage.includes("rejected")) {
          setError("Transaction cancelled");
          return { success: false, error: "Cancelled by user" };
        }

        setError(errorMessage);
        toast.error("Failed to create market", { description: errorMessage.slice(0, 100) });
        return { success: false, error: errorMessage };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getFactoryContract]
  );

  // Buy shares on a market
  const buySharesOnChain = useCallback(
    async (
      contractAddress: string,
      isYes: boolean,
      amountEth: number
    ): Promise<TradeResult> => {
      if (!isConnected || !address) {
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        return { success: false, error: "Please switch to Base Sepolia" };
      }

      setIsPending(true);
      setError(null);

      try {
        const contract = await getContract(contractAddress);
        const value = parseEther(amountEth.toString());
        const outcome = isYes ? "YES" : "NO";

        toast.info("Please confirm the transaction", {
          description: `Buying ${outcome} shares for ${amountEth} ETH`,
        });

        const tx = await contract.buyShares(isYes, { value });
        
        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed");
        }

        // Calculate shares (1 share = 0.001 ETH)
        const shares = Math.floor(amountEth * 1000);

        toast.success("Trade successful!", {
          description: `Bought ${shares} ${outcome} shares`,
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorer}/tx/${tx.hash}`, "_blank"),
          },
        });

        return {
          success: true,
          txHash: tx.hash,
          shares,
        };
      } catch (err: any) {
        const errorMessage = err?.message || "Unknown error";
        
        if (err.code === 4001 || errorMessage.includes("rejected")) {
          setError("Transaction cancelled");
          return { success: false, error: "Cancelled by user" };
        }

        if (errorMessage.includes("Market closed") || errorMessage.includes("Market resolved")) {
          toast.error("Market is not open for trading");
          return { success: false, error: "Market closed" };
        }

        if (errorMessage.includes("insufficient funds")) {
          toast.error("Insufficient funds", {
            description: "You need more Base Sepolia ETH",
            action: {
              label: "Get Free ETH",
              onClick: () => window.open("https://www.alchemy.com/faucets/base-sepolia", "_blank"),
            },
          });
          return { success: false, error: "Insufficient funds" };
        }

        setError(errorMessage);
        toast.error("Trade failed", { description: errorMessage.slice(0, 100) });
        return { success: false, error: errorMessage };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getContract]
  );

  // Resolve a market
  const resolveMarketOnChain = useCallback(
    async (contractAddress: string, yesWins: boolean): Promise<{
      success: boolean;
      txHash?: string;
      error?: string;
    }> => {
      if (!isConnected || !address) {
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        return { success: false, error: "Please switch to Base Sepolia" };
      }

      setIsPending(true);
      setError(null);

      try {
        const contract = await getContract(contractAddress);
        const outcome = yesWins ? "YES" : "NO";

        toast.info("Please confirm the resolution", {
          description: `Resolving market: ${outcome} wins`,
        });

        const tx = await contract.resolve(yesWins);
        
        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed");
        }

        toast.success("Market resolved!", {
          description: `${outcome} is the winning outcome`,
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorer}/tx/${tx.hash}`, "_blank"),
          },
        });

        return {
          success: true,
          txHash: tx.hash,
        };
      } catch (err: any) {
        const errorMessage = err?.message || "Unknown error";
        
        if (err.code === 4001 || errorMessage.includes("rejected")) {
          return { success: false, error: "Cancelled by user" };
        }

        if (errorMessage.includes("Only creator")) {
          toast.error("Only the market creator can resolve");
          return { success: false, error: "Not authorized" };
        }

        if (errorMessage.includes("Market not ended")) {
          toast.error("Market has not ended yet");
          return { success: false, error: "Market not ended" };
        }

        toast.error("Resolution failed", { description: errorMessage.slice(0, 100) });
        return { success: false, error: errorMessage };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getContract]
  );

  // Claim winnings
  const claimWinningsOnChain = useCallback(
    async (contractAddress: string): Promise<{
      success: boolean;
      txHash?: string;
      amount?: string;
      error?: string;
    }> => {
      if (!isConnected || !address) {
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        return { success: false, error: "Please switch to Base Sepolia" };
      }

      setIsPending(true);
      setError(null);

      try {
        const contract = await getContract(contractAddress);

        // Check claimable amount first
        const claimable = await contract.getClaimableAmount(address);
        const claimableEth = formatEther(claimable);

        if (claimable === 0n) {
          toast.error("Nothing to claim");
          return { success: false, error: "No winnings to claim" };
        }

        toast.info("Please confirm to claim your winnings", {
          description: `Claiming ${claimableEth} ETH`,
        });

        const tx = await contract.claimWinnings();
        
        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        const receipt = await tx.wait();

        if (!receipt || receipt.status === 0) {
          throw new Error("Transaction failed");
        }

        toast.success("Winnings claimed! 🎉", {
          description: `You received ${claimableEth} ETH`,
          action: {
            label: "View TX",
            onClick: () => window.open(`${BASE_SEPOLIA.blockExplorer}/tx/${tx.hash}`, "_blank"),
          },
        });

        return {
          success: true,
          txHash: tx.hash,
          amount: claimableEth,
        };
      } catch (err: any) {
        const errorMessage = err?.message || "Unknown error";
        
        if (err.code === 4001 || errorMessage.includes("rejected")) {
          return { success: false, error: "Cancelled by user" };
        }

        if (errorMessage.includes("Already claimed")) {
          toast.error("Already claimed your winnings");
          return { success: false, error: "Already claimed" };
        }

        toast.error("Claim failed", { description: errorMessage.slice(0, 100) });
        return { success: false, error: errorMessage };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getContract]
  );

  // Read market info
  const getMarketInfoOnChain = useCallback(
    async (contractAddress: string): Promise<MarketInfo | null> => {
      try {
        if (!window.ethereum) return null;
        
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(contractAddress, PREDICTION_MARKET_ABI, provider);

        const [info, probability, isOpen, creator] = await Promise.all([
          contract.getMarketInfo(),
          contract.getProbability(),
          contract.isMarketOpen(),
          contract.creator(),
        ]);

        return {
          question: info._question,
          description: info._description,
          endTime: Number(info._endTime),
          isResolved: info._isResolved,
          winningOutcome: info._winningOutcome,
          totalYesShares: formatEther(info._totalYesShares * 1000000000000000n), // Convert to shares display
          totalNoShares: formatEther(info._totalNoShares * 1000000000000000n),
          totalPool: formatEther(info._totalPool),
          probability: Number(probability),
          isOpen,
          creator,
        };
      } catch (err) {
        console.error("Error reading market info:", err);
        return null;
      }
    },
    []
  );

  // Read user position
  const getUserPositionOnChain = useCallback(
    async (contractAddress: string, userAddress: string): Promise<UserPosition | null> => {
      try {
        if (!window.ethereum) return null;
        
        const provider = new BrowserProvider(window.ethereum);
        const contract = new Contract(contractAddress, PREDICTION_MARKET_ABI, provider);

        const [position, claimable] = await Promise.all([
          contract.getUserPosition(userAddress),
          contract.getClaimableAmount(userAddress),
        ]);

        return {
          yesShares: position._yesShares.toString(),
          noShares: position._noShares.toString(),
          totalInvested: formatEther(position._totalInvested),
          claimableAmount: formatEther(claimable),
        };
      } catch (err) {
        console.error("Error reading user position:", err);
        return null;
      }
    },
    []
  );

  return {
    // State
    isPending,
    error,
    isOnBase,
    factoryAddress: FACTORY_ADDRESS,
    
    // Actions
    createMarketOnChain,
    buySharesOnChain,
    resolveMarketOnChain,
    claimWinningsOnChain,
    
    // Read functions
    getMarketInfoOnChain,
    getUserPositionOnChain,
  };
};
