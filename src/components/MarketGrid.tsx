import { Market } from "@/types/market";
import { MarketCard } from "./MarketCard";
import { useRef, useEffect, useState } from "react";

interface MarketGridProps {
  markets: Market[];
}

export const MarketGrid = ({ markets }: MarketGridProps) => {
  const [previousProbabilities, setPreviousProbabilities] = useState<Record<string, number>>({});
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      // Initialize previous probabilities on first render
      const initial: Record<string, number> = {};
      markets.forEach((m) => {
        initial[m.id] = m.probability;
      });
      setPreviousProbabilities(initial);
      isFirstRender.current = false;
    } else {
      // Update previous probabilities after a delay to allow animation
      const timeout = setTimeout(() => {
        const updated: Record<string, number> = {};
        markets.forEach((m) => {
          updated[m.id] = m.probability;
        });
        setPreviousProbabilities(updated);
      }, 700);

      return () => clearTimeout(timeout);
    }
  }, [markets]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {markets.map((market, index) => (
        <div
          key={market.id}
          className="animate-in fade-in-0 slide-in-from-bottom-4"
          style={{
            animationDelay: `${index * 50}ms`,
            animationDuration: '400ms',
            animationFillMode: 'both',
          }}
        >
          <MarketCard 
            market={market} 
            previousProbability={previousProbabilities[market.id]}
          />
        </div>
      ))}
    </div>
  );
};
