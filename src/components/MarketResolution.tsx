import { useState, useEffect } from "react";
import { Gavel, CheckCircle2, XCircle, AlertTriangle, Loader2, Trophy, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useMarketResolution } from "@/hooks/useMarketResolution";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { cn } from "@/lib/utils";

interface MarketResolutionProps {
  marketId: string;
  marketTitle: string;
  creatorAddress?: string;
  endDate: string;
  resolutionStatus?: string;
  resolvedOutcome?: string | null;
  onResolved?: () => void;
}

export const MarketResolution = ({
  marketId,
  marketTitle,
  creatorAddress,
  endDate,
  resolutionStatus,
  resolvedOutcome,
  onResolved,
}: MarketResolutionProps) => {
  const { address, isConnected } = useWalletAuth();
  const { resolveMarket, isResolving, getResolutionData } = useMarketResolution();
  
  const [selectedOutcome, setSelectedOutcome] = useState<"yes" | "no" | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [resolutionData, setResolutionData] = useState<any>(null);

  const isCreator = address && creatorAddress && 
    address.toLowerCase() === creatorAddress.toLowerCase();
  const isMarketEnded = new Date(endDate) < new Date();
  const isResolved = resolutionStatus === "resolved";
  const canResolve = isCreator && isMarketEnded && !isResolved;

  // Fetch resolution data
  useEffect(() => {
    if (marketId) {
      getResolutionData(marketId).then(setResolutionData);
    }
  }, [marketId, getResolutionData]);

  const handleResolve = async () => {
    if (!selectedOutcome || !creatorAddress) return;

    try {
      await resolveMarket({
        marketId,
        outcome: selectedOutcome,
        creatorAddress,
      });
      setShowConfirmDialog(false);
      setSelectedOutcome(null);
      onResolved?.();
    } catch (err) {
      // Error handled in hook
    }
  };

  // Already resolved - show result
  if (isResolved) {
    return (
      <Card className="border-2 border-emerald-500/30 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              resolvedOutcome === "yes" 
                ? "bg-emerald-500/20" 
                : "bg-rose-500/20"
            )}>
              <Trophy className={cn(
                "w-6 h-6",
                resolvedOutcome === "yes" ? "text-emerald-400" : "text-rose-400"
              )} />
            </div>
            <div>
              <h3 className="font-semibold text-white">Market Resolved</h3>
              <p className="text-sm text-neutral-400">
                <span className={cn(
                  "font-bold",
                  resolvedOutcome === "yes" ? "text-emerald-400" : "text-rose-400"
                )}>
                  {resolvedOutcome?.toUpperCase()}
                </span>
                {" "}was the winning outcome
              </p>
            </div>
          </div>

          {resolutionData && resolutionData.totalPool > 0 && (
            <div className="mt-4 pt-4 border-t border-neutral-800 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Total Pool</span>
                <p className="font-semibold text-white">
                  {resolutionData.totalPool.toFixed(4)} ETH
                </p>
              </div>
              <div>
                <span className="text-neutral-500">Winners</span>
                <p className="font-semibold text-white">
                  {resolvedOutcome === "yes" 
                    ? resolutionData.totalYesShares 
                    : resolutionData.totalNoShares
                  } shares
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Market not ended yet
  if (!isMarketEnded) {
    return (
      <Card className="border border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Market Still Active</h3>
              <p className="text-sm text-neutral-500">
                Resolution available after {new Date(endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not the creator
  if (!isCreator) {
    return (
      <Card className="border border-neutral-800 bg-neutral-900/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-800 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-neutral-500" />
            </div>
            <div>
              <h3 className="font-medium text-neutral-200">Awaiting Resolution</h3>
              <p className="text-sm text-neutral-500">
                The market creator will resolve this market
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Creator can resolve
  return (
    <>
      <Card className="border-2 border-amber-500/30 bg-amber-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gavel className="w-5 h-5 text-amber-400" />
            Resolve Market
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-400">
            As the market creator, you can now resolve this market. Select the winning outcome:
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setSelectedOutcome("yes")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                "flex flex-col items-center gap-2",
                selectedOutcome === "yes"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
              )}
            >
              <CheckCircle2 className={cn(
                "w-8 h-8",
                selectedOutcome === "yes" ? "text-emerald-400" : "text-neutral-500"
              )} />
              <span className={cn(
                "font-semibold",
                selectedOutcome === "yes" ? "text-emerald-400" : "text-neutral-300"
              )}>
                YES Wins
              </span>
            </button>

            <button
              onClick={() => setSelectedOutcome("no")}
              className={cn(
                "p-4 rounded-xl border-2 transition-all",
                "flex flex-col items-center gap-2",
                selectedOutcome === "no"
                  ? "border-rose-500 bg-rose-500/10"
                  : "border-neutral-700 bg-neutral-800/50 hover:border-neutral-600"
              )}
            >
              <XCircle className={cn(
                "w-8 h-8",
                selectedOutcome === "no" ? "text-rose-400" : "text-neutral-500"
              )} />
              <span className={cn(
                "font-semibold",
                selectedOutcome === "no" ? "text-rose-400" : "text-neutral-300"
              )}>
                NO Wins
              </span>
            </button>
          </div>

          {resolutionData && (
            <div className="p-3 rounded-lg bg-neutral-800/50 text-xs text-neutral-400">
              <div className="flex justify-between mb-1">
                <span>Total Pool:</span>
                <span className="font-medium text-white">{resolutionData.totalPool.toFixed(4)} ETH</span>
              </div>
              <div className="flex justify-between mb-1">
                <span>YES Shares:</span>
                <span>{resolutionData.totalYesShares}</span>
              </div>
              <div className="flex justify-between">
                <span>NO Shares:</span>
                <span>{resolutionData.totalNoShares}</span>
              </div>
            </div>
          )}

          <Button
            onClick={() => setShowConfirmDialog(true)}
            disabled={!selectedOutcome || isResolving}
            className={cn(
              "w-full",
              selectedOutcome === "yes" && "bg-emerald-600 hover:bg-emerald-500",
              selectedOutcome === "no" && "bg-rose-600 hover:bg-rose-500",
              !selectedOutcome && "bg-neutral-700"
            )}
          >
            {isResolving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <Gavel className="w-4 h-4 mr-2" />
                Resolve Market
              </>
            )}
          </Button>

          <p className="text-xs text-amber-500/80 flex items-start gap-1.5">
            <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
            This action is permanent and cannot be undone
          </p>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-neutral-900 border-neutral-800">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Resolution</AlertDialogTitle>
            <AlertDialogDescription className="text-neutral-400">
              You are about to resolve this market with{" "}
              <span className={cn(
                "font-bold",
                selectedOutcome === "yes" ? "text-emerald-400" : "text-rose-400"
              )}>
                {selectedOutcome?.toUpperCase()}
              </span>{" "}
              as the winning outcome.
              <br /><br />
              <strong className="text-white">"{marketTitle}"</strong>
              <br /><br />
              This action cannot be undone. All winnings will be distributed to{" "}
              {selectedOutcome?.toUpperCase()} holders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-neutral-800 border-neutral-700 hover:bg-neutral-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResolve}
              disabled={isResolving}
              className={cn(
                selectedOutcome === "yes" 
                  ? "bg-emerald-600 hover:bg-emerald-500" 
                  : "bg-rose-600 hover:bg-rose-500"
              )}
            >
              {isResolving ? "Resolving..." : "Confirm Resolution"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
