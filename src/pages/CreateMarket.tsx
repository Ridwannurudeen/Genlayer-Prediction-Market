import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { useContractDeployment } from "@/hooks/useContractDeployment";
import { useHybridDeployment } from "@/hooks/useHybridDeployment";
import { DeploymentStatus } from "@/components/DeploymentStatus";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Zap, Calendar, Info, Wallet, Rocket, Sparkles, CheckCircle2, XCircle } from "lucide-react";
import { WalletModal } from "@/components/WalletModal";

const categories = [
  "Crypto",
  "Finance",
  "Tech",
  "Politics",
  "World",
  "Sports",
  "Culture",
];

const marketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(10, "Title must be at least 10 characters")
    .max(200, "Title must be less than 200 characters")
    .refine(
      (val) => val.endsWith("?"),
      "Title should be a question (end with ?)"
    ),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(1000, "Description must be less than 1000 characters"),
  category: z.enum(["Crypto", "Finance", "Tech", "Politics", "World", "Sports", "Culture"], {
    required_error: "Please select a category",
  }),
  endDate: z
    .string()
    .refine((val) => {
      const date = new Date(val);
      const now = new Date();
      return date > now;
    }, "End date must be in the future"),
  resolutionSource: z
    .string()
    .trim()
    .min(10, "Resolution source must be at least 10 characters")
    .max(500, "Resolution source must be less than 500 characters"),
  initialProbability: z
    .number()
    .min(1, "Probability must be at least 1%")
    .max(99, "Probability must be at most 99%"),
});

type MarketFormData = z.infer<typeof marketSchema>;

