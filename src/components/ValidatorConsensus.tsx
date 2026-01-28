import { Users, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidatorConsensusProps {
  validatorCount: number;
  consensusPercentage?: number | null;
  status: string;
  className?: string;
}

export const ValidatorConsensus = ({
  validatorCount,
  consensusPercentage,
  status,
  className,
}: ValidatorConsensusProps) => {
  const getStatusConfig = () => {
    switch (status) {
      case "resolved_yes":
        return {
          icon: CheckCircle2,
          label: "Resolved YES",
          color: "text-yes",
          bg: "bg-yes-light",
        };
      case "resolved_no":
        return {
          icon: CheckCircle2,
          label: "Resolved NO",
          color: "text-no",
          bg: "bg-no-light",
        };
      case "pending_resolution":
        return {
          icon: Clock,
          label: "Pending Resolution",
          color: "text-amber-600",
          bg: "bg-amber-50",
        };
      case "disputed":
        return {
          icon: AlertTriangle,
          label: "Disputed",
          color: "text-destructive",
          bg: "bg-destructive/10",
        };
      default:
        return {
          icon: Clock,
          label: "Open",
          color: "text-muted-foreground",
          bg: "bg-secondary",
        };
    }
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div className={cn("p-4 rounded-lg border border-border", className)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          Validator Consensus
        </span>
        <span className={cn("text-xs px-2 py-1 rounded-full", config.bg, config.color)}>
          <StatusIcon className="h-3 w-3 inline mr-1" />
          {config.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-semibold">{validatorCount}</p>
          <p className="text-xs text-muted-foreground">Active Validators</p>
        </div>
        {consensusPercentage !== null && consensusPercentage !== undefined && (
          <div>
            <p className="text-2xl font-semibold">{consensusPercentage}%</p>
            <p className="text-xs text-muted-foreground">Consensus</p>
          </div>
        )}
      </div>

      {status === "open" && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Resolution will be determined by validator consensus using GenLayer's Intelligent Contracts
          </p>
        </div>
      )}
    </div>
  );
};
