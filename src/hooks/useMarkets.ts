import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ============================================
// Types & Interfaces
// ============================================

export interface DbMarket {
  id: string;
  title: string;
  description: string | null;
  category: string;
  probability: number;
  volume: number;
  end_date: string;
  verified: boolean;
  resolution_status: string;
  resolution_source: string | null;
  validator_count: number;
  consensus_percentage: number | null;
  intelligent_contract_address: string | null;
  base_contract_address: string | null;
  network: string | null;
  deployer_wallet: string | null;
  genlayer_resolution_address: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MarketFilters {
  category?: string;
  status?: string;
  search?: string;
  sortBy?: "volume" | "end_date" | "probability" | "created_at";
  sortOrder?: "asc" | "desc";
}

export interface CreateMarketInput {
  title: string;
  description?: string;
  category?: string;
  end_date: string;
  resolution_source?: string;
  probability?: number;
  volume?: number;
  deployer_wallet?: string | null;
  verified?: boolean;
  resolution_status?: string;
  validator_count?: number;
  consensus_percentage?: number;
  intelligent_contract_address?: string | null;
  base_contract_address?: string | null;
  network?: string | null;
}

// ============================================
// Query Keys Factory
// ============================================

export const marketKeys = {
  all: ["markets"] as const,
  lists: () => [...marketKeys.all, "list"] as const,
  list: (filters: MarketFilters) => [...marketKeys.lists(), filters] as const,
  details: () => [...marketKeys.all, "detail"] as const,
  detail: (id: string) => [...marketKeys.details(), id] as const,
};

// ============================================
// Query Hooks
// ============================================

export const useMarkets = (filters?: MarketFilters) => {
  return useQuery({
    queryKey: filters ? marketKeys.list(filters) : marketKeys.all,
    queryFn: async () => {
      let query = supabase
        .from("markets")
        .select("*");

      // Apply category filter - skip if "all" or "All" or empty
      if (filters?.category && filters.category.toLowerCase() !== "all") {
        query = query.eq("category", filters.category);
      }

      // Apply status filter
      if (filters?.status && filters.status.toLowerCase() !== "all") {
        query = query.eq("resolution_status", filters.status);
      }

      // Apply search filter
      if (filters?.search && filters.search.trim()) {
        query = query.ilike("title", `%${filters.search.trim()}%`);
      }

      // Apply sorting
      const sortBy = filters?.sortBy || "volume";
      const sortOrder = filters?.sortOrder || "desc";
      query = query.order(sortBy, { ascending: sortOrder === "asc" });

      const { data, error } = await query;

      if (error) throw error;
      return data as DbMarket[];
    },
  });
};

export const useMarket = (id: string) => {
  return useQuery({
    queryKey: marketKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("markets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data as DbMarket | null;
    },
    enabled: !!id,
  });
};

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook to create a new market
 */
export const useCreateMarket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMarketInput) => {
      const { data, error } = await supabase
        .from("markets")
        .insert({
          title: input.title,
          description: input.description || null,
          category: input.category || "Other",
          end_date: input.end_date,
          resolution_source: input.resolution_source || null,
          probability: input.probability ?? 50,
          volume: input.volume ?? 0,
          deployer_wallet: input.deployer_wallet || null,
          verified: input.verified ?? false,
          resolution_status: input.resolution_status || "active",
          validator_count: input.validator_count ?? 0,
          consensus_percentage: input.consensus_percentage ?? 0,
          intelligent_contract_address: input.intelligent_contract_address || null,
          base_contract_address: input.base_contract_address || null,
          network: input.network || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as DbMarket;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
  });
};

/**
 * Hook for optimistic voting/probability updates
 */
export const useOptimisticVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      marketId,
      vote,
      amount,
    }: {
      marketId: string;
      vote: "yes" | "no";
      amount: number;
    }) => {
      // Get current market data
      const { data: market, error: fetchError } = await supabase
        .from("markets")
        .select("*")
        .eq("id", marketId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new probability based on vote
      const currentProb = market.probability;
      const volumeWeight = Math.min(amount / 100, 10); // Cap influence at 10%
      const probChange = vote === "yes" ? volumeWeight : -volumeWeight;
      const newProbability = Math.max(1, Math.min(99, currentProb + probChange));

      // Update market
      const { data, error } = await supabase
        .from("markets")
        .update({
          probability: Math.round(newProbability),
          volume: market.volume + amount,
        })
        .eq("id", marketId)
        .select()
        .single();

      if (error) throw error;
      return data as DbMarket;
    },
    onMutate: async ({ marketId, vote, amount }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: marketKeys.detail(marketId) });
      await queryClient.cancelQueries({ queryKey: marketKeys.all });

      // Snapshot previous value
      const previousMarket = queryClient.getQueryData<DbMarket>(marketKeys.detail(marketId));
      const previousMarkets = queryClient.getQueryData<DbMarket[]>(marketKeys.all);

      // Optimistically update
      if (previousMarket) {
        const volumeWeight = Math.min(amount / 100, 10);
        const probChange = vote === "yes" ? volumeWeight : -volumeWeight;
        const newProbability = Math.max(1, Math.min(99, previousMarket.probability + probChange));

        queryClient.setQueryData<DbMarket>(marketKeys.detail(marketId), {
          ...previousMarket,
          probability: Math.round(newProbability),
          volume: previousMarket.volume + amount,
        });
      }

      if (previousMarkets) {
        queryClient.setQueryData<DbMarket[]>(
          marketKeys.all,
          previousMarkets.map((m) => {
            if (m.id === marketId) {
              const volumeWeight = Math.min(amount / 100, 10);
              const probChange = vote === "yes" ? volumeWeight : -volumeWeight;
              const newProbability = Math.max(1, Math.min(99, m.probability + probChange));
              return {
                ...m,
                probability: Math.round(newProbability),
                volume: m.volume + amount,
              };
            }
            return m;
          })
        );
      }

      return { previousMarket, previousMarkets };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousMarket) {
        queryClient.setQueryData(marketKeys.detail(variables.marketId), context.previousMarket);
      }
      if (context?.previousMarkets) {
        queryClient.setQueryData(marketKeys.all, context.previousMarkets);
      }
    },
    onSettled: (data, error, variables) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(variables.marketId) });
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
    },
  });
};

/**
 * Hook to update market data
 */
export const useUpdateMarket = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbMarket> & { id: string }) => {
      const { data, error } = await supabase
        .from("markets")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as DbMarket;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: marketKeys.all });
      queryClient.invalidateQueries({ queryKey: marketKeys.detail(data.id) });
    },
  });
};
