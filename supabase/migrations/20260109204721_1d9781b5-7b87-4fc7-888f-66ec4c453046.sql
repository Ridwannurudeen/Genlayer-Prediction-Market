-- Fix the permissive price_history INSERT policy
DROP POLICY IF EXISTS "System can insert price history" ON public.price_history;

-- Only allow inserting price history for markets that exist
CREATE POLICY "Authenticated users can insert price history" 
ON public.price_history FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.markets WHERE id = market_id)
);