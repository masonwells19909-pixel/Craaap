-- Migration: Bulletproof Signup & Account Recovery
-- This script ensures signup NEVER fails due to profile conflicts

-- 1. Improved Trigger Function (Robust)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  tg_id BIGINT;
  ref_code TEXT;
  full_name TEXT;
BEGIN
  -- Extract metadata safely
  BEGIN
    tg_id := (new.raw_user_meta_data->>'telegram_id')::BIGINT;
    ref_code := new.raw_user_meta_data->>'referral_code';
    full_name := new.raw_user_meta_data->>'full_name';
  EXCEPTION WHEN OTHERS THEN
    tg_id := NULL;
  END;

  -- 1. Cleanup: Remove any existing profile with this telegram_id (Zombie data check)
  -- This prevents "Unique Constraint" errors if a previous account was half-deleted
  IF tg_id IS NOT NULL THEN
      DELETE FROM public.profiles WHERE telegram_id = tg_id AND id <> new.id;
  END IF;

  -- 2. Insert New Profile
  INSERT INTO public.profiles (
    id,
    email,
    telegram_id,
    full_name,
    referral_code,
    referred_by,
    balance,
    ads_watched,
    vip_level
  )
  VALUES (
    new.id,
    new.email,
    tg_id,
    COALESCE(full_name, 'User'),
    -- Generate random referral code if not provided
    COALESCE(
        (SELECT substring(md5(random()::text) from 1 for 8)), 
        'user_' || floor(random() * 100000)::text
    ),
    -- Handle Referral Logic (Safe lookup)
    (
        SELECT id FROM public.profiles 
        WHERE referral_code = ref_code 
        AND ref_code IS NOT NULL 
        AND ref_code <> '' 
        LIMIT 1
    ),
    0, 0, 0
  )
  ON CONFLICT (id) DO UPDATE SET
    telegram_id = EXCLUDED.telegram_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email;

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth.users insert
  -- This allows the user to login, and we can "Self Heal" the profile later
  RAISE WARNING 'Profile creation failed: %', SQLERRM;
  RETURN new;
END;
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Self Heal Function (RPC)
-- Frontend calls this if it logs in but finds no profile
CREATE OR REPLACE FUNCTION public.self_heal_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  u auth.users%ROWTYPE;
  tg_id BIGINT;
BEGIN
  -- Get current user data from auth.users
  SELECT * INTO u FROM auth.users WHERE id = auth.uid();
  
  IF u.id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Extract Telegram ID safely
  BEGIN
    tg_id := (u.raw_user_meta_data->>'telegram_id')::BIGINT;
  EXCEPTION WHEN OTHERS THEN
    tg_id := NULL;
  END;

  -- Check if profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u.id) THEN
    -- Manually trigger the creation logic
    INSERT INTO public.profiles (
        id, 
        email, 
        telegram_id, 
        full_name, 
        referral_code,
        balance,
        ads_watched,
        vip_level
    )
    VALUES (
        u.id,
        u.email,
        tg_id,
        COALESCE(u.raw_user_meta_data->>'full_name', 'Recovered User'),
        substring(md5(random()::text) from 1 for 8),
        0, 0, 0
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;
