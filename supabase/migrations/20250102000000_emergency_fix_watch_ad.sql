-- FIX: Add missing columns if they don't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER DEFAULT 0;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS last_ad_reset_date DATE DEFAULT CURRENT_DATE;

-- FIX: Re-create the watch_ad function to ensure it uses the correct columns
CREATE OR REPLACE FUNCTION public.watch_ad()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile public.profiles%ROWTYPE;
  new_balance numeric;
  reward_amount numeric;
  daily_limit integer := 5000;
  today_date date := CURRENT_DATE;
BEGIN
  -- 1. Get Profile with Lock
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  -- 2. Handle Daily Reset (Robust Date Check)
  -- If last reset was before today (or null), reset counter
  IF user_profile.last_ad_reset_date IS NULL OR user_profile.last_ad_reset_date < today_date THEN
    user_profile.ads_watched_today := 0;
    user_profile.last_ad_reset_date := today_date;
  END IF;

  -- 3. Check Limits
  IF user_profile.ads_watched_today >= daily_limit THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- 4. Calculate Reward based on VIP Level
  IF user_profile.vip_level = 3 THEN reward_amount := 0.001;
  ELSIF user_profile.vip_level = 2 THEN reward_amount := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN reward_amount := 0.0005;
  ELSE reward_amount := 0.00025;
  END IF;

  new_balance := user_profile.balance + reward_amount;

  -- 5. Update Database
  UPDATE public.profiles
  SET 
    balance = new_balance,
    ads_watched = ads_watched + 1,
    ads_watched_today = user_profile.ads_watched_today + 1,
    last_ad_reset_date = user_profile.last_ad_reset_date
  WHERE id = auth.uid();

  RETURN json_build_object('success', true, 'new_balance', new_balance);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
