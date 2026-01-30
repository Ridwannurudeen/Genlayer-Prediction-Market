import { useState, useCallback } from "react";
import { BrowserProvider, Contract, parseEther, formatEther, JsonRpcProvider } from "ethers";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { toast } from "sonner";

const BASE_SEPOLIA = {
  chainId: 84532,
  chainIdNumber: 84532,
  chainIdHex: "0x14a34",
  name: "Base Sepolia",
  rpc: "https://sepolia.base.org",
  rpcFallback: "https://base-sepolia-rpc.publicnode.com",
  explorer: "https://sepolia.basescan.org",
};

// Dedicated read-only provider for Base Sepolia (doesn't depend on wallet network)
let baseSepoliaProvider = new JsonRpcProvider(BASE_SEPOLIA.rpc);

// Helper to check and switch RPC if needed
const ensureProvider = async (): Promise<JsonRpcProvider> => {
  try {
    await baseSepoliaProvider.getBlockNumber();
    return baseSepoliaProvider;
  } catch {
    console.log("Primary RPC failed, trying fallback...");
    baseSepoliaProvider = new JsonRpcProvider(BASE_SEPOLIA.rpcFallback);
    return baseSepoliaProvider;
  }
};

// ABI for OLD manually deployed contracts - uses buyShares()
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
  "function resolve(uint8 _winner)",
  "function owner() view returns (address)",
  "function creator() view returns (address)",
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

// Cache for contract types (only caches valid results)
const contractTypeCache: Record<string, "old" | "new" | "invalid"> = {};

// Clear contract cache (useful when retrying after errors)
export const clearContractCache = (contractAddress?: string) => {
  if (contractAddress) {
    delete contractTypeCache[contractAddress];
  } else {
    Object.keys(contractTypeCache).forEach(key => delete contractTypeCache[key]);
  }
};

