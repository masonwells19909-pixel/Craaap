/*
  # Fix Schema Conflicts & Setup Core Tables
  
  1. Changes
    - Safely creates tables if they don't exist
    - Drops existing policies to avoid "already exists" errors
    - Recreates policies for Profiles and Withdrawals
    - Sets up User Creation Trigger
    
  2. Security
    - Enables RLS on all tables
    - specific policies for user data access
*/

-- 1. Create profiles table if not exists
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  balance NUMERIC DEFAULT 0,
  ads_watched INTEGER DEFAULT 0,
  ads_watched_today INTEGER DEFAULT 0,
  last_ad_watched_at TIMESTAMPTZ,
  vip_level INTEGER DEFAULT 0,
  mining_unlocked BOOLEAN DEFAULT FALSE,
  mining_deposit NUMERIC DEFAULT 0,
  last_mining_spin TIMESTAMPTZ,
  referral_code TEXT UNIQUE,
  referral_earnings NUMERIC DEFAULT 0,
  referrer_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Safely drop and recreate policies for profiles
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can view referrer profile" ON public.profiles;
END $$;

CREATE POLICY "Users can view own profile" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can view referrer profile" 
  ON public.profiles FOR SELECT 
  USING (true); -- Needed to lookup referral codes

-- 3. Create withdrawals table if not exists
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id),
  amount NUMERIC NOT NULL,
  wallet_address TEXT NOT NULL,
  network TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- 4. Safely drop and recreate policies for withdrawals
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
    DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
END $$;

CREATE POLICY "Users can view own withdrawals" 
  ON public.withdrawals FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals" 
  ON public.withdrawals FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- 5. Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    new.id,
    new.email,
    encode(gen_random_bytes(6), 'hex') -- Simple random code
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
