import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWalletAuth, formatAddress } from "@/contexts/WalletAuthContext";
import { usePositions, useTrades } from "@/hooks/usePositions";
import { WalletModal } from "@/components/WalletModal";
import { MultiFaucet } from "@/components/MultiFaucet";
import { Wallet, TrendingUp, TrendingDown, Clock, ArrowRight, Zap, Copy, Check, Brain, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const Portfolio = () => {
  const { address, balance, isConnected, networkName, chainId, profile } = useWalletAuth();
  const { data: positions, isLoading: positionsLoading } = usePositions();
  const { data: trades, isLoading: tradesLoading } = useTrades();
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-16 text-center">
          <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-semibold mb-2">Connect wallet to view your portfolio</h1>
          <p className="text-muted-foreground mb-6">Track your positions and trading history</p>
          <Button onClick={() => setWalletModalOpen(true)}>
            Connect Wallet
          </Button>
        </main>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
      </div>
    );
  }

  const totalInvested = positions?.reduce((sum, p) => sum + Number(p.total_invested), 0) || 0;
  const currentValue = positions?.reduce((sum, p) => {
    const marketProb = p.position_type === "yes" 
      ? p.market.probability / 100 
      : (100 - p.market.probability) / 100;
    return sum + Number(p.shares) * marketProb;
  }, 0) || 0;
  const pnl = currentValue - totalInvested;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-6">
        <h1 className="text-2xl font-semibold mb-6">Portfolio</h1>

        {/* Wallet Card */}
        <Card className="mb-6">
          <CardContent className="p-4">
            {isConnected && address ? (
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center">
                    {chainId === 4221 ? (
                      <Brain className="h-6 w-6 text-white" />
                    ) : chainId === 84532 ? (
                      <Zap className="h-6 w-6 text-white" />
                    ) : (
                      <Wallet className="h-6 w-6 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{networkName}</p>
                      <Badge variant="outline" className="text-xs border-yes/30 text-yes">
                        Connected
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-sm text-muted-foreground font-mono">
                        {formatAddress(address)}
                      </code>
                      <button onClick={copyAddress} className="p-1 hover:bg-secondary rounded">
                        {copied ? (
                          <Check className="h-3 w-3 text-yes" />
                        ) : (
                          <Copy className="h-3 w-3 text-muted-foreground" />
                        )}
                      </button>
                      <a 
                        href={
                          chainId === 4221 
                            ? `https://explorer-asimov.genlayer.com/address/${address}`
                            : chainId === 84532
                            ? `https://sepolia.basescan.org/address/${address}`
                            : `https://etherscan.io/address/${address}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 hover:bg-secondary rounded"
                      >
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold">
                    {balance ? parseFloat(balance).toFixed(4) : "0.0000"}{" "}
                    <span className="text-lg text-muted-foreground">
                      {chainId === 4221 ? "GEN" : "ETH"}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {chainId === 4221 ? "GenLayer Testnet" : chainId === 84532 ? "Base Sepolia" : "Wallet Balance"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">No Wallet Connected</p>
                    <p className="text-sm text-muted-foreground">
                      Connect to start trading on GenLayer
                    </p>
                  </div>
                </div>
                <Button onClick={() => setWalletModalOpen(true)}>
                  Connect Wallet
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Multi-Chain Faucet - Only show when connected */}
        {isConnected && (
          <MultiFaucet className="mb-6" />
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Value</p>
              <p className="text-2xl font-semibold">{formatCurrency(currentValue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Invested</p>
              <p className="text-2xl font-semibold">{formatCurrency(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Profit / Loss</p>
              <p className={cn(
                "text-2xl font-semibold",
                pnl >= 0 ? "text-yes" : "text-no"
              )}>
                {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Positions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            {positionsLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : positions && positions.length > 0 ? (
              <div className="space-y-3">
                {positions.map((position) => (
                  <Link
                    key={position.id}
                    to={`/market/${position.market_id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm line-clamp-1">{position.market.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={position.position_type === "yes" ? "default" : "destructive"} className={position.position_type === "yes" ? "bg-yes" : "bg-no"}>
                          {position.position_type.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Number(position.shares).toFixed(2)} shares @ {(Number(position.avg_price) * 100).toFixed(0)}¢
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(Number(position.total_invested))}</p>
                      <p className="text-xs text-muted-foreground">
                        Current: {position.market.probability}%
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 ml-2 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No open positions. Start trading to build your portfolio!
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Trades</CardTitle>
          </CardHeader>
          <CardContent>
            {tradesLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : trades && trades.length > 0 ? (
              <div className="space-y-2">
                {trades.map((trade: any) => (
                  <div
                    key={trade.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        trade.position_type === "yes" ? "bg-yes-light" : "bg-no-light"
                      )}>
                        {trade.trade_type === "buy" ? (
                          <TrendingUp className={cn("h-4 w-4", trade.position_type === "yes" ? "text-yes" : "text-no")} />
                        ) : (
                          <TrendingDown className={cn("h-4 w-4", trade.position_type === "yes" ? "text-yes" : "text-no")} />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {trade.trade_type.toUpperCase()} {trade.position_type.toUpperCase()}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          {trade.market?.title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(Number(trade.total_amount))}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatDate(trade.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No trades yet. Place your first trade!
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};

export default Portfolio;
