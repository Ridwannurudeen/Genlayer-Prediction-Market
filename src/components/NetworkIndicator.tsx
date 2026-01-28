import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { BASE_SEPOLIA, getNetworkDisplayName, type NetworkType } from "@/lib/solidityPredictionMarket";
import { Zap, Layers, AlertCircle, Check } from "lucide-react";

interface NetworkIndicatorProps {
  requiredNetwork?: NetworkType;
  showSwitchButton?: boolean;
  className?: string;
}

export const NetworkIndicator = ({
  requiredNetwork,
  showSwitchButton = true,
  className,
}: NetworkIndicatorProps) => {
  const { chainId, switchToGenLayer, isConnected } = useWalletAuth();

  if (!isConnected) {
    return null;
  }

  const isOnGenLayer = chainId === 4221;
  const isOnBase = chainId === BASE_SEPOLIA.chainIdNumber;

  const switchToBase = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainId }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BASE_SEPOLIA],
        });
      }
    }
  };

  // Determine what to show based on required network
  const getRequiredNetworkStatus = () => {
    if (!requiredNetwork) return null;

    switch (requiredNetwork) {
      case "genlayer":
        return {
          isCorrect: isOnGenLayer,
          networkName: "GenLayer",
          switchFn: switchToGenLayer,
          icon: Zap,
        };
      case "base":
        return {
          isCorrect: isOnBase,
          networkName: "Base Sepolia",
          switchFn: switchToBase,
          icon: Layers,
        };
      case "hybrid":
        // For hybrid, either network works for different operations
        return {
          isCorrect: isOnGenLayer || isOnBase,
          networkName: isOnGenLayer ? "GenLayer" : isOnBase ? "Base Sepolia" : "GenLayer or Base",
          switchFn: isOnGenLayer ? undefined : switchToGenLayer,
          icon: isOnGenLayer ? Zap : Layers,
        };
      default:
        return null;
    }
  };

  const status = getRequiredNetworkStatus();

  // If no required network specified, just show current network
  if (!status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                "gap-1.5 cursor-default",
                isOnGenLayer && "border-chart-3/50 text-chart-3",
                isOnBase && "border-blue-500/50 text-blue-500",
                !isOnGenLayer && !isOnBase && "border-orange-500/50 text-orange-500",
                className
              )}
            >
              {isOnGenLayer && <Zap className="h-3 w-3" />}
              {isOnBase && <Layers className="h-3 w-3" />}
              {!isOnGenLayer && !isOnBase && <AlertCircle className="h-3 w-3" />}
              {isOnGenLayer ? "GenLayer" : isOnBase ? "Base" : `Chain ${chainId}`}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              Connected to{" "}
              {isOnGenLayer
                ? "GenLayer Asimov Testnet"
                : isOnBase
                ? "Base Sepolia Testnet"
                : `Chain ID ${chainId}`}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show status for required network
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={status.isCorrect ? "default" : "destructive"}
              className={cn(
                "gap-1.5",
                status.isCorrect && "bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20"
              )}
            >
              {status.isCorrect ? (
                <Check className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
              {status.isCorrect ? status.networkName : "Wrong Network"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {status.isCorrect ? (
              <p>Connected to {status.networkName}</p>
            ) : (
              <p>Please switch to {status.networkName} to continue</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {!status.isCorrect && showSwitchButton && status.switchFn && (
        <Button
          variant="outline"
          size="sm"
          onClick={status.switchFn}
          className="gap-1.5 h-7 text-xs"
        >
          <status.icon className="h-3 w-3" />
          Switch to {status.networkName}
        </Button>
      )}
    </div>
  );
};
