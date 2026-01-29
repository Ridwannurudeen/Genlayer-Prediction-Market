import { useState, useEffect } from "react";
import { Gavel, Loader2, Zap, CheckCircle2, AlertTriangle, Info, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBaseTrading } from "@/hooks/useBaseTrading";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { Contract, JsonRpcProvider } from "ethers";

const baseSepoliaProvider = new JsonRpcProvider("https://sepolia.base.org");

// Known factory address - contracts deployed by this are factory-created
const FACTORY_ADDRESS = "0xB7F06cC21DeE9b1FC0349d08C72fF5c632feC2d7".toLowerCase();

interface ManualResolutionProps {
  baseContractAddress: string | null | undefined;
  marketEndDate: string; // Database end date (what user set)
  marketCreatorAddress?: string | null;
  onResolved?: () => void;
}

export const ManualResolution = ({
  baseContractAddress,
  marketEndDate,
  marketCreatorAddress,
  onResolved,
}: ManualResolutionProps) => {
  const { isConnected, address, switchToBase } = useWalletAuth();
  const { resolveOnBase, isOnBase, isPending } = useBaseTrading();

  const [selectedOutcome, setSelectedOutcome] = useState<1 | 2 | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [contractCreator, setContractCreator] = useState<string | null>(null);
  const [isCheckingContract, setIsCheckingContract] = useState(true);
  const [alreadyResolved, setAlreadyResolved] = useState(false);
  const [onChainEndTime, setOnChainEndTime] = useState<number | null>(null);

  // Check database end date
  const dbEndDate = new Date(marketEndDate);
  const isDbMarketEnded = dbEndDate < new Date();
  
  // Check on-chain end time (may differ from database due to minimum 1 day)
  const now = Math.floor(Date.now() / 1000);
  const isOnChainEnded = onChainEndTime ? now >= onChainEndTime : true; // Default to true if unknown
  
  // Check if user is the creator
  const isOwner = address && (
    (contractCreator && contractCreator.toLowerCase() === address.toLowerCase()) ||
    (marketCreatorAddress && marketCreatorAddress.toLowerCase() === address.toLowerCase())
  );

  // Check contract status on mount
  useEffect(() => {
    const checkContract = async () => {
      if (!baseContractAddress) {
        setIsCheckingContract(false);
        return;
      }

      try {
        const contract = new Contract(
          baseContractAddress,
          [
            "function owner() view returns (address)",
            "function creator() view returns (address)",
            "function marketCreator() view returns (address)",
            "function isResolved() view returns (bool)",
            "function resolved() view returns (bool)",
            "function endDate() view returns (uint256)",
            "function endTime() view returns (uint256)",
          ],
          baseSepoliaProvider
        );

        // Get on-chain end time
        try {
          const endTime = await contract.endDate();
          const endTimeNum = Number(endTime);
          setOnChainEndTime(endTimeNum);
          console.log("On-chain endDate:", endTimeNum, "Now:", Math.floor(Date.now() / 1000));
          console.log("On-chain end date:", new Date(endTimeNum * 1000).toISOString());
        } catch {
          try {
            const endTime = await contract.endTime();
            const endTimeNum = Number(endTime);
            setOnChainEndTime(endTimeNum);
            console.log("On-chain endTime:", endTimeNum);
          } catch {
            console.log("No endDate/endTime function found");
          }
        }

        // Get creator
        let creator = null;
        try {
          creator = await contract.creator();
          console.log("Contract creator:", creator);
        } catch {
          try {
            creator = await contract.marketCreator();
            console.log("Contract marketCreator:", creator);
          } catch {
            try {
              const owner = await contract.owner();
              console.log("Contract owner:", owner);
              if (owner && owner.toLowerCase() !== FACTORY_ADDRESS) {
                creator = owner;
              }
            } catch {
              console.log("No owner/creator function");
            }
          }
        }

        // Don't use factory address as creator
        if (creator && creator.toLowerCase() === FACTORY_ADDRESS) {
          creator = null;
        }
        setContractCreator(creator);

        // Check if resolved
        let resolved = false;
        try {
          resolved = await contract.isResolved();
        } catch {
          try {
            resolved = await contract.resolved();
          } catch {}
        }
        setAlreadyResolved(resolved);

      } catch (error) {
        console.error("Error checking contract:", error);
      } finally {
        setIsCheckingContract(false);
      }
    };

    checkContract();
  }, [baseContractAddress]);

  // Don't show if no contract
  if (!baseContractAddress) {
    return null;
  }

  // Don't show if database says not ended (user's intended end date)
  if (!isDbMarketEnded) {
    return null;
  }

  const handleResolve = async () => {
    if (!selectedOutcome || !baseContractAddress) return;

    setIsResolving(true);
    const result = await resolveOnBase(baseContractAddress, selectedOutcome);
    
    if (result.success) {
      setIsResolved(true);
      setAlreadyResolved(true);
      onResolved?.();
    }
    
    setIsResolving(false);
  };

  const displayCreator = contractCreator || marketCreatorAddress;

  // Format time remaining for on-chain end
  const formatTimeRemaining = () => {
    if (!onChainEndTime) return null;
    const remaining = onChainEndTime - Math.floor(Date.now() / 1000);
    if (remaining <= 0) return null;
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Already resolved state
  if (isResolved || alreadyResolved) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-emerald-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="font-semibold text-emerald-400">Market Resolved!</p>
              <p className="text-xs text-white/50">Winners can now claim their winnings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isCheckingContract) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/30 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-white/50" />
            <span className="text-sm text-white/70">Checking contract...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const timeRemaining = formatTimeRemaining();

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-amber-500/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Gavel className="h-4 w-4 text-amber-400" />
            </div>
            <span className="text-sm font-semibold text-white/90">Manual Resolution</span>
          </div>
          <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            No AI Contract
          </Badge>
        </div>

        {/* On-chain end time warning */}
        {!isOnChainEnded && timeRemaining && (
          <div className="mb-3 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 text-xs text-blue-400">
              <Clock className="h-3 w-3" />
              <span>On-chain lock: <strong>{timeRemaining}</strong> remaining</span>
            </div>
            <p className="text-[10px] text-blue-300/70 mt-1">
              Factory contracts have minimum 1 day duration. Wait for this to pass.
            </p>
          </div>
        )}

        {/* Creator Info */}
        {displayCreator && (
          <div className="mb-3 p-2 rounded-lg bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 text-xs">
              <Info className="h-3 w-3 text-white/40" />
              <span className="text-white/40">Market creator:</span>
              <span className="font-mono text-white/60">
                {displayCreator.slice(0, 6)}...{displayCreator.slice(-4)}
              </span>
              {isOwner ? (
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 text-[10px]">You</Badge>
              ) : (
                <Badge className="ml-auto bg-red-500/20 text-red-400 text-[10px]">Not You</Badge>
              )}
            </div>
          </div>
        )}

        {/* Not owner warning */}
        {displayCreator && !isOwner && isConnected && (
          <div className="mb-3 p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-xs text-red-400">
              ⚠️ Only the market creator can resolve. Connect with the creator wallet.
            </p>
          </div>
        )}

        <p className="text-xs text-white/50 mb-4">
          This market doesn't have a GenLayer AI contract. The market creator can manually resolve it.
        </p>

        {/* Outcome Selection */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSelectedOutcome(1)}
            disabled={(!isOwner && isConnected) || !isOnChainEnded}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedOutcome === 1
                ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/50"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            YES Wins
          </button>
          <button
            onClick={() => setSelectedOutcome(2)}
            disabled={(!isOwner && isConnected) || !isOnChainEnded}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedOutcome === 2
                ? "bg-red-500/20 text-red-400 border-2 border-red-500/50"
                : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
            }`}
          >
            NO Wins
          </button>
        </div>

        {/* Resolve Button */}
        {!isConnected ? (
          <p className="text-xs text-white/40 text-center">Connect wallet to resolve</p>
        ) : !isOnBase ? (
          <Button
            onClick={switchToBase}
            variant="outline"
            className="w-full gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
          >
            <Zap className="h-4 w-4" />
            Switch to Base Sepolia
          </Button>
        ) : !isOnChainEnded ? (
          <Button
            disabled
            className="w-full gap-2 bg-white/10 text-white/50 cursor-not-allowed"
          >
            <Clock className="h-4 w-4" />
            Wait {timeRemaining || "for end time"}
          </Button>
        ) : !isOwner ? (
          <Button
            disabled
            className="w-full gap-2 bg-white/10 text-white/50 cursor-not-allowed"
          >
            <Gavel className="h-4 w-4" />
            Only Creator Can Resolve
          </Button>
        ) : (
          <Button
            onClick={handleResolve}
            disabled={!selectedOutcome || isResolving || isPending}
            className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold disabled:opacity-50"
          >
            {isResolving || isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4" />
                Resolve Market
              </>
            )}
          </Button>
        )}

        <p className="text-[10px] text-white/30 mt-3 text-center">
          Resolution is final and cannot be changed.
        </p>
      </CardContent>
    </Card>
  );
};
