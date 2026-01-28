import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { BASE_SEPOLIA } from "@/lib/solidityPredictionMarket";
import { toast } from "sonner";

// ABI for OLD contracts - has genLayerMarketId and uses buyShares(uint8)
const OLD_CONTRACT_ABI = [
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function endDate() view returns (uint256)",
  "function genLayerMarketId() view returns (bytes32)",
  "function creator() view returns (address)",
  "function oracle() view returns (address)",
  "function isResolved() view returns (bool)",
  "function winner() view returns (uint8)",
  "function totalPool() view returns (uint256)",
  "function totalShares(uint8) view returns (uint256)",
  "function userShares(address, uint8) view returns (uint256)",
  "function buyShares(uint8 _outcome) payable",
  "function sellShares(uint8 _outcome, uint256 _amount)",
  "function claimWinnings()",
];

// ABI for NEW factory contracts - no genLayerMarketId, uses buyYes()/buyNo()
const NEW_CONTRACT_ABI = [
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function endTime() view returns (uint256)",
  "function resolved() view returns (bool)",
  "function outcome() view returns (uint8)",
  "function creator() view returns (address)",
  "function yesPool() view returns (uint256)",
  "function noPool() view returns (uint256)",
  "function yesShares(address) view returns (uint256)",
  "function noShares(address) view returns (uint256)",
  "function buyYes() payable",
  "function buyNo() payable",
  "function claimWinnings()",
];

interface TradeParams {
  contractAddress: string;
  positionType: "yes" | "no";
  amount: number;
}

interface TradeResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

interface MarketData {
  question: string;
  description: string;
  endDate: number;
  isResolved: boolean;
  winner: number;
  totalPool: string;
  yesShares: string;
  noShares: string;
}

interface UserPosition {
  yesShares: string;
  noShares: string;
}

// Cache for contract types
const contractTypeCache: Record<string, "old" | "new"> = {};

