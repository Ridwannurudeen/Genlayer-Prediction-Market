import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Zap, Layers, Cpu, Database } from "lucide-react";
import type { NetworkType } from "@/lib/solidityPredictionMarket";

interface NetworkSelectorProps {
  value: NetworkType;
  onChange: (value: NetworkType) => void;
  disabled?: boolean;
  className?: string;
}

const networkOptions: {
  value: NetworkType;
  label: string;
  description: string;
  icon: React.ElementType;
  features: string[];
}[] = [
  {
    value: "simulated",
    label: "Simulated",
    description: "Off-chain database trading",
    icon: Database,
    features: ["No gas fees", "Instant trades", "Admin resolution"],
  },
  {
    value: "genlayer",
    label: "GenLayer Only",
    description: "AI-powered resolution",
    icon: Cpu,
    features: ["Trustless resolution", "Validator consensus", "Python contracts"],
  },
  {
    value: "base",
    label: "Base Only",
    description: "Fast L2 trading",
    icon: Layers,
    features: ["Low gas fees", "Fast confirmations", "EVM compatible"],
  },
  {
    value: "hybrid",
    label: "Base + GenLayer",
    description: "Best of both worlds",
    icon: Zap,
    features: ["Base trading", "AI resolution", "Cross-chain bridge"],
  },
];

export const NetworkSelector = ({
  value,
  onChange,
  disabled = false,
  className,
}: NetworkSelectorProps) => {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as NetworkType)}
      className={cn("grid grid-cols-1 md:grid-cols-2 gap-3", className)}
      disabled={disabled}
    >
      {networkOptions.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <Label
            key={option.value}
            htmlFor={option.value}
            className={cn(
              "relative flex flex-col p-4 rounded-lg border-2 cursor-pointer transition-all",
              isSelected
                ? "border-primary bg-primary/5"
                : "border-border hover:border-muted-foreground/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div className="flex items-start gap-3">
              <RadioGroupItem
                value={option.value}
                id={option.value}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isSelected ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span className="font-medium">{option.label}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  {option.description}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {option.features.map((feature) => (
                    <span
                      key={feature}
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Label>
        );
      })}
    </RadioGroup>
  );
};
