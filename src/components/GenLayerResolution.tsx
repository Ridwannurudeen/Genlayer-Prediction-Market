import { useState, useEffect } from "react";
import { Sparkles, Loader2, CheckCircle2, XCircle, ExternalLink, Cpu } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGenLayer, GENLAYER_TESTNET } from "@/hooks/useGenLayer";
import { useWalletAuth } from "@/contexts/WalletAuthContext";

interface GenLayerResolutionProps {
  contractAddress: string | null | undefined;
  marketEndDate: string;
  onResolved?: (outcome: number, reasoning: string) => void;
}

export const GenLayerResolution = ({
  contractAddress,
  marketEndDate,
  onResolved,
}: GenLayerResolutionProps) => {
  const { isConnected } = useWalletAuth();
  const {
    isOnGenLayer,
    isResolving,
    switchToGenLayer,
    checkResolutionStatus,
    resolveMarket,
    explorerUrl,
  } = useGenLayer();

  const [resolutionStatus, setResolutionStatus] = useState<{
    resolved: boolean;
    outcome: number;
    reasoning: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isMarketEnded = new Date(marketEndDate) < new Date();
  const canResolve = isMarketEnded && !resolutionStatus?.resolved;

  // Check resolution status on mount
  useEffect(() => {
    if (!contractAddress) {
      setIsLoading(false);
      return;
    }

    const checkStatus = async () => {
      setIsLoading(true);
      const status = await checkResolutionStatus(contractAddress);
      if (status) {
        setResolutionStatus(status);
        if (status.resolved && onResolved) {
          onResolved(status.outcome, status.reasoning);
        }
      }
      setIsLoading(false);
    };

    checkStatus();
  }, [contractAddress, checkResolutionStatus, onResolved]);

  // No GenLayer contract
  if (!contractAddress) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
            <span className="text-sm text-muted-foreground">
              Checking resolution status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already resolved
  if (resolutionStatus?.resolved) {
    const isYes = resolutionStatus.outcome === 1;

    return (
      <Card className="border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium">AI Resolution</span>
            </div>
            <Badge
              variant="outline"
              className={`text-xs ${
                isYes
                  ? "text-green-600 border-green-500/30"
                  : "text-red-600 border-red-500/30"
              }`}
            >
              {isYes ? (
                <CheckCircle2 className="h-3 w-3 mr-1" />
              ) : (
                <XCircle className="h-3 w-3 mr-1" />
              )}
              {isYes ? "YES" : "NO"}
            </Badge>
          </div>

          {resolutionStatus.reasoning && (
            <div className="mt-2 p-2 bg-background/50 rounded text-xs text-muted-foreground">
              <span className="font-medium">AI Reasoning:</span>
              <p className="mt-1">{resolutionStatus.reasoning}</p>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-border/50">
            <a
              href={`${explorerUrl}/address/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              View on GenLayer Explorer
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not resolved yet
  return (
    <Card className="border border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">GenLayer AI Resolution</span>
          </div>
          <Badge variant="outline" className="text-xs text-purple-600 border-purple-500/30">
            <Cpu className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>

        <p className="text-xs text-muted-foreground mb-3">
          {isMarketEnded
            ? "Market has ended. Trigger AI resolution to determine the outcome."
            : "AI validators will determine the outcome after the market ends."}
        </p>

        {canResolve && (
          <>
            {!isConnected ? (
              <p className="text-xs text-muted-foreground">
                Connect wallet to resolve
              </p>
            ) : !isOnGenLayer ? (
              <Button
                size="sm"
                variant="outline"
                onClick={switchToGenLayer}
                className="w-full gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Switch to GenLayer
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={async () => {
                  const result = await resolveMarket(contractAddress);
                  if (result.success && result.outcome !== undefined) {
                    setResolutionStatus({
                      resolved: true,
                      outcome: result.outcome,
                      reasoning: result.reasoning || "",
                    });
                    if (onResolved) {
                      onResolved(result.outcome, result.reasoning || "");
                    }
                  }
                }}
                disabled={isResolving}
                className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
              >
                {isResolving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resolving with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Resolve with AI Validators
                  </>
                )}
              </Button>
            )}
          </>
        )}

        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Contract: {contractAddress.slice(0, 8)}...{contractAddress.slice(-6)}
          </span>
          <a
            href={`${explorerUrl}/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 hover:text-purple-700"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
