/*
  # Fix Ads Logic & Earnings Calculation
  
  ## Query Description:
  This migration redefines the `watch_ad` function to ensure accurate earnings calculation, 
  proper daily reset handling, and prevents race conditions using row locking.
  It also explicitly sets the search_path to address security advisories.
  
  ## Metadata:
  - Schema-Category: "Logic"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Function: watch_ad() (Replaced with robust logic)
  
  ## Security Implications:
  - RLS Status: Safe (SECURITY DEFINER)
  - Search Path: Set to public (Fixes security warning)
*/

CREATE OR REPLACE FUNCTION watch_ad()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  reward_amount DECIMAL;
  referrer_bonus DECIMAL;
  today_date DATE;
BEGIN
  -- Get current date
  today_date := CURRENT_DATE;

  -- Lock the row for the current user to prevent race conditions (Critical for rapid clicks)
  SELECT * INTO user_profile
  FROM profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Check and reset daily counter if needed (Lazy Reset)
  -- If last_ad_reset_date is null or older than today, reset the counter
  IF user_profile.last_ad_reset_date IS NULL OR user_profile.last_ad_reset_date < today_date THEN
    user_profile.ads_watched_today := 0;
    user_profile.last_ad_reset_date := today_date;
  END IF;

  -- Check daily limit (5000 ads)
  IF user_profile.ads_watched_today >= 5000 THEN
    RAISE EXCEPTION 'Daily ad limit reached (5000 ads)';
  END IF;

  -- Determine Reward based on VIP Level
  -- VIP 0: 0.00025
  -- VIP 1: 0.0005
  -- VIP 2: 0.0008
  -- VIP 3: 0.001
  IF user_profile.vip_level = 3 THEN
    reward_amount := 0.001;
  ELSIF user_profile.vip_level = 2 THEN
    reward_amount := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN
    reward_amount := 0.0005;
  ELSE
    reward_amount := 0.00025;
  END IF;

  -- Update User Stats
  UPDATE profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,
    ads_watched_today = user_profile.ads_watched_today + 1,
    last_ad_reset_date = today_date
  WHERE id = auth.uid();

  -- Handle Referral Bonus (10%)
  IF user_profile.referred_by IS NOT NULL THEN
    referrer_bonus := reward_amount * 0.10;
    
    -- Update referrer balance safely
    UPDATE profiles
    SET 
      balance = balance + referrer_bonus,
      referral_earnings = referral_earnings + referrer_bonus
    WHERE id = user_profile.referred_by;
  END IF;

END;
$$;
