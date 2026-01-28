import { useState } from "react";
import { Droplets, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FaucetButtonProps {
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

const OFFICIAL_FAUCET_URL = "https://www.genlayer.com/testnet";

export const FaucetButton = ({ 
  variant = "outline", 
  size = "sm",
  className = "",
  showIcon = true,
}: FaucetButtonProps) => {
  const { address, isConnected, chainId, switchToGenLayer, refreshBalance } = useWalletAuth();
  const isOnGenLayer = chainId === 4221;
  const [isRequesting, setIsRequesting] = useState(false);

  const openOfficialFaucet = () => {
    window.open(OFFICIAL_FAUCET_URL, "_blank");
  };

  const requestTokens = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnGenLayer) {
      toast.info("Switching to GenLayer Testnet...", {
        description: "Confirm the network change in your wallet",
      });

      try {
        await switchToGenLayer();
      } catch (err: unknown) {
        toast.error("Couldn't switch network", {
          description: "Please switch to GenLayer Testnet to use the faucet",
        });
        return;
      }

      // Re-check chain after switching (state update may lag behind)
      const chainIdHex = (await window.ethereum?.request({ method: "eth_chainId" })) as string | undefined;
      const switchedChainId = chainIdHex ? parseInt(chainIdHex, 16) : null;
      if (switchedChainId !== 4221) {
        toast.info("Still on the wrong network", {
          description: "Please switch to GenLayer Testnet to request tokens",
        });
        return;
      }
    }

    setIsRequesting(true);

    try {
      const { data, error } = await supabase.functions.invoke("genlayer-faucet", {
        body: { address },
      });

      if (error) {
        throw new Error(error.message || "Faucet request failed");
      }

      // Check for faucet unavailable response
      if (data?.fallbackUrl) {
        toast.info("Faucet API unavailable", {
          description: "Opening official GenLayer faucet...",
          action: {
            label: "Open Faucet",
            onClick: openOfficialFaucet,
          },
        });
        openOfficialFaucet();
        return;
      }

      if (data?.error) {
        // Handle specific faucet errors
        if (data.error.includes("rate") || data.error.includes("limit") || data.error.includes("wait")) {
          toast.error("Rate limited", {
            description: "Please wait before requesting more tokens",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast.success("Tokens requested!", {
        description: "Testnet tokens are being sent to your wallet",
        action: {
          label: "View Explorer",
          onClick: () => window.open(`https://explorer-asimov.genlayer.com/address/${address}`, "_blank"),
        },
      });

      // Refresh balance after a short delay
      setTimeout(() => {
        refreshBalance();
      }, 3000);
    } catch (error: any) {
      console.error("Faucet error:", error);
      
      // For any error, offer the official faucet as fallback
      toast.error("Faucet request failed", {
        description: "Try the official GenLayer faucet instead",
        action: {
          label: "Open Faucet",
          onClick: openOfficialFaucet,
        },
      });
    } finally {
      setIsRequesting(false);
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={variant}
        size={size}
        onClick={requestTokens}
        disabled={isRequesting}
        className={`gap-2 ${className}`}
      >
        {isRequesting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Requesting...
          </>
        ) : (
          <>
            {showIcon && <Droplets className="h-4 w-4" />}
            Get Testnet GEN
          </>
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={openOfficialFaucet}
        title="Open official GenLayer faucet"
        className="h-8 w-8"
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
    </div>
  );
};
