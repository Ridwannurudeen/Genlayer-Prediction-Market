import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, Zap, AlertTriangle, CheckCircle2, Calendar, Info, Wallet, Rocket } from "lucide-react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateMarket } from "@/hooks/useMarkets";
import { useMarketFactory } from "@/hooks/useMarketFactory";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { WalletModal } from "@/components/WalletModal";
import { toast } from "sonner";

const CATEGORIES = [
  "Crypto",
  "Finance",
  "Tech",
  "Politics",
  "World",
  "Sports",
  "Culture",
  "Other",
];

interface FormData {
  title: string;
  description: string;
  category: string;
  endDate: string;
  resolutionSource: string;
  initialProbability: number;
}

const CreateMarket = () => {
  const navigate = useNavigate();
  const createMarket = useCreateMarket();
  const { deployMarket, isDeploying, isOnBase } = useMarketFactory();
  const { isConnected, address, loading, switchToBase } = useWalletAuth();
  
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [deployOnChain, setDeployOnChain] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    title: "",
    description: "",
    category: "Other",
    endDate: "",
    resolutionSource: "",
    initialProbability: 50,
  });

  // Calculate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const validateForm = (): boolean => {
    if (!formData.title.trim()) {
      toast.error("Please enter a market title");
      return false;
    }
    if (formData.title.length < 10) {
      toast.error("Title must be at least 10 characters");
      return false;
    }
    if (!formData.title.endsWith("?")) {
      toast.error("Title should be a question (end with ?)");
      return false;
    }
    if (!formData.description.trim()) {
      toast.error("Please enter a description");
      return false;
    }
    if (formData.description.length < 20) {
      toast.error("Description must be at least 20 characters");
      return false;
    }
    if (!formData.endDate) {
      toast.error("Please select an end date");
      return false;
    }
    const endDate = new Date(formData.endDate);
    if (endDate <= new Date()) {
      toast.error("End date must be in the future");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Check network if deploying on-chain
    if (deployOnChain && !isOnBase) {
      toast.info("Please switch to Base Sepolia to deploy", {
        action: {
          label: "Switch Network",
          onClick: switchToBase,
        },
      });
      return;
    }

    // Calculate duration in days from end date
    const endDate = new Date(formData.endDate);
    const now = new Date();
    const durationDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (durationDays > 365) {
      toast.error("Market duration cannot exceed 365 days");
      return;
    }

    try {
      let contractAddress: string | undefined;

      // Step 1: Deploy contract on Base Sepolia (if enabled)
      if (deployOnChain) {
        toast.info("Step 1/2: Deploying contract on Base Sepolia...", {
          description: "Please confirm the transaction in MetaMask",
        });
        
        const deployResult = await deployMarket(
          formData.title,
          formData.description || "No description provided",
          durationDays
        );

        if (!deployResult.success) {
          if (deployResult.error === "Cancelled") {
            return;
          }
          toast.error("Contract deployment failed", {
            description: deployResult.error,
          });
          return;
        }

        contractAddress = deployResult.contractAddress;
        
        toast.success("Contract deployed! 🎉", {
          description: `Address: ${contractAddress?.slice(0, 10)}...${contractAddress?.slice(-6)}`,
        });
      }

      // Step 2: Save to database
      toast.info(deployOnChain ? "Step 2/2: Saving to database..." : "Saving market to database...");

      const newMarket = await createMarket.mutateAsync({
        title: formData.title,
        description: formData.description || "No description provided",
        category: formData.category,
        end_date: new Date(formData.endDate).toISOString(),
        resolution_source: formData.resolutionSource || undefined,
        probability: formData.initialProbability,
        volume: 0,
        deployer_wallet: address || null,
        verified: deployOnChain && !!contractAddress,
        resolution_status: "active",
        validator_count: deployOnChain ? 5 : 0,
        consensus_percentage: 0,
        base_contract_address: contractAddress || null,
        network: contractAddress ? "base_sepolia" : null,
      });

      toast.success("Market created successfully! 🎉", {
        description: contractAddress 
          ? "Your market has a real smart contract on Base Sepolia!"
          : "Market saved. Deploy a contract later to enable on-chain trading.",
      });
      
      navigate(`/market/${newMarket.id}`);

    } catch (error: any) {
      console.error("Create market error:", error);
      toast.error(error.message || "Failed to create market");
    }
  };

  const isSubmitting = isDeploying || createMarket.isPending;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-semibold mb-2">Connect Wallet to Create Markets</h1>
            <p className="text-muted-foreground mb-6">
              You need to connect your wallet to create prediction markets.
            </p>
            <Button onClick={() => setWalletModalOpen(true)}>
              Connect Wallet
            </Button>
          </div>
        </main>
        <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-2xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Markets
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Create Prediction Market
            </CardTitle>
            <CardDescription>
              Create a new prediction market. Enable on-chain deployment for real blockchain trading.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Market Question</label>
                <Input
                  placeholder="Will Bitcoin exceed $100,000 by end of 2026?"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="h-11"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  A clear yes/no question ending with "?" (10-200 characters)
                </p>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Criteria</label>
                <Textarea
                  placeholder="Describe exactly how this market will be resolved..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[100px]"
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Clear criteria help ensure accurate resolution (20-1000 characters)
                </p>
              </div>

              {/* Category & End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="h-11 pl-10"
                      min={minDate}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Resolution Source */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Data Source for Resolution</label>
                <Input
                  placeholder="e.g., CoinGecko API, Official announcement URL"
                  value={formData.resolutionSource}
                  onChange={(e) => setFormData({ ...formData, resolutionSource: e.target.value })}
                  className="h-11"
                  disabled={isSubmitting}
                />
              </div>

              {/* Initial Probability */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Initial Probability (%)</label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.initialProbability}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      initialProbability: Math.min(99, Math.max(1, parseInt(e.target.value) || 50))
                    })}
                    className="w-24 h-11"
                    disabled={isSubmitting}
                  />
                  <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${formData.initialProbability}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground w-12">
                    {formData.initialProbability}%
                  </span>
                </div>
              </div>

              {/* Deploy On-Chain Toggle */}
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Rocket className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium text-primary mb-1">
                        Deploy on Base Sepolia
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Deploy a real smart contract for trustless on-chain trading.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={deployOnChain}
                    onCheckedChange={setDeployOnChain}
                    disabled={isSubmitting}
                  />
                </div>
                
                {deployOnChain && !isOnBase && (
                  <div className="mt-3 pt-3 border-t border-primary/20">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={switchToBase}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4" />
                      Switch to Base Sepolia
                    </Button>
                  </div>
                )}
              </div>

              {/* Network Status */}
              {deployOnChain && !isOnBase && (
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-700 dark:text-amber-500">
                      Switch to Base Sepolia to deploy on-chain
                    </p>
                  </div>
                </div>
              )}

              {deployOnChain && isOnBase && (
                <div className="p-3 rounded-lg border border-green-500/30 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <p className="text-sm text-green-700 dark:text-green-500">
                      Ready for on-chain deployment
                    </p>
                  </div>
                </div>
              )}

              {!deployOnChain && (
                <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      Market will be saved without blockchain deployment
                    </p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  className="flex-1"
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 gap-2"
                >
                  {isDeploying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Deploying...
                    </>
                  ) : createMarket.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {deployOnChain && <Rocket className="h-4 w-4" />}
                      {deployOnChain ? "Deploy & Create" : "Create Market"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};

export default CreateMarket;
