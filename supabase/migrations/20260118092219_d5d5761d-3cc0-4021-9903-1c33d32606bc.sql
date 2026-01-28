-- Drop any remaining RLS policies that reference user_id on positions
DROP POLICY IF EXISTS "Users can create their own positions" ON positions;
DROP POLICY IF EXISTS "Users can update their own positions" ON positions;
DROP POLICY IF EXISTS "Users can view their own positions" ON positions;

-- Drop any remaining RLS policies that reference user_id on trades
DROP POLICY IF EXISTS "Users can create their own trades" ON trades;
DROP POLICY IF EXISTS "Users can view their own trades" ON trades;

-- Drop foreign key constraints
ALTER TABLE positions DROP CONSTRAINT IF EXISTS positions_user_id_fkey;
ALTER TABLE trades DROP CONSTRAINT IF EXISTS trades_user_id_fkey;

-- Now change positions.user_id to text
ALTER TABLE positions 
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Change trades.user_id to text  
ALTER TABLE trades
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Create new permissive policies for wallet-based auth
CREATE POLICY "Allow all position inserts" ON positions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all position updates" ON positions
  FOR UPDATE USING (true);

CREATE POLICY "Allow all position selects" ON positions
  FOR SELECT USING (true);

CREATE POLICY "Allow all trade inserts" ON trades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow all trade selects" ON trades
  FOR SELECT USING (true);