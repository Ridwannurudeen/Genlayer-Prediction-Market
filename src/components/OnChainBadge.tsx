import { ExternalLink, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OnChainBadgeProps {
  contractAddress?: string | null;
  compact?: boolean;
}

export const OnChainBadge = ({ contractAddress, compact = false }: OnChainBadgeProps) => {
  if (!contractAddress) {
    return null;
  }

  const explorerUrl = `https://explorer-asimov.genlayer.com/address/${contractAddress}`;
  const shortAddress = `${contractAddress.slice(0, 6)}...${contractAddress.slice(-4)}`;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs text-chart-3 border-chart-3/30 bg-chart-3/10 cursor-pointer hover:bg-chart-3/20 gap-1"
              onClick={() => window.open(explorerUrl, "_blank")}
            >
              <Zap className="h-3 w-3" />
              On-Chain
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-mono text-xs">{contractAddress}</p>
            <p className="text-muted-foreground text-xs mt-1">Click to view on explorer</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-3/10 border border-chart-3/30 cursor-pointer hover:bg-chart-3/20 transition-colors"
      onClick={() => window.open(explorerUrl, "_blank")}
    >
      <Zap className="h-4 w-4 text-chart-3" />
      <span className="text-sm font-medium text-chart-3">Live on GenLayer</span>
      <code className="text-xs font-mono text-muted-foreground hidden sm:inline">
        {shortAddress}
      </code>
      <ExternalLink className="h-3.5 w-3.5 text-chart-3" />
    </div>
  );
};
