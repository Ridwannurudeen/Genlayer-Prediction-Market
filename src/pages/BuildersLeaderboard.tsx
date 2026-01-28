import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award, ExternalLink, Copy, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/hooks/useWallet";

interface BuilderStats {
  deployer_wallet: string;
  deployment_count: number;
  total_volume: number;
}

const BuildersLeaderboard = () => {
  const { address } = useWallet();
  const { toast } = useToast();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const { data: builders, isLoading } = useQuery({
    queryKey: ["builders-leaderboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markets")
        .select("deployer_wallet, volume")
        .not("deployer_wallet", "is", null);

      if (error) throw error;

      // Aggregate by wallet
      const walletStats = data.reduce((acc, market) => {
        const wallet = market.deployer_wallet!;
        if (!acc[wallet]) {
          acc[wallet] = { deployer_wallet: wallet, deployment_count: 0, total_volume: 0 };
        }
        acc[wallet].deployment_count += 1;
        acc[wallet].total_volume += Number(market.volume) || 0;
        return acc;
      }, {} as Record<string, BuilderStats>);

      // Convert to array and sort by deployment count
      return Object.values(walletStats).sort(
        (a, b) => b.deployment_count - a.deployment_count
      );
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Builders Leaderboard</h1>
              <p className="text-muted-foreground mt-1">
                Top deployers of Intelligent Contracts on GenLayer
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              GenLayer Testnet
            </Badge>
          </div>

          {/* Leaderboard Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Rankings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : builders && builders.length > 0 ? (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-medium text-muted-foreground border-b">
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-6">Wallet</div>
                    <div className="col-span-2 text-center">Deployments</div>
                    <div className="col-span-3 text-right">Total Volume</div>
                  </div>

                  {/* Rows */}
                  {builders.map((builder, index) => {
                    const isCurrentUser = address?.toLowerCase() === builder.deployer_wallet.toLowerCase();
                    return (
                      <div
                        key={builder.deployer_wallet}
                        className={`grid grid-cols-12 gap-4 px-4 py-3 rounded-lg items-center transition-colors ${
                          isCurrentUser
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="col-span-1 flex items-center">
                          {getRankIcon(index + 1)}
                        </div>
                        <div className="col-span-6 flex items-center gap-2">
                          <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                            {truncateAddress(builder.deployer_wallet)}
                          </code>
                          {isCurrentUser && (
                            <Badge variant="secondary" className="text-xs">
                              You
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(builder.deployer_wallet)}
                          >
                            <Copy className={`h-3 w-3 ${copiedAddress === builder.deployer_wallet ? "text-green-500" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a
                              href={`https://explorer-asimov.genlayer.com/address/${builder.deployer_wallet}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                        <div className="col-span-2 text-center">
                          <Badge variant="outline" className="font-mono">
                            {builder.deployment_count}
                          </Badge>
                        </div>
                        <div className="col-span-3 text-right font-medium">
                          {formatVolume(builder.total_volume)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground mb-2">No builders yet</p>
                  <p className="text-sm text-muted-foreground">
                    Be the first to deploy an Intelligent Contract!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Builder Rewards</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Deploy Intelligent Contracts on GenLayer Testnet to climb the leaderboard. 
                    Top builders may be eligible for rewards from the GenLayer team!
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default BuildersLeaderboard;
