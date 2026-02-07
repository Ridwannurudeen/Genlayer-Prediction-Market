import { useCallback } from "react";
import { useUpdateMarket } from "@/hooks/useMarkets";
import { isHexAddress, isHexTxHash, resolveGenLayerContractAddress } from "@/lib/genlayerTx";

export interface GenLayerBackfillTarget {
  id: string;
  intelligent_contract_address: string | null;
  genlayer_resolution_address: string | null;
}

interface BackfillOptions {
  maxAttempts?: number;
  delayMs?: number;
  timeoutMs?: number;
}

export const useGenLayerBackfill = () => {
  const updateMarket = useUpdateMarket();

  const backfillContractAddress = useCallback(
    async (
      target: GenLayerBackfillTarget,
      options: BackfillOptions = {}
    ): Promise<string | null> => {
      if (!target?.id) return null;

      if (target.intelligent_contract_address && isHexAddress(target.intelligent_contract_address)) {
        return target.intelligent_contract_address;
      }

      const candidate = target.genlayer_resolution_address;
      if (!candidate) return null;

      // If the candidate is already a contract address, persist it.
      if (isHexAddress(candidate)) {
        try {
          await updateMarket.mutateAsync({
            id: target.id,
            intelligent_contract_address: candidate,
          });
        } catch (error) {
          console.warn("Failed to persist GenLayer contract address:", error);
        }
        return candidate;
      }

      if (!isHexTxHash(candidate)) return null;

      const maxAttempts = options.maxAttempts ?? 2;
      const delayMs = options.delayMs ?? 15000;
      const timeoutMs = options.timeoutMs ?? 12000;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const resolved = await resolveGenLayerContractAddress(candidate, timeoutMs);
        if (resolved) {
          try {
            await updateMarket.mutateAsync({
              id: target.id,
              intelligent_contract_address: resolved,
            });
          } catch (error) {
            console.warn("Failed to save resolved GenLayer address:", error);
          }
          return resolved;
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return null;
    },
    [updateMarket]
  );

  return { backfillContractAddress };
};
