import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Filter, TrendingUp, Clock, BarChart3, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { MarketGrid } from "@/components/MarketGrid";
import { GetStartedBanner } from "@/components/GetStartedBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMarkets, useOptimisticVote, MarketFilters } from "@/hooks/useMarkets";
import { useWalletAuth } from "@/contexts/WalletAuthContext";
import { WalletModal } from "@/components/WalletModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const CATEGORIES = ["All", "Crypto", "Finance", "Tech", "Politics", "World", "Sports", "Culture"];

const SORT_OPTIONS = [
  { value: "volume", label: "Trending", icon: TrendingUp },
  { value: "newest", label: "Newest", icon: Sparkles },
  { value: "ending_soon", label: "Ending Soon", icon: Clock },
  { value: "probability", label: "High Confidence", icon: BarChart3 },
] as const;

const Index = () => {
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortBy, setSortBy] = useState<MarketFilters["sortBy"]>("volume");
  const [votingMarketId, setVotingMarketId] = useState<string | null>(null);

  const { isConnected } = useWalletAuth();

  // Filters for the query
  const filters = useMemo<MarketFilters>(() => ({
    category: activeCategory,
    search: searchQuery,
    sortBy,
  }), [activeCategory, searchQuery, sortBy]);

  // Fetch markets with caching
  const { data: markets = [], isLoading, error } = useMarkets(filters);

  // Optimistic voting mutation
  const voteMutation = useOptimisticVote();

  // Handle quick vote from cards
  const handleQuickVote = useCallback(async (marketId: string, vote: "yes" | "no") => {
    if (!isConnected) {
      setWalletModalOpen(true);
      return;
    }

    setVotingMarketId(marketId);
    
    try {
      await voteMutation.mutateAsync({ marketId, vote });
      toast.success(`Voted ${vote.toUpperCase()}!`, {
        description: "Probability updated",
      });
    } catch (err) {
      toast.error("Vote failed", {
        description: "Please try again",
      });
    } finally {
      setVotingMarketId(null);
    }
  }, [isConnected, voteMutation]);

  return (
    <div className="min-h-screen bg-neutral-950">
      <Header />

      <main className="container py-6 px-4 sm:px-6">
        {/* Dismissible Getting Started Banner */}
        <GetStartedBanner
          isConnected={isConnected}
          onConnectWallet={() => setWalletModalOpen(true)}
        />

        {/* Hero Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">
              Prediction Markets
            </h1>
            <p className="text-neutral-500 text-sm">
              Trade on real-world events with AI-powered resolution
            </p>
          </div>
          <Link to="/create">
            <Button className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20">
              <Plus className="w-4 h-4" />
              Create Market
            </Button>
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <Input
              type="text"
              placeholder="Search markets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(
                "pl-10 h-10",
                "bg-neutral-900/50 border-neutral-800",
                "focus:border-neutral-600 focus:ring-neutral-700",
                "placeholder:text-neutral-600"
              )}
            />
          </div>

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            {SORT_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  sortBy === option.value
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
                )}
              >
                <option.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
                activeCategory === category
                  ? "bg-white text-neutral-900 shadow-md"
                  : "bg-neutral-900/50 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800/50"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-6 mb-6 text-sm">
          <div className="flex items-center gap-2 text-neutral-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{markets.length} markets</span>
          </div>
          {!isLoading && markets.length > 0 && (
            <>
              <div className="text-neutral-700">•</div>
              <div className="text-neutral-500">
                ${(markets.reduce((sum, m) => sum + Number(m.volume), 0) / 1000).toFixed(0)}K total volume
              </div>
            </>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 mb-6">
            <p className="text-sm text-rose-400">
              Failed to load markets. Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Market Grid */}
        <MarketGrid
          markets={markets}
          isLoading={isLoading}
          onQuickVote={handleQuickVote}
          votingMarketId={votingMarketId}
        />

        {/* Empty state for filtered results */}
        {!isLoading && markets.length === 0 && (searchQuery || activeCategory !== "All") && (
          <div className="text-center py-12">
            <p className="text-neutral-500 mb-4">No markets match your filters</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("All");
              }}
              className="border-neutral-800 hover:bg-neutral-900"
            >
              Clear filters
            </Button>
          </div>
        )}
      </main>

      {/* Wallet Modal */}
      <WalletModal
        open={walletModalOpen}
        onOpenChange={setWalletModalOpen}
      />
    </div>
  );
};

export default Index;
