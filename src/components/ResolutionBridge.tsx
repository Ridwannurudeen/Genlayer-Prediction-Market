import { useState, useEffect, useCallback } from "react";
import { ArrowRight, CheckCircle2, Loader2, Zap, Brain, AlertTriangle, ExternalLink, Link2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGenLayer, GENLAYER_TESTNET } from "@/hooks/useGenLayer";
import { useBaseTrading } from "@/hooks/useBaseTrading";
import { useWalletAuth } from "@/contexts/WalletAuthContext";

interface ResolutionBridgeProps {
  genLayerContractAddress: string | null | undefined;
  baseContractAddress: string | null | undefined;
  marketEndDate: string;
  onBridgeComplete?: () => void;
}

export const ResolutionBridge = ({
  genLayerContractAddress,
  baseContractAddress,
  marketEndDate,
  onBridgeComplete,
}: ResolutionBridgeProps) => {
  const { isConnected, switchToBase } = useWalletAuth();
  const { checkResolutionStatus, explorerUrl: genLayerExplorer } = useGenLayer();
  const { resolveOnBase, readMarketData, isOnBase, isPending } = useBaseTrading();

  const [genLayerStatus, setGenLayerStatus] = useState<{
    resolved: boolean;
    outcome: number;
    reasoning: string;
  } | null>(null);
  
  const [baseStatus, setBaseStatus] = useState<{
    isResolved: boolean;
    winner: number | null;
  } | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBridging, setIsBridging] = useState(false);

  const isMarketEnded = new Date(marketEndDate) < new Date();

  // Check resolution status on both chains
  const checkStatuses = useCallback(async () => {
    setIsLoading(true);

    // Check GenLayer status
    if (genLayerContractAddress) {
      const glStatus = await checkResolutionStatus(genLayerContractAddress);
      if (glStatus) {
        setGenLayerStatus(glStatus);
      }
    }

    // Check Base Sepolia status
    if (baseContractAddress) {
      const baseData = await readMarketData(baseContractAddress);
      if (baseData) {
        setBaseStatus({
          isResolved: baseData.isResolved,
          winner: baseData.winner,
        });
      }
    }

    setIsLoading(false);
  }, [genLayerContractAddress, baseContractAddress, checkResolutionStatus, readMarketData]);

  useEffect(() => {
    checkStatuses();
  }, [checkStatuses]);

  // Handle bridge action
  const handleBridge = async () => {
    if (!baseContractAddress || !genLayerStatus?.resolved) return;

    setIsBridging(true);
    
    const result = await resolveOnBase(baseContractAddress, genLayerStatus.outcome);
    
    if (result.success) {
      // Refresh statuses
      await checkStatuses();
      onBridgeComplete?.();
    }
    
    setIsBridging(false);
  };

  // Don't render if no contracts
  if (!genLayerContractAddress || !baseContractAddress) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-amber-500/20">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
            <span className="text-sm text-white/70">Checking resolution status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Both chains resolved
  if (genLayerStatus?.resolved && baseStatus?.isResolved) {
    const outcomeMatch = genLayerStatus.outcome === baseStatus.winner;
    
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-slate-900/70 to-slate-900/90 backdrop-blur-xl border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="text-sm font-semibold text-white/90">Resolution Bridged</span>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              ✓ Synced
            </Badge>
          </div>

          {/* Chain status row */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            {/* GenLayer */}
            <div className="flex-1 flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-400" />
              <span className="text-xs text-white/60 font-mono">GenLayer</span>
              <Badge className={`text-[10px] ${genLayerStatus.outcome === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {genLayerStatus.outcome === 1 ? 'YES' : 'NO'}
              </Badge>
            </div>
            
            {/* Arrow */}
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            
            {/* Base Sepolia */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              <Badge className={`text-[10px] ${baseStatus.winner === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {baseStatus.winner === 1 ? 'YES' : 'NO'}
              </Badge>
              <span className="text-xs text-white/60 font-mono">Base</span>
              <Zap className="h-4 w-4 text-blue-400" />
            </div>
          </div>

          <p className="text-[10px] text-white/40 mt-3 font-mono text-center">
            Winners can now claim their winnings on Base Sepolia
          </p>
        </CardContent>
      </Card>
    );
  }

  // GenLayer resolved but Base not resolved - SHOW BRIDGE BUTTON
  if (genLayerStatus?.resolved && !baseStatus?.isResolved) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-amber-950/30 via-slate-900/70 to-purple-950/30 backdrop-blur-xl border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
        {/* Animated border */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-amber-500/20 to-purple-500/20 animate-pulse" />
        </div>
        
        <CardContent className="relative p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-amber-400" />
                <div className="absolute inset-0 rounded-lg bg-amber-500/20 animate-ping" style={{ animationDuration: '2s' }} />
              </div>
              <span className="text-sm font-semibold text-white/90">Bridge Required</span>
            </div>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse">
              Action Needed
            </Badge>
          </div>

          <p className="text-xs text-white/60 mb-4">
            GenLayer AI has resolved the market. Bridge the outcome to Base Sepolia to enable winner payouts.
          </p>

          {/* Chain status row */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 mb-4">
            {/* GenLayer - Resolved */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-white/60 font-mono">GenLayer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                <Badge className={`text-[10px] ${genLayerStatus.outcome === 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {genLayerStatus.outcome === 1 ? 'YES' : 'NO'}
                </Badge>
              </div>
            </div>
            
            {/* Arrow */}
            <ArrowRight className="h-5 w-5 text-amber-400 animate-pulse" />
            
            {/* Base Sepolia - Pending */}
            <div className="flex-1 text-right">
              <div className="flex items-center gap-2 justify-end mb-1">
                <span className="text-xs text-white/60 font-mono">Base Sepolia</span>
                <Zap className="h-4 w-4 text-blue-400" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Badge className="text-[10px] bg-white/10 text-white/50 border-white/20">
                  Pending
                </Badge>
                <Loader2 className="h-3 w-3 text-white/30 animate-spin" />
              </div>
            </div>
          </div>

          {/* Bridge Button */}
          {!isConnected ? (
            <p className="text-xs text-white/40 text-center font-mono">
              Connect wallet to bridge resolution
            </p>
          ) : !isOnBase ? (
            <Button
              onClick={switchToBase}
              variant="outline"
              className="w-full gap-2 bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20 text-blue-400"
            >
              <Zap className="h-4 w-4" />
              Switch to Base Sepolia
            </Button>
          ) : (
            <Button
              onClick={handleBridge}
              disabled={isBridging || isPending}
              className="w-full gap-2 bg-gradient-to-r from-purple-500 to-amber-500 hover:from-purple-600 hover:to-amber-600 text-white font-semibold shadow-[0_4px_0_0_rgba(139,92,246,0.5),0_6px_20px_rgba(168,85,247,0.3)] active:shadow-[0_2px_0_0_rgba(139,92,246,0.5)] active:translate-y-[2px] transition-all"
            >
              {isBridging || isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Bridging to Base...
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" />
                  Bridge Resolution ({genLayerStatus.outcome === 1 ? 'YES' : 'NO'})
                </>
              )}
            </Button>
          )}

          {/* AI Reasoning Preview */}
          {genLayerStatus.reasoning && (
            <div className="mt-3 p-2 rounded-lg bg-white/[0.02] border border-white/5">
              <p className="text-[10px] text-white/40 font-mono mb-1">AI Reasoning:</p>
              <p className="text-[11px] text-white/60 line-clamp-2">
                {genLayerStatus.reasoning}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Neither resolved yet
  if (!genLayerStatus?.resolved) {
    return (
      <Card className="relative overflow-hidden bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-800/30 backdrop-blur-xl border-white/10">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Link2 className="h-4 w-4 text-white/40" />
              </div>
              <span className="text-sm font-medium text-white/70">Resolution Bridge</span>
            </div>
            <Badge className="bg-white/10 text-white/50 border-white/10">
              Waiting
            </Badge>
          </div>

          <p className="text-xs text-white/50 mb-3">
            {isMarketEnded 
              ? "Waiting for GenLayer AI to resolve the market first."
              : "Market must end before resolution can begin."
            }
          </p>

          {/* Chain status row */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
            {/* GenLayer */}
            <div className="flex-1 flex items-center gap-2">
              <Brain className="h-4 w-4 text-white/30" />
              <span className="text-xs text-white/40 font-mono">GenLayer</span>
              <Badge className="text-[10px] bg-white/5 text-white/40 border-white/10">
                Pending
              </Badge>
            </div>
            
            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-white/20" />
            
            {/* Base */}
            <div className="flex-1 flex items-center gap-2 justify-end">
              <Badge className="text-[10px] bg-white/5 text-white/40 border-white/10">
                Pending
              </Badge>
              <span className="text-xs text-white/40 font-mono">Base</span>
              <Zap className="h-4 w-4 text-white/30" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
};