export const useBaseTrading = () => {
  const { address, isConnected, chainId } = useWalletAuth();
  const [isPending, setIsPending] = useState(false);
  const [currentTxHash, setCurrentTxHash] = useState<string | null>(null);

  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  const getProvider = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    return new BrowserProvider(window.ethereum);
  }, []);

  // Check if contract exists on Base Sepolia (uses dedicated RPC, not wallet)
  const contractExists = useCallback(
    async (contractAddress: string): Promise<boolean> => {
      try {
        const provider = await ensureProvider();
        const code = await provider.getCode(contractAddress);
        const exists = code !== "0x" && code.length > 2;
        console.log("Contract exists check on Base Sepolia:", contractAddress, exists);
        return exists;
      } catch (error) {
        console.error("contractExists error:", error);
        return false;
      }
    },
    []
  );

  // Detect contract type (uses dedicated Base Sepolia RPC)
  const detectContractType = useCallback(
    async (contractAddress: string): Promise<"old" | "new" | "invalid"> => {
      // Only use cache for valid results, not for invalid
      if (contractTypeCache[contractAddress] && contractTypeCache[contractAddress] !== "invalid") {
        return contractTypeCache[contractAddress];
      }

      // Validate address format
      if (!contractAddress || !contractAddress.startsWith("0x") || contractAddress.length !== 42) {
        console.log("Invalid contract address format:", contractAddress);
        return "invalid";
      }

      try {
        // Ensure provider is working
        const provider = await ensureProvider();
        
        const code = await provider.getCode(contractAddress);
        const exists = code !== "0x" && code.length > 2;
        
        console.log("Contract exists check:", contractAddress, "exists:", exists, "code length:", code.length);
        
        if (!exists) {
          console.log("Contract does not exist on Base Sepolia:", contractAddress);
          // Don't cache invalid - might be temporary RPC issue
          return "invalid";
        }

        // Try OLD contract (has totalShares with uint8 param)
        try {
          const oldContract = new Contract(contractAddress, OLD_CONTRACT_ABI, provider);
          await oldContract.totalShares(1);
          console.log("Detected OLD contract");
          contractTypeCache[contractAddress] = "old";
          return "old";
        } catch {
          // Not old contract, assume new factory contract
          console.log("Detected NEW factory contract");
          contractTypeCache[contractAddress] = "new";
          return "new";
        }
      } catch (error) {
        console.error("Contract detection error:", error);
        // Don't cache - might be network issue
        return "invalid";
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
        toast.error("Please switch to Base Sepolia");
        return { success: false, error: "Wrong network" };
      }

      setIsPending(true);

      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        const contractType = await detectContractType(params.contractAddress);

        console.log("=== BUY SHARES DEBUG ===");
        console.log("Contract:", params.contractAddress);
        console.log("Contract type:", contractType);
        console.log("Position:", params.positionType);
        console.log("Amount:", params.amount, "ETH");

        if (contractType === "invalid") {
          toast.error("Trading not available", {
            description: "This market's contract was not found on Base Sepolia.",
          });
          return { success: false, error: "Invalid contract" };
        }

        const value = parseEther(params.amount.toString());
        let tx;

        if (contractType === "old") {
          const contract = new Contract(params.contractAddress, OLD_CONTRACT_ABI, signer);
          const outcome = params.positionType === "yes" ? 1 : 2;
          console.log("Calling buyShares(" + outcome + ")");
          tx = await contract.buyShares(outcome, { value });
        } else {
          // NEW contract - use buyYes() or buyNo()
          const abi = params.positionType === "yes" 
            ? ["function buyYes() payable"]
            : ["function buyNo() payable"];
          const contract = new Contract(params.contractAddress, abi, signer);
          
          if (params.positionType === "yes") {
            console.log("Calling buyYes()");
            tx = await contract.buyYes({ value });
          } else {
            console.log("Calling buyNo()");
            tx = await contract.buyNo({ value });
          }
        }

        setCurrentTxHash(tx.hash);
        console.log("TX Hash:", tx.hash);
        
        await tx.wait();
        toast.success(`Bought ${params.positionType.toUpperCase()} shares!`);
        
        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Buy shares error:", error);
        if (error?.code === 4001 || error?.message?.includes("rejected")) {
          toast.error("Transaction rejected");
          return { success: false, error: "Transaction rejected" };
        }
        toast.error("Transaction failed", { description: error?.message?.slice(0, 100) });
        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider, detectContractType]
  );

  const sellShares = useCallback(
    async (params: TradeParams & { shares: number }): Promise<TradeResult> => {
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
        const contractType = await detectContractType(params.contractAddress);

        if (contractType === "invalid") {
          toast.error("Invalid contract");
          return { success: false, error: "Invalid contract" };
        }

        const contract = new Contract(params.contractAddress, OLD_CONTRACT_ABI, signer);
        const outcome = params.positionType === "yes" ? 1 : 2;
        const tx = await contract.sellShares(outcome, parseEther(params.shares.toString()));

        setCurrentTxHash(tx.hash);
        await tx.wait();

        toast.success("Shares sold!");
        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Sell shares error:", error);
        toast.error("Failed to sell shares", { description: error?.message });
        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider, detectContractType]
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
        const contract = new Contract(contractAddress, ["function claimWinnings()"], signer);
        const tx = await contract.claimWinnings();

        setCurrentTxHash(tx.hash);
        await tx.wait();

        toast.success("Winnings claimed!");
        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Claim winnings error:", error);
        toast.error("Failed to claim winnings", { description: error?.message });
        return { success: false, error: error?.message };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider]
  );

  // Resolve market on Base Sepolia (bridge outcome from GenLayer)
  const resolveOnBase = useCallback(
    async (contractAddress: string, winner: number): Promise<TradeResult> => {
      if (!isConnected || !address) {
        toast.error("Please connect your wallet first");
        return { success: false, error: "Wallet not connected" };
      }

      if (!isOnBase) {
        toast.error("Please switch to Base Sepolia");
        return { success: false, error: "Wrong network" };
      }

      // Validate winner (1 = YES, 2 = NO)
      if (winner !== 1 && winner !== 2) {
        toast.error("Invalid outcome");
        return { success: false, error: "Invalid outcome" };
      }

      setIsPending(true);

      // Known factory address
      const FACTORY_ADDRESS = "0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7".toLowerCase();

      try {
        const provider = await getProvider();
        const signer = await provider.getSigner();
        
        const contractType = await detectContractType(contractAddress);
        
        console.log("=== RESOLVE ON BASE ===");
        console.log("Contract:", contractAddress);
        console.log("Winner:", winner === 1 ? "YES" : "NO");
        console.log("Contract type:", contractType);
        console.log("Current user:", address);

        if (contractType === "invalid") {
          toast.error("Resolution not available", {
            description: "This market's contract was not found on Base Sepolia.",
          });
          return { success: false, error: "Invalid contract" };
        }

        // Create contract instance for pre-checks
        const readProvider = await ensureProvider();
        const checkContract = new Contract(
          contractAddress,
          [
            "function owner() view returns (address)",
            "function creator() view returns (address)",
            "function marketCreator() view returns (address)",
            "function isResolved() view returns (bool)",
            "function resolved() view returns (bool)",
          ],
          readProvider
        );

        // Check if already resolved
        let isAlreadyResolved = false;
        try {
          isAlreadyResolved = await checkContract.isResolved();
        } catch {
          try {
            isAlreadyResolved = await checkContract.resolved();
          } catch {
            // Function doesn't exist, continue
          }
        }

        if (isAlreadyResolved) {
          toast.error("Market is already resolved");
          setIsPending(false);
          return { success: false, error: "Already resolved" };
        }

        // NOTE: We skip the on-chain endTime check here because:
        // 1. Factory contracts have minimum 1 day duration
        // 2. Database end_date is the source of truth for UI
        // 3. Let the contract's own require() handle the check
        // This allows testing with shorter durations

        // Check creator (for factory-deployed contracts)
        let contractCreator: string | null = null;
        try {
          contractCreator = await checkContract.creator();
          console.log("Contract creator:", contractCreator);
        } catch {
          try {
            contractCreator = await checkContract.marketCreator();
            console.log("Contract marketCreator:", contractCreator);
          } catch {
            try {
              const owner = await checkContract.owner();
              console.log("Contract owner:", owner);
              // If owner is factory, we can't determine actual creator from contract
              if (owner && owner.toLowerCase() !== FACTORY_ADDRESS) {
                contractCreator = owner;
              } else {
                console.log("Owner is factory - will try to resolve anyway");
              }
            } catch {
              console.log("No owner/creator function found");
            }
          }
        }

        // Only block if we found a creator that's definitely not the current user
        // (and it's not the factory address)
        if (contractCreator && 
            contractCreator.toLowerCase() !== address.toLowerCase() &&
            contractCreator.toLowerCase() !== FACTORY_ADDRESS) {
          toast.error("Only the market creator can resolve", {
            description: `Creator: ${contractCreator.slice(0, 8)}...${contractCreator.slice(-6)}`,
          });
          setIsPending(false);
          return { success: false, error: "Not the creator" };
        }

        // Use the appropriate resolve function
        const contract = new Contract(
          contractAddress, 
          ["function resolve(uint8 _winner)"], 
          signer
        );
        
        console.log("Calling resolve(" + winner + ")...");
        const tx = await contract.resolve(winner);
        setCurrentTxHash(tx.hash);
        
        console.log("Resolution TX Hash:", tx.hash);
        await tx.wait();

        toast.success(`Market resolved as ${winner === 1 ? "YES" : "NO"}!`);
        return { success: true, transactionHash: tx.hash };
      } catch (error: any) {
        console.error("Resolve on Base error:", error);
        
        // Parse error message for better UX
        const errorMsg = error?.message || error?.reason || "Unknown error";
        
        if (errorMsg.includes("already resolved") || errorMsg.includes("isResolved")) {
          toast.error("Market is already resolved");
        } else if (errorMsg.includes("not ended") || errorMsg.includes("endDate") || errorMsg.includes("too early")) {
          toast.error("Market has not ended yet (on-chain)", {
            description: "Factory contracts have minimum 1 day duration. Wait or create a new market.",
          });
        } else if (errorMsg.includes("owner") || errorMsg.includes("Ownable") || errorMsg.includes("creator")) {
          toast.error("Only the market creator can resolve");
        } else if (errorMsg.includes("require(false)") || errorMsg.includes("CALL_EXCEPTION")) {
          toast.error("Transaction reverted", {
            description: "Contract rejected. Likely: market not ended (1 day minimum) or not the creator.",
          });
        } else {
          toast.error("Failed to resolve market", { description: errorMsg.slice(0, 100) });
        }
        
        return { success: false, error: errorMsg };
      } finally {
        setIsPending(false);
      }
    },
    [isConnected, address, isOnBase, getProvider, detectContractType]
  );

  // Helper to safely call a contract function on Base Sepolia
  const safeCall = async (contractAddress: string, abi: string[], functionName: string, args: any[] = []): Promise<any> => {
    try {
      const provider = await ensureProvider();
      const contract = new Contract(contractAddress, abi, provider);
      return await contract[functionName](...args);
    } catch {
      return null;
    }
  };

  const readMarketData = useCallback(
    async (contractAddress: string): Promise<MarketData | null> => {
      try {
        // Use dedicated Base Sepolia provider for reads (works regardless of wallet network)
        const contractType = await detectContractType(contractAddress);
        const provider = await ensureProvider();

        console.log("=== READ MARKET DATA ===");
        console.log("Contract:", contractAddress);
        console.log("Type:", contractType);

        if (contractType === "invalid") {
          return null;
        }

        if (contractType === "old") {
          try {
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
          } catch (error) {
            console.error("Error reading OLD contract:", error);
            return null;
          }
        }

        // NEW factory contract - try multiple possible function names
        let yesPool = BigInt(0);
        let noPool = BigInt(0);
        let question = "";
        let description = "";
        let endDate = 0;
        let isResolved = false;
        let winner = 0;
        let readSuccess = false;

        // List of possible pool function pairs to try
        const poolFunctionPairs = [
          { yes: "yesPool", no: "noPool", abi: ["function yesPool() view returns (uint256)", "function noPool() view returns (uint256)"] },
          { yes: "totalYesShares", no: "totalNoShares", abi: ["function totalYesShares() view returns (uint256)", "function totalNoShares() view returns (uint256)"] },
          { yes: "yesTotal", no: "noTotal", abi: ["function yesTotal() view returns (uint256)", "function noTotal() view returns (uint256)"] },
          { yes: "yesAmount", no: "noAmount", abi: ["function yesAmount() view returns (uint256)", "function noAmount() view returns (uint256)"] },
        ];

        for (const pair of poolFunctionPairs) {
          try {
            const contract = new Contract(contractAddress, pair.abi, provider);
            yesPool = await contract[pair.yes]();
            noPool = await contract[pair.no]();
            console.log(`Read ${pair.yes}/${pair.no}:`, formatEther(yesPool), formatEther(noPool));
            readSuccess = true;
            break;
          } catch {
            console.log(`${pair.yes}/${pair.no} not available`);
          }
        }

        // Try question
        const questionResult = await safeCall(contractAddress, ["function question() view returns (string)"], "question");
        if (questionResult) question = questionResult;

        // Try description  
        const descResult = await safeCall(contractAddress, ["function description() view returns (string)"], "description");
        if (descResult) description = descResult;

        // Try endTime or endDate
        let endTimeResult = await safeCall(contractAddress, ["function endTime() view returns (uint256)"], "endTime");
        if (!endTimeResult) {
          endTimeResult = await safeCall(contractAddress, ["function endDate() view returns (uint256)"], "endDate");
        }
        if (endTimeResult) endDate = Number(endTimeResult);

        // Try resolved status
        let resolvedResult = await safeCall(contractAddress, ["function resolved() view returns (bool)"], "resolved");
        if (resolvedResult === null) {
          resolvedResult = await safeCall(contractAddress, ["function isResolved() view returns (bool)"], "isResolved");
        }
        if (resolvedResult !== null) isResolved = resolvedResult;

        // Try winner/outcome
        let winnerResult = await safeCall(contractAddress, ["function outcome() view returns (uint8)"], "outcome");
        if (winnerResult === null) {
          winnerResult = await safeCall(contractAddress, ["function winner() view returns (uint8)"], "winner");
        }
        if (winnerResult !== null) winner = Number(winnerResult);

        const totalPool = yesPool + noPool;

        console.log("Final pool data - Yes:", formatEther(yesPool), "No:", formatEther(noPool));

        return {
          question,
          description,
          endDate,
          isResolved,
          winner,
          totalPool: formatEther(totalPool),
          yesShares: formatEther(yesPool),
          noShares: formatEther(noPool),
        };
      } catch (error) {
        console.error("Read market data error:", error);
        return null;
      }
    },
    [detectContractType]
  );

  const getUserPosition = useCallback(
    async (contractAddress: string): Promise<UserPosition | null> => {
      if (!address) return null;

      try {
        // Use dedicated Base Sepolia provider for reads
        const contractType = await detectContractType(contractAddress);
        const provider = await ensureProvider();

        if (contractType === "invalid") {
          return null;
        }

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
        }

        // NEW contract - try multiple possible function signatures
        let yesShares = BigInt(0);
        let noShares = BigInt(0);

        // Try yesShares(address)/noShares(address)
        try {
          const contract = new Contract(contractAddress, [
            "function yesShares(address) view returns (uint256)",
            "function noShares(address) view returns (uint256)",
          ], provider);
          yesShares = await contract.yesShares(address);
          noShares = await contract.noShares(address);
          console.log("Read user shares - Yes:", formatEther(yesShares), "No:", formatEther(noShares));
        } catch {
          // Try shares(address, bool)
          try {
            const contract = new Contract(contractAddress, [
              "function shares(address,bool) view returns (uint256)",
            ], provider);
            yesShares = await contract.shares(address, true);
            noShares = await contract.shares(address, false);
          } catch {
            // Try userYesShares/userNoShares
            try {
              const contract = new Contract(contractAddress, [
                "function userYesShares(address) view returns (uint256)",
                "function userNoShares(address) view returns (uint256)",
              ], provider);
              yesShares = await contract.userYesShares(address);
              noShares = await contract.userNoShares(address);
            } catch {
              console.log("Could not read user position with any known function");
            }
          }
        }

        return {
          yesShares: formatEther(yesShares),
          noShares: formatEther(noShares),
        };
      } catch (error) {
        console.error("Get user position error:", error);
        return null;
      }
    },
    [address, detectContractType]
  );

  return {
    buyShares,
    sellShares,
    claimWinnings,
    resolveOnBase,
    readMarketData,
    getUserPosition,
    isPending,
    currentTxHash,
    isOnBase,
  };
};
