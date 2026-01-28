import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseEther, formatEther } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { BASE_SEPOLIA } from "@/lib/solidityPredictionMarket";
import { toast } from "sonner";

// ABI for OLD contracts (deployed before factory)
const OLD_CONTRACT_ABI = [
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function endDate() view returns (uint256)",
  "function isResolved() view returns (bool)",
  "function winner() view returns (uint8)",
  "function totalPool() view returns (uint256)",
  "function totalShares(uint8) view returns (uint256)",
  "function userShares(address, uint8) view returns (uint256)",
  "function buyShares(uint8 _outcome) payable",
  "function sellShares(uint8 _outcome, uint256 _amount)",
  "function claimWinnings()",
];

// ABI for NEW factory contracts
const NEW_CONTRACT_ABI = [
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function endTime() view returns (uint256)",
  "function resolved() view returns (bool)",
  "function outcome() view returns (uint8)",
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

export const useBaseTrading = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isPending, setIsPending] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  const getProvider = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    return new BrowserProvider(window.ethereum);
  }, []);

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
        const outcome = params.positionType === "yes" ? 1 : 2;

        let tx;

        // Try NEW contract first (buyYes/buyNo)
        try {
          const newContract = new Contract(params.contractAddress, NEW_CONTRACT_ABI, signer);
          tx = params.positionType === "yes"
            ? await newContract.buyYes({ value })
            : await newContract.buyNo({ value });
        } catch (newError: any) {
          console.log("New ABI failed, trying old ABI...", newError.message);
          
          // Fall back to OLD contract (buyShares)
          const oldContract = new Contract(params.contractAddress, OLD_CONTRACT_ABI, signer);
          tx = await oldContract.buyShares(outcome, { value });
        }

        setCurrentTxHash(tx.hash);

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

        toast.error("Failed to buy shares", {
          description: error?.reason || error?.message || "Unknown error",
        });

        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider]
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
        
        // Try both ABIs
        let tx;
        try {
          const contract = new Contract(contractAddress, NEW_CONTRACT_ABI, signer);
          tx = await contract.claimWinnings();
        } catch {
          const contract = new Contract(contractAddress, OLD_CONTRACT_ABI, signer);
          tx = await contract.claimWinnings();
        }
        
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
    [isConnected, address, isOnBase, getProvider]
  );

  const readMarketData = useCallback(
    async (contractAddress: string): Promise<MarketData | null> => {
      try {
        const provider = await getProvider();

        // Try NEW contract ABI first
        try {
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
        } catch (newError) {
          // Fall back to OLD contract ABI
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
        }
      } catch (error) {
        console.error("Read market data error:", error);
        return null;
      }
    },
    [getProvider]
  );

  const getUserPosition = useCallback(
    async (contractAddress: string): Promise<UserPosition | null> => {
      if (!address) return null;

      try {
        const provider = await getProvider();

        // Try NEW contract ABI first
        try {
          const contract = new Contract(contractAddress, NEW_CONTRACT_ABI, provider);
          const [yesShares, noShares] = await Promise.all([
            contract.yesShares(address),
            contract.noShares(address),
          ]);

          return {
            yesShares: formatEther(yesShares),
            noShares: formatEther(noShares),
          };
        } catch {
          // Fall back to OLD contract ABI
          const contract = new Contract(contractAddress, OLD_CONTRACT_ABI, provider);
          const [yesShares, noShares] = await Promise.all([
            contract.userShares(address, 1),
            contract.userShares(address, 2),
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
    [address, getProvider]
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
