import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { marketKeys, DbMarket } from "./useMarkets";

export const useUpdateProbability = () => {
  const queryClient = useQueryClient();

  const updateProbabilityAfterTrade = useCallback(
    async (
      marketId: string,
      positionType: "yes" | "no",
      tradeAmount: number
    ): Promise<number | null> => {
      try {
        const { data: market, error: fetchError } = await supabase
          .from("markets")
          .select("probability, volume")
          .eq("id", marketId)
          .single();

        if (fetchError || !market) {
          console.error("Failed to fetch market:", fetchError);
          return null;
        }

        const currentProbability = market.probability || 50;
        const currentVolume = market.volume || 0;

        const impactFactor = Math.min(
          tradeAmount / (currentVolume + tradeAmount + 0.1),
          0.15
        );

        let newProbability: number;

        if (positionType === "yes") {
          newProbability = currentProbability + (100 - currentProbability) * impactFactor;
        } else {
          newProbability = currentProbability - currentProbability * impactFactor;
        }

        newProbability = Math.max(1, Math.min(99, Math.round(newProbability)));

        const { error: updateError } = await supabase
          .from("markets")
          .update({
            probability: newProbability,
            volume: currentVolume + tradeAmount,
          })
          .eq("id", marketId);

        if (updateError) {
          console.error("Failed to update probability:", updateError);
          return null;
        }

        // Update cache
        queryClient.setQueriesData(
          { queryKey: marketKeys.lists() },
          (old: DbMarket[] | undefined) => {
            if (!old) return old;
            return old.map((m) =>
              m.id === marketId
                ? { ...m, probability: newProbability, volume: currentVolume + tradeAmount }
                : m
            );
          }
        );

        queryClient.setQueryData(
          marketKeys.detail(marketId),
          (old: DbMarket | null | undefined) => {
            if (!old) return old;
            return { ...old, probability: newProbability, volume: currentVolume + tradeAmount };
          }
        );

        console.log(
          `Probability: ${currentProbability}% → ${newProbability}% (${positionType.toUpperCase()})`
        );

        return newProbability;
      } catch (err) {
        console.error("Error updating probability:", err);
        return null;
      }
    },
    [queryClient]
  );

  return { updateProbabilityAfterTrade };
};
