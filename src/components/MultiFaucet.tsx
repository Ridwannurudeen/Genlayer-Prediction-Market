import { useState } from "react";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Droplets, ExternalLink, Loader2, Coins, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface FaucetEndpoint {
  type: string;
  url: string;
  description: string;
}

interface MultiFaucetProps {
  className?: string;
}

export const MultiFaucet = ({ className }: MultiFaucetProps) => {
  const { address, isConnected, chainId, switchToGenLayer, switchToBase, refreshBalance } = useWalletAuth();
  const [isRequesting, setIsRequesting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("genlayer");

  const isOnGenLayer = chainId === 4221;
  const isOnBase = chainId === 84532;

  const requestGenLayerTokens = async () => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnGenLayer) {
      toast.info("Switching to GenLayer Testnet...");
      try {
        await switchToGenLayer();
      } catch (err) {
        toast.error("Couldn't switch network");
        return;
      }
    }

    setIsRequesting("genlayer");
    try {
      const { data, error } = await supabase.functions.invoke("genlayer-faucet", {
        body: { address },
      });

      if (error) throw new Error(error.message);

      if (data?.fallbackUrl) {
        toast.info("Opening official GenLayer faucet...");
        window.open(data.fallbackUrl, "_blank");
        return;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("GEN tokens requested!", {
        description: "Testnet tokens are being sent to your wallet",
      });

      setTimeout(() => refreshBalance(), 3000);
    } catch (error: any) {
      toast.error("Faucet request failed", {
        description: "Try the official GenLayer faucet",
        action: {
          label: "Open Faucet",
          onClick: () => window.open("https://www.genlayer.com/testnet", "_blank"),
        },
      });
    } finally {
      setIsRequesting(null);
    }
  };

  const requestBaseTokens = async (token: "ETH" | "USDC") => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isOnBase) {
      toast.info("Switching to Base Sepolia...");
      try {
        await switchToBase();
      } catch (err) {
        toast.error("Couldn't switch network");
        return;
      }
    }

    setIsRequesting(`base-${token}`);
    try {
      const { data, error } = await supabase.functions.invoke("base-faucet", {
        body: { address, token },
      });

      if (error) throw new Error(error.message);

      if (data?.faucets && data.faucets.length > 0) {
        const firstFaucet = data.faucets[0] as FaucetEndpoint;
        toast.success(`Opening ${token} faucet`, {
          description: firstFaucet.description,
        });
        window.open(firstFaucet.url, "_blank");
      }
    } catch (error: any) {
      toast.error("Faucet request failed", {
        description: error.message,
      });
    } finally {
      setIsRequesting(null);
    }
  };

  if (!isConnected) {
    return (
      <Card className={cn("border-dashed border-muted", className)}>
        <CardContent className="py-8 text-center">
          <Droplets className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Connect your wallet to request testnet tokens</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-primary" />
          Testnet Faucets
        </CardTitle>
        <CardDescription>
          Get testnet tokens for GenLayer intelligent contracts and Base Sepolia trading
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="genlayer" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              GenLayer
              <Badge variant="secondary" className="ml-1 text-xs">
                AI Resolution
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="base" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Base Sepolia
              <Badge variant="outline" className="ml-1 text-xs">
                Trading
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="genlayer" className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">GenLayer Testnet (GEN)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Powers AI-driven market resolution via intelligent contracts. GenLayer validators use consensus to determine market outcomes.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={isOnGenLayer ? "default" : "secondary"}>
                      {isOnGenLayer ? "Connected" : "Not Connected"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Chain ID: 4221</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                onClick={requestGenLayerTokens}
                disabled={isRequesting === "genlayer"}
                className="w-full"
              >
                {isRequesting === "genlayer" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Coins className="mr-2 h-4 w-4" />
                    Request GEN Tokens
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open("https://www.genlayer.com/testnet", "_blank")}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Official GenLayer Faucet
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="base" className="space-y-4">
            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-500/10">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium">Base Sepolia Testnet</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fast & cheap EVM trading on Coinbase's L2. Buy and sell shares while GenLayer handles intelligent resolution.
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Badge variant={isOnBase ? "default" : "secondary"}>
                      {isOnBase ? "Connected" : "Not Connected"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Chain ID: 84532</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Button
                  onClick={() => requestBaseTokens("ETH")}
                  disabled={isRequesting === "base-ETH"}
                  className="w-full"
                  variant="outline"
                >
                  {isRequesting === "base-ETH" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="mr-2 h-4 w-4" />
                  )}
                  Get ETH
                </Button>
                <p className="text-xs text-center text-muted-foreground">For gas fees</p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={() => requestBaseTokens("USDC")}
                  disabled={isRequesting === "base-USDC"}
                  className="w-full"
                  variant="outline"
                >
                  {isRequesting === "base-USDC" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Coins className="mr-2 h-4 w-4" />
                  )}
                  Get USDC
                </Button>
                <p className="text-xs text-center text-muted-foreground">For trading</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                onClick={() => window.open("https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet", "_blank")}
                className="w-full"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Coinbase Base Faucet
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.open("https://faucet.circle.com/", "_blank")}
                className="w-full text-muted-foreground"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Circle USDC Faucet
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Your Address</span>
            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