export const useBaseTrading = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isPending, setIsPending] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  const getProvider = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    return new BrowserProvider(window.ethereum);
  }, []);

  // Detect contract type
  const detectContractType = useCallback(
    async (contractAddress: string, provider: BrowserProvider): Promise<"old" | "new"> => {
      if (contractTypeCache[contractAddress]) {
        return contractTypeCache[contractAddress];
      }

      try {
        const contract = new Contract(
          contractAddress, 
          ["function genLayerMarketId() view returns (bytes32)"], 
          provider
        );
        await contract.genLayerMarketId();
        contractTypeCache[contractAddress] = "old";
        return "old";
      } catch {
        contractTypeCache[contractAddress] = "new";
        return "new";
      }
    },
    []
  );

  const buyShares = useCallback(
    async (params: TradeParams): Promise<TradeResult> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia to trade");
        return { success: false, error: "Wrong network" };
      }

      setIsPending(true);
      setCurrentTxHash(null);

      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        const value = parseEther(params.amount.toString());
        const contractType = await detectContractType(params.contractAddress, provider);

        console.log("=== BUY SHARES DEBUG ===");
        console.log("Contract:", params.contractAddress);
        console.log("Contract type:", contractType);
        console.log("Position:", params.positionType);
        console.log("Amount:", params.amount, "ETH");

        // Pre-flight checks for OLD contracts
        if (contractType === "old") {
          const contract = new Contract(params.contractAddress, OLD_CONTRACT_ABI, provider);
          
          try {
            const [isResolved, endDate, creator] = await Promise.all([
              contract.isResolved(),
              contract.endDate(),
              contract.creator(),
            ]);
            
            console.log("isResolved:", isResolved);
            console.log("endDate:", new Date(Number(endDate) * 1000).toISOString());
            console.log("creator:", creator);
            console.log("your address:", address);
            
            if (isResolved) {
              toast.error("Market is already resolved");
              return { success: false, error: "Market resolved" };
            }
            
            const now = Math.floor(Date.now() / 1000);
            if (Number(endDate) < now) {
              toast.error("Market has ended");
              return { success: false, error: "Market ended" };
            }
          } catch (checkError) {
            console.log("Pre-flight check error:", checkError);
          }
        }

        let tx;

        if (contractType === "old") {
          const contract = new Contract(params.contractAddress, OLD_CONTRACT_ABI, signer);
          const outcome = params.positionType === "yes" ? 1 : 2;
          console.log("Calling buyShares(" + outcome + ") with", formatEther(value), "ETH");
          tx = await contract.buyShares(outcome, { value });
        } else {
          const contract = new Contract(params.contractAddress, NEW_CONTRACT_ABI, signer);
          console.log("Calling", params.positionType === "yes" ? "buyYes()" : "buyNo()");
          tx = params.positionType === "yes"
            ? await contract.buyYes({ value })
            : await contract.buyNo({ value });
        }

        setCurrentTxHash(tx.hash);
        console.log("TX Hash:", tx.hash);

        toast.info("Transaction submitted", {
          description: "Waiting for confirmation...",
        });

        await tx.wait();

        toast.success("Shares purchased!", {
          description: `Bought ${params.positionType.toUpperCase()} shares`,
          action: {
            label: "View Transaction",
            onClick: () =>
              window.open(
                `${BASE_SEPOLIA.blockExplorerUrls[0]}/tx/${tx.hash}`,
                "_blank"
              ),
          },
        });

        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Buy shares error:", error);

        if (error?.code === 4001 || error?.code === "ACTION_REJECTED") {
          toast.error("Transaction rejected");
          return { success: false, error: "Transaction rejected" };
        }

        // More detailed error message
        const reason = error?.reason || error?.shortMessage || error?.message || "Unknown error";
        console.log("Error reason:", reason);
        
        toast.error("Failed to buy shares", {
          description: reason,
        });

        return { success: false, error: reason };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider, detectContractType]
  );

  const sellShares = useCallback(
    async (
      contractAddress: string,
      positionType: "yes" | "no",
      shares: number
    ): Promise<TradeResult> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia to trade");
        return { success: false, error: "Wrong network" };
      }

      setIsPending(true);
      setCurrentTxHash(null);

      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        const outcome = positionType === "yes" ? 1 : 2;
        const amount = parseEther(shares.toString());

        const contract = new Contract(contractAddress, OLD_CONTRACT_ABI, signer);
        const tx = await contract.sellShares(outcome, amount);
        setCurrentTxHash(tx.hash);

        await tx.wait();

        toast.success("Shares sold!", {
          description: `Sold ${positionType.toUpperCase()} shares`,
        });

        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Sell shares error:", error);

        toast.error("Failed to sell shares", {
          description: error?.message || "Unknown error",
        });

        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider]
  );

  const claimWinnings = useCallback(
    async (contractAddress: string): Promise<TradeResult> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia");
        return { success: false, error: "Wrong network" };
      }

      setIsPending(true);

      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        const contractType = await detectContractType(contractAddress, provider);

        const abi = contractType === "old" ? OLD_CONTRACT_ABI : NEW_CONTRACT_ABI;
        const contract = new Contract(contractAddress, abi, signer);
        const tx = await contract.claimWinnings();

        setCurrentTxHash(tx.hash);
        await tx.wait();

        toast.success("Winnings claimed!");

        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Claim winnings error:", error);

        toast.error("Failed to claim winnings", {
          description: error?.message || "Unknown error",
        });

        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider, detectContractType]
  );

  const readMarketData = useCallback(
    async (contractAddress: string): Promise<MarketData | null> => {
      try {
        const provider = await getProvider();
        const contractType = await detectContractType(contractAddress, provider);

        if (contractType === "old") {
          const contract = new Contract(contractAddress, OLD_CONTRACT_ABI, provider);
          const [question, description, endDate, isResolved, winner, totalPool, yesShares, noShares] =
            await Promise.all([
              contract.question(),
              contract.description(),
              contract.endDate(),
              contract.isResolved(),
              contract.winner(),
              contract.totalPool(),
              contract.totalShares(1),
              contract.totalShares(2),
            ]);

          return {
            question,
            description,
            endDate: Number(endDate),
            isResolved,
            winner: Number(winner),
            totalPool: formatEther(totalPool),
            yesShares: formatEther(yesShares),
            noShares: formatEther(noShares),
          };
        } else {
          const contract = new Contract(contractAddress, NEW_CONTRACT_ABI, provider);
          const [question, description, endDate, isResolved, winner, yesShares, noShares] =
            await Promise.all([
              contract.question(),
              contract.description(),
              contract.endTime(),
              contract.resolved(),
              contract.outcome(),
              contract.yesPool(),
              contract.noPool(),
            ]);

          const totalPool = BigInt(yesShares) + BigInt(noShares);

          return {
            question,
            description,
            endDate: Number(endDate),
            isResolved,
            winner: Number(winner),
            totalPool: formatEther(totalPool),
            yesShares: formatEther(yesShares),
            noShares: formatEther(noShares),
          };
        }
      } catch (error) {
        console.error("Read market data error:", error);
        return null;
      }
    },
    [getProvider, detectContractType]
  );

  const getUserPosition = useCallback(
    async (contractAddress: string): Promise<UserPosition | null> => {
      if (!address) return null;

      try {
        const provider = await getProvider();
        const contractType = await detectContractType(contractAddress, provider);

        if (contractType === "old") {
          const contract = new Contract(contractAddress, OLD_CONTRACT_ABI, provider);
          const [yesShares, noShares] = await Promise.all([
            contract.userShares(address, 1),
            contract.userShares(address, 2),
          ]);

          return {
            yesShares: formatEther(yesShares),
            noShares: formatEther(noShares),
          };
        } else {
          const contract = new Contract(contractAddress, NEW_CONTRACT_ABI, provider);
          const [yesShares, noShares] = await Promise.all([
            contract.yesShares(address),
            contract.noShares(address),
          ]);

          return {
            yesShares: formatEther(yesShares),
            noShares: formatEther(noShares),
          };
        }
      } catch (error) {
        console.error("Get user position error:", error);
        return null;
      }
    },
    [address, getProvider, detectContractType]
  );

  return {
    buyShares,
    sellShares,
    claimWinnings,
    readMarketData,
    getUserPosition,
    isPending,
    currentTxHash,
    isOnBase,
  };
};
