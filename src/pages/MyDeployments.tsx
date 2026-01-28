import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/useWallet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, ExternalLink, Copy, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const MyDeployments = () => {
  const { address, isConnected } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: deployments, isLoading } = useQuery({
    queryKey: ["my-deployments", address],
    queryFn: async () => {
      if (!address) return [];
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("deployer_wallet", address)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!address,
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">My Deployments</h1>
            <Badge variant="outline" className="text-sm">
              GenLayer Testnet
            </Badge>
          </div>

          {/* Wallet Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Your Wallet
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isConnected && address ? (
                <div className="flex items-center gap-3">
                  <code className="bg-muted px-3 py-2 rounded-md font-mono text-sm flex-1">
                    {address}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(address)}
                  >
                    {copied ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a
                      href={`https://explorer-asimov.genlayer.com/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Connect your wallet to see your deployments
                </p>
              )}
            </CardContent>
          </Card>

          {/* Deployments List */}
          <Card>
            <CardHeader>
              <CardTitle>Deployed Intelligent Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              {!isConnected ? (
                <p className="text-muted-foreground text-center py-8">
                  Connect your wallet to view your deployed contracts
                </p>
              ) : isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : deployments && deployments.length > 0 ? (
                <div className="space-y-4">
                  {deployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <Link
                            to={`/market/${deployment.id}`}
                            className="font-semibold hover:underline line-clamp-1"
                          >
                            {deployment.title}
                          </Link>
                          <p className="text-sm text-muted-foreground mt-1">
                            Deployed on{" "}
                            {format(new Date(deployment.created_at), "PPP 'at' p")}
                          </p>
                        </div>
                        <Badge variant="secondary">{deployment.category}</Badge>
                      </div>

                      {deployment.intelligent_contract_address && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            Contract:
                          </span>
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                            {truncateAddress(deployment.intelligent_contract_address)}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              copyToClipboard(deployment.intelligent_contract_address!)
                            }
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            asChild
                          >
                            <a
                              href={`https://explorer-asimov.genlayer.com/address/${deployment.intelligent_contract_address}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    You haven't deployed any Intelligent Contracts yet
                  </p>
                  <Button asChild>
                    <Link to="/create">Create Your First Market</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          {deployments && deployments.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-3xl font-bold">{deployments.length}</p>
                    <p className="text-sm text-muted-foreground">
                      Total Deployments
                    </p>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">
                      {deployments.filter((d) => d.intelligent_contract_address).length}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      On-Chain Contracts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyDeployments;
