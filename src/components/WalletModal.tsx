import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ExternalLink,
  Loader2,
  Check,
  Copy,
  LogOut,
  Zap,
  AlertTriangle,
  ArrowRightLeft,
  Droplets,
  Brain,
  Coins,
} from "lucide-react";
import { useWalletAuth, formatAddress } from "@/contexts/WalletAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WalletModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WalletModal = ({ open, onOpenChange }: WalletModalProps) => {
  const {
    address,
    balance,
    isConnecting,
    isConnected,
    hasMetaMask,
    connect,
    disconnect,
    refreshBalance,
    networkName,
    chainId,
    switchToGenLayer,
    switchToBase,
  } = useWalletAuth();
  const [copied, setCopied] = useState(false);
  const [isRequestingFaucet, setIsRequestingFaucet] = useState<string | null>(null);
  const [faucetTab, setFaucetTab] = useState("genlayer");

  const isOnGenLayer = chainId === 4221;
  const isOnBase = chainId === 84532;

  const handleConnect = async () => {
    await connect();
    if (!isConnecting) {
      setTimeout(() => onOpenChange(false), 500);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    onOpenChange(false);
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const requestGenLayerFaucet = async () => {
    if (!address) return;
    
    if (!isOnGenLayer) {
      toast.info("Switching to GenLayer Testnet...");
      try {
        await switchToGenLayer();
      } catch {
        toast.error("Couldn't switch network");
        return;
      }
    }
    
    setIsRequestingFaucet("genlayer");
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Please try again later";
      toast.error("Faucet request failed", {
        description: errorMessage,
        action: {
          label: "Official Faucet",
          onClick: () => window.open("https://www.genlayer.com/testnet", "_blank"),
        },
      });
    } finally {
      setIsRequestingFaucet(null);
    }
  };

  const requestBaseFaucet = async (token: "ETH" | "USDC") => {
    if (!address) return;

    if (!isOnBase) {
      toast.info("Switching to Base Sepolia...");
      try {
        await switchToBase();
      } catch {
        toast.error("Couldn't switch network");
        return;
      }
    }

    setIsRequestingFaucet(`base-${token}`);
    try {
      const { data, error } = await supabase.functions.invoke("base-faucet", {
        body: { address, token },
      });

      if (error) throw new Error(error.message);

      if (data?.faucets && data.faucets.length > 0) {
        const firstFaucet = data.faucets[0];
        toast.success(`Opening ${token} faucet`, {
          description: firstFaucet.description,
        });
        window.open(firstFaucet.url, "_blank");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Faucet request failed";
      toast.error("Faucet request failed", {
        description: errorMessage,
      });
    } finally {
      setIsRequestingFaucet(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isConnected ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? `Connected to ${networkName}`
              : "Connect your MetaMask wallet to trade on GenLayer prediction markets"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isConnected && address ? (
            <>
              {/* Network Warning */}
              {!isOnGenLayer && (
                <div className="p-3 border border-amber-500/30 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-700 dark:text-amber-500">
                        Wrong Network
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Switch to GenLayer Testnet for trading
                      </p>
                    </div>
                    <Button size="sm" onClick={switchToGenLayer} className="gap-1">
                      <ArrowRightLeft className="h-3 w-3" />
                      Switch
                    </Button>
                  </div>
                </div>
              )}

              {/* Connected State */}
              <div className={`p-4 border rounded-lg ${isOnGenLayer ? 'border-yes/30 bg-yes-light' : 'border-border'}`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnGenLayer ? 'bg-yes/20' : 'bg-muted'}`}>
                    {isOnGenLayer ? (
                      <Check className="h-5 w-5 text-yes" />
                    ) : (
                      <Wallet className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {isOnGenLayer ? "Connected" : "Connected (Wrong Network)"}
                    </p>
                    <p className="text-xs text-muted-foreground">{networkName}</p>
                  </div>
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                    alt="MetaMask"
                    className="h-6 w-6"
                  />
                </div>

                {/* Address Display */}
                <div className="flex items-center gap-2 p-3 bg-background rounded-lg border border-border">
                  <Zap className="h-4 w-4 text-chart-3" />
                  <code className="flex-1 text-sm font-mono">
                    {formatAddress(address)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-yes" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Balance */}
              <div className="p-4 border border-border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="text-xs px-2 py-0.5 bg-chart-3/10 text-chart-3 rounded-full">
                    {isOnGenLayer ? "GenLayer" : isOnBase ? "Base Sepolia" : "Testnet"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-semibold">
                      {balance ? `${parseFloat(balance).toFixed(4)}` : "0.0000"}{" "}
                      <span className="text-lg text-muted-foreground">
                        {isOnGenLayer ? "GEN" : "ETH"}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isOnGenLayer ? "GenLayer Testnet Tokens" : isOnBase ? "Base Sepolia Testnet" : "Wallet Balance"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Multi-Chain Faucets */}
              <div className="border border-border rounded-lg overflow-hidden">
                <Tabs value={faucetTab} onValueChange={setFaucetTab}>
                  <TabsList className="grid w-full grid-cols-2 h-auto p-0 bg-muted/50">
                    <TabsTrigger value="genlayer" className="gap-1.5 py-2.5 data-[state=active]:bg-background rounded-none">
                      <Brain className="h-3.5 w-3.5" />
                      GenLayer
                    </TabsTrigger>
                    <TabsTrigger value="base" className="gap-1.5 py-2.5 data-[state=active]:bg-background rounded-none">
                      <Zap className="h-3.5 w-3.5" />
                      Base Sepolia
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="genlayer" className="p-3 space-y-2 mt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant={isOnGenLayer ? "default" : "secondary"} className="text-xs">
                        {isOnGenLayer ? "Connected" : "Not Connected"}
                      </Badge>
                      <span>AI-powered resolution</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={requestGenLayerFaucet}
                      disabled={isRequestingFaucet === "genlayer"}
                      className="w-full gap-2"
                    >
                      {isRequestingFaucet === "genlayer" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Coins className="h-4 w-4" />
                      )}
                      Request GEN Tokens
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-2 text-xs"
                      onClick={() => window.open("https://www.genlayer.com/testnet", "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Official GenLayer Faucet
                    </Button>
                  </TabsContent>

                  <TabsContent value="base" className="p-3 space-y-2 mt-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant={isOnBase ? "default" : "secondary"} className="text-xs">
                        {isOnBase ? "Connected" : "Not Connected"}
                      </Badge>
                      <span>Fast L2 trading</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestBaseFaucet("ETH")}
                        disabled={isRequestingFaucet === "base-ETH"}
                        className="gap-1.5"
                      >
                        {isRequestingFaucet === "base-ETH" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Coins className="h-3.5 w-3.5" />
                        )}
                        Get ETH
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => requestBaseFaucet("USDC")}
                        disabled={isRequestingFaucet === "base-USDC"}
                        className="gap-1.5"
                      >
                        {isRequestingFaucet === "base-USDC" ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Coins className="h-3.5 w-3.5" />
                        )}
                        Get USDC
                      </Button>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full gap-2 text-xs"
                      onClick={() => window.open("https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet", "_blank")}
                    >
                      <ExternalLink className="h-3 w-3" />
                      Coinbase Base Faucet
                    </Button>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDisconnect}
                >
                  <LogOut className="h-4 w-4" />
                  Disconnect
                </Button>
                <Button asChild className="flex-1 gap-2">
                  <a
                    href={
                      isOnGenLayer
                        ? `https://explorer-asimov.genlayer.com/address/${address}`
                        : `https://etherscan.io/address/${address}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View on Explorer
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* MetaMask Option */}
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full p-4 border border-border rounded-lg hover:border-[#f6851b]/50 hover:bg-[#f6851b]/5 transition-colors text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg"
                    alt="MetaMask"
                    className="w-12 h-12"
                  />
                  <div className="flex-1">
                    <p className="font-medium">MetaMask</p>
                    <p className="text-xs text-muted-foreground">
                      {hasMetaMask
                        ? "Connect with MetaMask"
                        : "Click to install MetaMask"}
                    </p>
                  </div>
                  {isConnecting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#f6851b]" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#f6851b]/10 flex items-center justify-center">
                      <Wallet className="h-4 w-4 text-[#f6851b]" />
                    </div>
                  )}
                </div>
              </button>

              {/* GenLayer Wallet Option (Coming Soon) */}
              <div className="p-4 border border-dashed border-border rounded-lg opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-chart-3 to-chart-4 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">GL</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">GenLayer Wallet</p>
                    <p className="text-xs text-muted-foreground">
                      Coming with mainnet launch
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-muted rounded-full">
                    Soon
                  </span>
                </div>
              </div>

              {/* Testnet Info */}
              <div className="p-4 border border-chart-3/30 rounded-lg bg-chart-3/5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-chart-3/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-4 w-4 text-chart-3" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-chart-3">
                      GenLayer Testnet
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      After connecting, you'll be prompted to switch to GenLayer
                      Testnet. Use the faucet to get testnet tokens.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Learn More */}
          <a
            href="https://docs.genlayer.com/developers/intelligent-contracts"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Learn about GenLayer
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};
