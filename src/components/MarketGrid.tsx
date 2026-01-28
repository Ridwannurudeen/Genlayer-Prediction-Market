import { memo, useCallback, useState, useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MarketCard } from "./MarketCard";
import { cn } from "@/lib/utils";

interface Market {
  id: string;
  title: string;
  probability: number;
  volume: number;
  end_date: string;
  category: string;
  verified?: boolean;
  base_contract_address?: string | null;
  intelligent_contract_address?: string | null;
  validator_count?: number;
}

interface MarketGridProps {
  markets: Market[];
  isLoading?: boolean;
  onQuickVote?: (marketId: string, vote: "yes" | "no") => void;
  votingMarketId?: string | null;
}

// Skeleton loader
const MarketCardSkeleton = memo(() => (
  <div className="rounded-2xl bg-neutral-900/70 backdrop-blur-md border border-neutral-800/60 overflow-hidden animate-pulse">
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <div className="h-4 w-14 bg-neutral-800 rounded-md" />
        <div className="h-4 w-16 bg-neutral-800 rounded-md" />
      </div>
      <div className="space-y-2 mb-4">
        <div className="h-5 w-full bg-neutral-800 rounded" />
        <div className="h-5 w-3/4 bg-neutral-800 rounded" />
      </div>
      <div className="h-12 bg-neutral-800/60 rounded-xl mb-3" />
      <div className="flex justify-between">
        <div className="h-3 w-16 bg-neutral-800 rounded" />
        <div className="h-3 w-20 bg-neutral-800 rounded" />
      </div>
    </div>
  </div>
));

MarketCardSkeleton.displayName = "MarketCardSkeleton";

// Loading grid
const LoadingGrid = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {Array.from({ length: 8 }).map((_, i) => (
      <MarketCardSkeleton key={i} />
    ))}
  </div>
));

LoadingGrid.displayName = "LoadingGrid";

// Empty state
const EmptyState = memo(() => (
  <div className="flex flex-col items-center justify-center py-20 text-center">
    <div className="w-20 h-20 rounded-full bg-neutral-800/50 flex items-center justify-center mb-6">
      <svg className="w-10 h-10 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    </div>
    <h3 className="text-xl font-semibold text-neutral-200 mb-2">No markets found</h3>
    <p className="text-sm text-neutral-500 max-w-md">
      Try adjusting your filters or create a new prediction market to get started.
    </p>
  </div>
));

EmptyState.displayName = "EmptyState";

// Virtualized grid for large lists
const VirtualizedGrid = memo(({
  markets,
  onQuickVote,
  votingMarketId,
}: {
  markets: Market[];
  onQuickVote?: (marketId: string, vote: "yes" | "no") => void;
  votingMarketId?: string | null;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(3);

  // Responsive column count
  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width < 768) setColumns(1);
      else if (width < 1024) setColumns(2);
      else if (width < 1280) setColumns(3);
      else setColumns(4);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const rowCount = Math.ceil(markets.length / columns);
  const rowHeight = 240; // Approximate card height + gap

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 3,
  });

  return (
    <div
      ref={parentRef}
      className="h-[calc(100vh-300px)] min-h-[500px] overflow-auto scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-transparent"
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowMarkets = markets.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              className="absolute top-0 left-0 w-full grid gap-4"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
              }}
            >
              {rowMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  id={market.id}
                  title={market.title}
                  probability={Number(market.probability)}
                  volume={Number(market.volume)}
                  endDate={market.end_date}
                  category={market.category}
                  verified={market.verified}
                  hasContract={!!market.base_contract_address || !!market.intelligent_contract_address}
                  validatorCount={market.validator_count}
                  onQuickVote={onQuickVote}
                  isVoting={votingMarketId === market.id}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedGrid.displayName = "VirtualizedGrid";

// Simple grid for small lists (better for SEO & simpler)
const SimpleGrid = memo(({
  markets,
  onQuickVote,
  votingMarketId,
}: {
  markets: Market[];
  onQuickVote?: (marketId: string, vote: "yes" | "no") => void;
  votingMarketId?: string | null;
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
    {markets.map((market) => (
      <MarketCard
        key={market.id}
        id={market.id}
        title={market.title}
        probability={Number(market.probability)}
        volume={Number(market.volume)}
        endDate={market.end_date}
        category={market.category}
        verified={market.verified}
        hasContract={!!market.base_contract_address || !!market.intelligent_contract_address}
        validatorCount={market.validator_count}
        onQuickVote={onQuickVote}
        isVoting={votingMarketId === market.id}
      />
    ))}
  </div>
));

SimpleGrid.displayName = "SimpleGrid";

// Main component
const MarketGrid = memo(({
  markets,
  isLoading = false,
  onQuickVote,
  votingMarketId,
}: MarketGridProps) => {
  // Use virtualization only for large lists (50+ markets)
  const useVirtual = markets.length > 50;

  if (isLoading) {
    return <LoadingGrid />;
  }

  if (markets.length === 0) {
    return <EmptyState />;
  }

  if (useVirtual) {
    return (
      <VirtualizedGrid
        markets={markets}
        onQuickVote={onQuickVote}
        votingMarketId={votingMarketId}
      />
    );
  }

  return (
    <SimpleGrid
      markets={markets}
      onQuickVote={onQuickVote}
      votingMarketId={votingMarketId}
    />
  );
});

MarketGrid.displayName = "MarketGrid";

export { MarketGrid, MarketCardSkeleton, LoadingGrid };
