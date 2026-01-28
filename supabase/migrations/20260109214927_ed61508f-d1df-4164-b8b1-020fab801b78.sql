-- Add deployer_wallet column to markets table to track who deployed the contract
ALTER TABLE public.markets 
ADD COLUMN deployer_wallet text;

-- Add an index for querying by deployer wallet
CREATE INDEX idx_markets_deployer_wallet ON public.markets(deployer_wallet);

-- Add a comment explaining the purpose
COMMENT ON COLUMN public.markets.deployer_wallet IS 'Wallet address that deployed the Intelligent Contract to GenLayer';