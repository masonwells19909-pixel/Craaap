-- Fix Security Advisories (Mutable Search Path)
ALTER FUNCTION handle_new_user() SET search_path = public;
ALTER FUNCTION watch_ad() SET search_path = public;
ALTER FUNCTION deposit_for_mining(numeric) SET search_path = public;
ALTER FUNCTION spin_mining_wheel() SET search_path = public;
ALTER FUNCTION request_withdrawal(numeric, text, text) SET search_path = public;
ALTER FUNCTION get_my_referrals() SET search_path = public;
ALTER FUNCTION withdraw_mining_deposit() SET search_path = public;

-- Robust Signup Trigger to Handle Collisions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_profile_id uuid;
  t_id bigint;
  user_referral_code text;
  valid_referrer_code text;
BEGIN
  -- 1. Extract telegram_id safely
  BEGIN
    t_id := (new.raw_user_meta_data->>'telegram_id')::bigint;
  EXCEPTION WHEN OTHERS THEN
    t_id := null;
  END;

  -- 2. Handle Orphaned Profiles (Collision Fix)
  -- If a profile exists with this telegram_id but different auth.users.id, delete it.
  IF t_id IS NOT NULL THEN
    SELECT id INTO existing_profile_id FROM public.profiles WHERE telegram_id = t_id;
    
    IF existing_profile_id IS NOT NULL THEN
      -- Delete the old orphaned profile to allow new signup
      DELETE FROM public.profiles WHERE id = existing_profile_id;
    END IF;
  END IF;

  -- 3. Generate a unique referral code for the new user
  user_referral_code := lower(substring(md5(random()::text) from 1 for 8));

  -- 4. Check if the user was referred by someone (validate code)
  SELECT referral_code INTO valid_referrer_code
  FROM public.profiles 
  WHERE referral_code = new.raw_user_meta_data->>'referral_code'
  AND referral_code IS NOT NULL
  LIMIT 1;

  -- 5. Insert new profile
  INSERT INTO public.profiles (
    id,
    email,
    referral_code,
    referred_by,
    telegram_id,
    full_name,
    balance,
    ads_watched,
    vip_level,
    mining_deposit
  )
  VALUES (
    new.id,
    new.email,
    user_referral_code,
    valid_referrer_code, -- Will be null if code was invalid
    t_id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'User'),
    0, 0, 1, 0 -- Default values
  );

  RETURN new;
END;
$$;
