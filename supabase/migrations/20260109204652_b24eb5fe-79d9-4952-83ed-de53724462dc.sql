-- Create markets table
CREATE TABLE public.markets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'General',
    probability NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    volume NUMERIC(18,2) NOT NULL DEFAULT 0,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    resolution_status TEXT NOT NULL DEFAULT 'open' CHECK (resolution_status IN ('open', 'pending_resolution', 'resolved_yes', 'resolved_no', 'disputed')),
    resolution_source TEXT,
    validator_count INTEGER NOT NULL DEFAULT 0,
    consensus_percentage NUMERIC(5,2),
    intelligent_contract_address TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    wallet_address TEXT,
    total_volume_traded NUMERIC(18,2) NOT NULL DEFAULT 0,
    total_profit_loss NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create positions table for user holdings
CREATE TABLE public.positions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    position_type TEXT NOT NULL CHECK (position_type IN ('yes', 'no')),
    shares NUMERIC(18,6) NOT NULL DEFAULT 0,
    avg_price NUMERIC(5,4) NOT NULL,
    total_invested NUMERIC(18,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, market_id, position_type)
);

-- Create trades table for history
CREATE TABLE public.trades (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('buy', 'sell')),
    position_type TEXT NOT NULL CHECK (position_type IN ('yes', 'no')),
    shares NUMERIC(18,6) NOT NULL,
    price NUMERIC(5,4) NOT NULL,
    total_amount NUMERIC(18,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create price_history table for charts
CREATE TABLE public.price_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES public.markets(id) ON DELETE CASCADE,
    probability NUMERIC(5,2) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Markets policies (public read, authenticated create)
CREATE POLICY "Markets are viewable by everyone" 
ON public.markets FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create markets" 
ON public.markets FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update their markets" 
ON public.markets FOR UPDATE 
TO authenticated
USING (auth.uid() = created_by);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" 
ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Positions policies (user can only see/manage their own)
CREATE POLICY "Users can view their own positions" 
ON public.positions FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own positions" 
ON public.positions FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own positions" 
ON public.positions FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id);

-- Trades policies (user can only see/manage their own)
CREATE POLICY "Users can view their own trades" 
ON public.trades FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trades" 
ON public.trades FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Price history policies (public read)
CREATE POLICY "Price history is viewable by everyone" 
ON public.price_history FOR SELECT USING (true);

CREATE POLICY "System can insert price history" 
ON public.price_history FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_markets_updated_at
BEFORE UPDATE ON public.markets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_positions_updated_at
BEFORE UPDATE ON public.positions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for markets and price_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.markets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.price_history;

-- Insert initial market data
INSERT INTO public.markets (title, description, category, probability, volume, end_date, verified, resolution_status, validator_count, consensus_percentage, resolution_source) VALUES
('Will Bitcoin exceed $150,000 by end of 2026?', 'Resolution based on CoinGecko price data at market close on December 31, 2026', 'Crypto', 62.5, 2847291, '2026-12-31T23:59:59Z', true, 'open', 15, null, 'CoinGecko API via Intelligent Contract'),
('Will the US Federal Reserve cut interest rates in Q1 2026?', 'Resolves YES if the Fed announces any rate cut before April 1, 2026', 'Finance', 45.2, 1523847, '2026-04-01T00:00:00Z', true, 'open', 12, null, 'Federal Reserve Official Announcements'),
('Will Ethereum transition to full sharding by 2027?', 'Technical milestone verification by core developers', 'Crypto', 38.7, 892156, '2027-01-01T00:00:00Z', true, 'open', 18, null, 'Ethereum Foundation Blog'),
('Will AI models pass the Turing Test by 2027?', 'Based on official Turing Test competition results', 'Tech', 71.3, 3291847, '2027-01-01T00:00:00Z', true, 'open', 22, null, 'Official Competition Results'),
('Will there be a new global climate agreement in 2026?', 'UN Climate Summit outcomes and official announcements', 'World', 33.8, 567823, '2026-12-31T23:59:59Z', false, 'open', 8, null, 'UN Official Statements'),
('Will the S&P 500 reach 6000 points in 2026?', 'Based on closing price on any trading day in 2026', 'Finance', 55.4, 1892347, '2026-12-31T23:59:59Z', true, 'open', 14, null, 'Yahoo Finance API'),
('Will a major tech company announce quantum supremacy breakthrough?', 'Official peer-reviewed publication or press release from top 10 tech companies', 'Tech', 28.9, 445672, '2026-12-31T23:59:59Z', false, 'open', 10, null, 'Academic Publications & Press Releases'),
('Will GenLayer mainnet launch in 2026?', 'Official announcement from GenLayer team confirming mainnet deployment', 'Crypto', 78.5, 4521893, '2026-12-31T23:59:59Z', true, 'open', 25, null, 'GenLayer Official Channels');
