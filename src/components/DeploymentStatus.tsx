import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BASE_SEPOLIA } from "@/lib/solidityPredictionMarket";

interface DeploymentStatusProps {
  status: {
    step: "idle" | "deploying" | "confirming" | "complete" | "error";
    message: string;
    contractAddress?: string;
    txHash?: string;
    error?: string;
  };
  onRetry?: () => void;
}

export const DeploymentStatus = ({ status, onRetry }: DeploymentStatusProps) => {
  if (status.step === "idle") return null;

  const steps = [
    { key: "deploying", label: "Preparing contract" },
    { key: "confirming", label: "Connecting to Base Sepolia" },
    { key: "complete", label: "Market ready" },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === status.step);

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 mb-4">
        {status.step === "error" ? (
          <XCircle className="h-5 w-5 text-destructive" />
        ) : status.step === "complete" ? (
          <CheckCircle2 className="h-5 w-5 text-green-500" />
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
        )}
        <span className="font-medium">
          {status.step === "error" ? "Setup Failed" : 
           status.step === "complete" ? "Setup Complete" : 
           "Setting Up Market"}
        </span>
      </div>

      <div className="space-y-3 mb-4">
        {steps.map((step, index) => {
          const isActive = step.key === status.step;
          const isComplete = status.step === "complete" || 
            (currentStepIndex > index && status.step !== "error");
          const isFailed = status.step === "error" && step.key === steps[currentStepIndex]?.key;

          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs
                ${isComplete ? "bg-green-500 text-white" : 
                  isFailed ? "bg-destructive text-white" :
                  isActive ? "bg-blue-500 text-white" : 
                  "bg-secondary text-muted-foreground"}`}>
                {isComplete ? "✓" : isFailed ? "×" : index + 1}
              </div>
              <span className={`text-sm ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {isActive && status.step !== "complete" && status.step !== "error" && (
                <Loader2 className="h-3 w-3 animate-spin ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      {status.error && (
        <div className="p-3 rounded bg-destructive/10 text-destructive text-sm mb-4">
          {status.error}
        </div>
      )}

      {status.contractAddress && status.step === "complete" && (
        <div className="p-3 rounded bg-green-500/10 text-green-700 dark:text-green-400 text-sm mb-4">
          <p className="font-medium mb-1">Contract Connected!</p>
          <a 
            href={`${BASE_SEPOLIA.blockExplorerUrls[0]}/address/${status.contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs hover:underline"
          >
            {status.contractAddress.slice(0, 10)}...{status.contractAddress.slice(-8)}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {status.txHash && (
        <a
          href={`${BASE_SEPOLIA.blockExplorerUrls[0]}/tx/${status.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
        >
          View transaction
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      {status.step === "error" && onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="mt-2">
          Try Again
        </Button>
      )}
    </div>
  );
};
