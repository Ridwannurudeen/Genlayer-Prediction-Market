import { useState, useEffect, useCallback } from "react";
import { Market } from "@/types/market";

interface PriceUpdate {
  marketId: string;
  probability: number;
  change: number;
  timestamp: Date;
}

export const useRealtimePrices = (initialMarkets: Market[]) => {
  const [markets, setMarkets] = useState<Market[]>(initialMarkets);
  const [lastUpdate, setLastUpdate] = useState<PriceUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Simulate random price movements
  const generatePriceChange = useCallback((currentProb: number): number => {
    // Random walk with mean reversion
    const volatility = 0.02; // 2% max change
    const meanReversion = 0.001;
    const target = 50; // Mean reversion target
    
    const randomChange = (Math.random() - 0.5) * 2 * volatility * 100;
    const reversionForce = (target - currentProb) * meanReversion;
    
    let newProb = currentProb + randomChange + reversionForce;
    
    // Clamp between 1 and 99
    newProb = Math.max(1, Math.min(99, newProb));
    
    return Math.round(newProb * 10) / 10;
  }, []);

  useEffect(() => {
    // Simulate connection delay
    const connectTimeout = setTimeout(() => {
      setIsConnected(true);
    }, 500);

    return () => clearTimeout(connectTimeout);
  }, []);

  useEffect(() => {
    if (!isConnected) return;

    // Simulate WebSocket updates at random intervals
    const simulateUpdate = () => {
      setMarkets((prevMarkets) => {
        // Randomly select 1-2 markets to update
        const numUpdates = Math.random() > 0.7 ? 2 : 1;
        const updatedMarkets = [...prevMarkets];
        
        for (let i = 0; i < numUpdates; i++) {
          const randomIndex = Math.floor(Math.random() * updatedMarkets.length);
          const market = updatedMarkets[randomIndex];
          const oldProb = market.probability;
          const newProb = generatePriceChange(oldProb);
          const change = newProb - oldProb;
          
          updatedMarkets[randomIndex] = {
            ...market,
            probability: Math.round(newProb),
          };

          setLastUpdate({
            marketId: market.id,
            probability: Math.round(newProb),
            change: Math.round(change * 10) / 10,
            timestamp: new Date(),
          });
        }
        
        return updatedMarkets;
      });
    };

    // Random interval between 1-4 seconds
    const scheduleNextUpdate = () => {
      const delay = 1000 + Math.random() * 3000;
      return setTimeout(() => {
        simulateUpdate();
        intervalRef = scheduleNextUpdate();
      }, delay);
    };

    let intervalRef = scheduleNextUpdate();

    return () => {
      clearTimeout(intervalRef);
    };
  }, [isConnected, generatePriceChange]);

  return { markets, lastUpdate, isConnected };
};
