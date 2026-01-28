-- Add network support columns to markets table
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS network TEXT DEFAULT 'simulated';
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS base_contract_address TEXT;
ALTER TABLE public.markets ADD COLUMN IF NOT EXISTS genlayer_resolution_address TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.markets.network IS 'Network type: simulated, base, genlayer, or hybrid';
COMMENT ON COLUMN public.markets.base_contract_address IS 'Contract address on Base Sepolia for trading';
COMMENT ON COLUMN public.markets.genlayer_resolution_address IS 'Contract address on GenLayer for AI resolution';