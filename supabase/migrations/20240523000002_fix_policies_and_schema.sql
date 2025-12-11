/*
  # Fix Schema and Policies
  
  ## Query Description:
  This migration safely sets up the schema by:
  1. Creating tables if they don't exist.
  2. Dropping existing policies to prevent "policy already exists" errors.
  3. Re-creating policies with correct permissions.
  4. Securing the user creation trigger function (addressing security advisories).
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Security Implications:
  - RLS is enabled on all tables.
  - Functions use fixed search_path for security.
*/

-- 1. Create Tables (if not exist)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    balance DECIMAL(12, 5) DEFAULT 0.00000,
    ads_watched INTEGER DEFAULT 0,
    ads_watched_today INTEGER DEFAULT 0,
    last_ad_watched_at TIMESTAMPTZ,
    vip_level INTEGER DEFAULT 0,
    mining_unlocked BOOLEAN DEFAULT FALSE,
    mining_deposit DECIMAL(10, 2) DEFAULT 0.00,
    last_mining_spin TIMESTAMPTZ,
    referral_code TEXT UNIQUE,
    referral_earnings DECIMAL(12, 5) DEFAULT 0.00000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    wallet_address TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- 3. Drop Existing Policies (To fix 42710 error)
DO $$ 
BEGIN
    -- Profiles Policies
    DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
    
    -- Withdrawals Policies
    DROP POLICY IF EXISTS "Users can view own withdrawals" ON public.withdrawals;
    DROP POLICY IF EXISTS "Users can create withdrawals" ON public.withdrawals;
END $$;

-- 4. Re-create Policies
-- Profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Withdrawals
CREATE POLICY "Users can view own withdrawals" 
ON public.withdrawals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawals" 
ON public.withdrawals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 5. Secure User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public -- Fixes Security Advisory
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, referral_code)
  VALUES (
    new.id, 
    new.email,
    -- Generate a simple random referral code
    substring(md5(random()::text) from 1 for 8)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql;

-- Re-create Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
