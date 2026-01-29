import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWalletAuth } from "@/contexts/WalletAuthContext";

export interface Position {
  id: string;
  user_id: string;
  market_id: string;
  position_type: "yes" | "no";
  shares: number;
  avg_price: number;
  total_invested: number;
  created_at: string;
  updated_at: string;
}

export interface PositionWithMarket extends Position {
  market: {
    id: string;
    title: string;
    probability: number;
    end_date: string;
    resolution_status: string;
  };
}

export const usePositions = () => {
  const { address, isConnected } = useWalletAuth();

  return useQuery({
    queryKey: ["positions", address],
    queryFn: async () => {
      if (!address) return [];

      const { data, error } = await supabase
        .from("positions")
        .select(`
          *,
          market:markets(id, title, probability, end_date, resolution_status)
        `)
        .eq("user_id", address);

      if (error) throw error;
      return data as PositionWithMarket[];
    },
    enabled: isConnected && !!address,
  });
};

export const useTrades = () => {
  const { address, isConnected } = useWalletAuth();

  return useQuery({
    queryKey: ["trades", address],
    queryFn: async () => {
      if (!address) return [];

      const { data, error } = await supabase
        .from("trades")
        .select(`
          *,
          market:markets(id, title)
        `)
        .eq("user_id", address)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: isConnected && !!address,
  });
};

export const useCreateTrade = () => {
  const queryClient = useQueryClient();
  const { address, isConnected } = useWalletAuth();

  return useMutation({
    mutationFn: async ({
      marketId,
      positionType,
      shares,
      price,
    }: {
      marketId: string;
      positionType: "yes" | "no";
      shares: number;
      price: number;
    }) => {
      if (!isConnected || !address) throw new Error("Must connect wallet to trade");

      const totalAmount = shares * price;

      // Create the trade
      const { error: tradeError } = await supabase.from("trades").insert({
        user_id: address,
        market_id: marketId,
        trade_type: "buy",
        position_type: positionType,
        shares,
        price,
        total_amount: totalAmount,
      });

      if (tradeError) throw tradeError;

      // Upsert the position
      const { data: existingPosition } = await supabase
        .from("positions")
        .select("*")
        .eq("user_id", address)
        .eq("market_id", marketId)
        .eq("position_type", positionType)
        .maybeSingle();

      if (existingPosition) {
        // Update existing position
        const newShares = Number(existingPosition.shares) + shares;
        const newTotalInvested = Number(existingPosition.total_invested) + totalAmount;
        const newAvgPrice = newTotalInvested / newShares;

        const { error: updateError } = await supabase
          .from("positions")
          .update({
            shares: newShares,
            avg_price: newAvgPrice,
            total_invested: newTotalInvested,
          })
          .eq("id", existingPosition.id);

        if (updateError) throw updateError;
      } else {
        // Create new position
        const { error: insertError } = await supabase.from("positions").insert({
          user_id: address,
          market_id: marketId,
          position_type: positionType,
          shares,
          avg_price: price,
          total_invested: totalAmount,
        });

        if (insertError) throw insertError;
      }

      // ✅ UPDATE MARKET VOLUME - This was missing!
      // Fetch current market volume and update it
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("volume")
        .eq("id", marketId)
        .single();

      if (!fetchError && market) {
        const currentVolume = Number(market.volume) || 0;
        // Convert ETH amount to USD equivalent (rough estimate: 1 ETH ≈ $3000 for display)
        // Or just use the raw ETH value * 1000 for simplicity
        const volumeIncrement = totalAmount * 3000; // Approximate USD value
        
        const { error: volumeError } = await supabase
          .from("markets")
          .update({
            volume: currentVolume + volumeIncrement,
          })
          .eq("id", marketId);

        if (volumeError) {
          console.error("Failed to update market volume:", volumeError);
          // Don't throw - volume update is not critical
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["positions"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["markets"] }); // Also refresh markets to show updated volume
    },
  });
};
