import { Zap, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IntelligentContractBadgeProps {
  contractAddress?: string | null;
  resolutionSource?: string | null;
}

export const IntelligentContractBadge = ({
  contractAddress,
  resolutionSource,
}: IntelligentContractBadgeProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className="gap-1 cursor-help border-chart-3/30 text-chart-3 hover:bg-chart-3/10"
        >
          <Zap className="h-3 w-3" />
          Intelligent Contract
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="font-medium">Powered by GenLayer</p>
          <p className="text-xs text-muted-foreground">
            This market uses an Intelligent Contract for resolution, enabling non-deterministic
            decision-making through validator consensus.
          </p>
          {resolutionSource && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs">
                <span className="text-muted-foreground">Data Source:</span>{" "}
                {resolutionSource}
              </p>
            </div>
          )}
          {contractAddress && (
            <a
              href={`https://explorer-asimov.genlayer.com/contract/${contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-chart-3 hover:underline"
            >
              View Contract
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
