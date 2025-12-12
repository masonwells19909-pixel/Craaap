-- Drop the function first to allow changing its return type from VOID/RECORD to JSON
DROP FUNCTION IF EXISTS public.watch_ad();

-- Re-create the function with robust logic and JSON return type
CREATE OR REPLACE FUNCTION public.watch_ad()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile public.profiles%ROWTYPE;
  reward_amount numeric;
  referrer_bonus numeric;
  new_balance numeric;
  new_ads_today int;
BEGIN
  -- 1. Lock the row for the current user to prevent race conditions (Double click exploits)
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  -- 2. Check for Daily Reset logic
  -- If last_ad_reset_date is NULL or not today, we treat ads_watched_today as 0 for this transaction
  IF user_profile.last_ad_reset_date IS NULL OR user_profile.last_ad_reset_date != CURRENT_DATE THEN
    new_ads_today := 0;
  ELSE
    new_ads_today := user_profile.ads_watched_today;
  END IF;

  -- 3. Check Daily Limit (5000)
  IF new_ads_today >= 5000 THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- 4. Determine Reward based on VIP Level
  -- Level 3: 0.001, Level 2: 0.0008, Level 1: 0.0005, Level 0: 0.00025
  IF user_profile.vip_level >= 3 THEN
    reward_amount := 0.001;
  ELSIF user_profile.vip_level = 2 THEN
    reward_amount := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN
    reward_amount := 0.0005;
  ELSE
    reward_amount := 0.00025;
  END IF;

  -- 5. Update User Stats
  -- We update the balance, increment total ads, increment daily ads, and set the reset date to today
  UPDATE public.profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,
    ads_watched_today = new_ads_today + 1,
    last_ad_reset_date = CURRENT_DATE
  WHERE id = auth.uid()
  RETURNING balance INTO new_balance;

  -- 6. Handle Referral Bonus (10%)
  IF user_profile.referred_by IS NOT NULL THEN
    referrer_bonus := reward_amount * 0.10;
    
    -- Update referrer balance safely
    UPDATE public.profiles
    SET 
      balance = balance + referrer_bonus,
      referral_earnings = referral_earnings + referrer_bonus
    WHERE id = user_profile.referred_by;
  END IF;

  -- 7. Return Success JSON with new values
  RETURN json_build_object(
    'success', true,
    'new_balance', new_balance,
    'reward', reward_amount,
    'ads_today', new_ads_today + 1
  );
END;
$$;