const CreateMarket = () => {
  const navigate = useNavigate();
  const { isConnected, address, loading, chainId, switchToGenLayer } = useWalletAuth();
  const isOnGenLayer = chainId === 4221;
  const isOnBase = chainId === 84532;
  const { deployPredictionMarket, status: deploymentStatus, resetStatus, isDeploying } = useContractDeployment();
  const { deployHybrid, isDeploying: isHybridDeploying, baseStep, genLayerStep, resetSteps, switchToBase } = useHybridDeployment();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [deployOnChain, setDeployOnChain] = useState(true); // GenLayer
  const [deployToBaseSepolia, setDeployToBaseSepolia] = useState(true); // Base Sepolia

  const form = useForm<MarketFormData>({
    resolver: zodResolver(marketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      endDate: "",
      resolutionSource: "",
      initialProbability: 50,
    },
  });

  const onSubmit = async (data: MarketFormData) => {
    if (!isConnected || !address) {
      setWalletModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    resetStatus();
    resetSteps();

    try {
      let intelligentContractAddress: string | null = null;
      let baseContractAddress: string | null = null;

      // Deploy to both networks if enabled
      if (deployOnChain || deployToBaseSepolia) {
        const result = await deployHybrid({
          question: data.title,
          description: data.description,
          category: data.category,
          endDate: new Date(data.endDate),
          resolutionSource: data.resolutionSource,
          deployBase: deployToBaseSepolia,
          deployGenLayer: deployOnChain,
        });

        // If both deployments failed, stop
        if (!result.success && !result.baseContractAddress && !result.genLayerTxHash) {
          setIsSubmitting(false);
          return;
        }

        baseContractAddress = result.baseContractAddress || null;
        intelligentContractAddress = result.genLayerContractAddress || null;
      }

      // Create market record in database
      const { data: newMarket, error } = await supabase.from("markets").insert({
        title: data.title,
        description: data.description,
        category: data.category,
        end_date: new Date(data.endDate).toISOString(),
        resolution_source: data.resolutionSource,
        probability: data.initialProbability,
        created_by: address,
        deployer_wallet: (deployOnChain || deployToBaseSepolia) ? address : null,
        verified: deployOnChain || deployToBaseSepolia,
        resolution_status: "open",
        validator_count: deployOnChain ? 5 : 0,
        volume: 0,
        intelligent_contract_address: intelligentContractAddress,
        base_contract_address: baseContractAddress,
        network: deployToBaseSepolia ? "base_sepolia" : (deployOnChain ? "genlayer" : "simulated"),
      }).select().single();

      if (error) throw error;

      // Build success message
      let successMsg = "Market created";
      if (baseContractAddress) successMsg += " + Base trading";
      if (deployOnChain) successMsg += " + GenLayer AI";
      toast.success(successMsg + "!");

      navigate(`/market/${newMarket.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to create market");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetryDeployment = () => {
    resetStatus();
    resetSteps();
    form.handleSubmit(onSubmit)();
  };

  // Show loading state
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

  // Prompt to connect wallet
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

  const isProcessing = isSubmitting || isDeploying || isHybridDeploying;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-6 max-w-2xl">
        {/* Breadcrumb */}
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
              <Zap className="h-5 w-5 text-chart-3" />
              Create Prediction Market
            </CardTitle>
            <CardDescription>
              Create a new market with on-chain trading and AI-powered resolution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Market Question</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Will Bitcoin exceed $100,000 by end of 2026?"
                          disabled={isProcessing}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A clear yes/no question that can be objectively resolved.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resolution Criteria</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe exactly how this market will be resolved. Be specific about data sources, edge cases, and timing..."
                          className="min-h-[100px]"
                          disabled={isProcessing}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Clear criteria help validators make accurate resolutions.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Category & End Date Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isProcessing}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="datetime-local"
                              className="pl-10"
                              disabled={isProcessing}
                              {...field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resolution Source */}
                <FormField
                  control={form.control}
                  name="resolutionSource"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data Source for Resolution</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd"
                          disabled={isProcessing}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        URL or API that the AI will query to verify the outcome.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Initial Probability */}
                <FormField
                  control={form.control}
                  name="initialProbability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Probability (%)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Input
                            type="number"
                            min={1}
                            max={99}
                            className="w-24"
                            disabled={isProcessing}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 50)}
                          />
                          <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-yes transition-all"
                              style={{ width: `${field.value}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12">
                            {field.value}%
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Your initial estimate of the probability. Trading will adjust this.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Deployment Options */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Deployment Options</p>
                  
                  {/* Base Sepolia Toggle */}
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Zap className="h-5 w-5 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-600 dark:text-blue-400 mb-1">
                            Base Sepolia Trading
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Enable real ETH trading with escrowed funds on Base Sepolia.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={deployToBaseSepolia}
                        onCheckedChange={setDeployToBaseSepolia}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>

                  {/* GenLayer Toggle */}
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <Sparkles className="h-5 w-5 text-purple-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-600 dark:text-purple-400 mb-1">
                            GenLayer AI Resolution
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Deploy Intelligent Contract for AI-powered resolution via validators.
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={deployOnChain}
                        onCheckedChange={setDeployOnChain}
                        disabled={isProcessing}
                      />
                    </div>
                  </div>
                </div>

                {/* Hybrid Deployment Status */}
                {isHybridDeploying && (
                  <div className="space-y-2 p-4 rounded-lg bg-secondary/50 border">
                    <p className="text-sm font-medium mb-2">Deployment Progress</p>
                    
                    {deployToBaseSepolia && (
                      <div className={`flex items-center gap-2 text-sm ${
                        baseStep.status === "success" ? "text-green-600" :
                        baseStep.status === "error" ? "text-red-600" :
                        baseStep.status === "deploying" ? "text-blue-600" : "text-muted-foreground"
                      }`}>
                        {baseStep.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : baseStep.status === "error" ? (
                          <XCircle className="h-4 w-4" />
                        ) : baseStep.status === "deploying" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Zap className="h-4 w-4" />
                        )}
                        <span>Base Sepolia: {baseStep.message}</span>
                      </div>
                    )}
                    
                    {deployOnChain && (
                      <div className={`flex items-center gap-2 text-sm ${
                        genLayerStep.status === "success" ? "text-green-600" :
                        genLayerStep.status === "error" ? "text-red-600" :
                        genLayerStep.status === "deploying" ? "text-purple-600" : "text-muted-foreground"
                      }`}>
                        {genLayerStep.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : genLayerStep.status === "error" ? (
                          <XCircle className="h-4 w-4" />
                        ) : genLayerStep.status === "deploying" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        <span>GenLayer: {genLayerStep.message}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Legacy Deployment Status */}
                {deploymentStatus.step !== "idle" && !isHybridDeploying && (
                  <DeploymentStatus 
                    status={deploymentStatus} 
                    onRetry={handleRetryDeployment}
                  />
                )}

                {/* Info Box when no deployment selected */}
                {!deployOnChain && !deployToBaseSepolia && (
                  <div className="p-4 rounded-lg bg-secondary/50 border border-border">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">
                          Simulated Trading Mode
                        </p>
                        <p className="text-muted-foreground">
                          Without deployment, trading will be simulated in the database.
                          Enable at least one deployment option for real blockchain functionality.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/")}
                    className="flex-1"
                    disabled={isProcessing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isProcessing}
                    className="flex-1 gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Rocket className="h-4 w-4" />
                        {(deployOnChain || deployToBaseSepolia) ? "Deploy & Create" : "Create Market"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>

      <WalletModal open={walletModalOpen} onOpenChange={setWalletModalOpen} />
    </div>
  );
};

export default CreateMarket;
