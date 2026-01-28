-- Tighten RLS for wallet-based rows by binding rows to the signed-in user's profile wallet_address

-- Helper: current user's wallet address (set when they connect wallet)
CREATE OR REPLACE FUNCTION public.current_wallet_address()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.wallet_address
  FROM public.profiles p
  WHERE p.user_id = auth.uid()
  LIMIT 1
$$;

-- POSITIONS: replace permissive policies
DROP POLICY IF EXISTS "Allow all position inserts" ON positions;
DROP POLICY IF EXISTS "Allow all position updates" ON positions;
DROP POLICY IF EXISTS "Allow all position selects" ON positions;

CREATE POLICY "Users can view their own positions (by wallet)"
ON positions
FOR SELECT
TO authenticated
USING (user_id = public.current_wallet_address());

CREATE POLICY "Users can create their own positions (by wallet)"
ON positions
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.current_wallet_address());

CREATE POLICY "Users can update their own positions (by wallet)"
ON positions
FOR UPDATE
TO authenticated
USING (user_id = public.current_wallet_address())
WITH CHECK (user_id = public.current_wallet_address());

-- TRADES: replace permissive policies
DROP POLICY IF EXISTS "Allow all trade inserts" ON trades;
DROP POLICY IF EXISTS "Allow all trade selects" ON trades;

CREATE POLICY "Users can view their own trades (by wallet)"
ON trades
FOR SELECT
TO authenticated
USING (user_id = public.current_wallet_address());

CREATE POLICY "Users can create their own trades (by wallet)"
ON trades
FOR INSERT
TO authenticated
WITH CHECK (user_id = public.current_wallet_address());
