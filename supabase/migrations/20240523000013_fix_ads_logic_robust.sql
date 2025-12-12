/*
  # Fix Ads Calculation and Rewards Logic
  
  1. Changes
    - Add `last_ad_reset_date` column to profiles to track daily resets reliably.
    - Recreate `watch_ad` function with robust logic:
      - Automatically reset daily counter if the date has changed (Lazy Reset).
      - Calculate rewards based on VIP level accurately.
      - Distribute referral bonuses (10%).
      - Enforce 5000 daily limit.
      - Use ROW LOCKING to prevent race conditions.
*/

-- Add column safely to track the last reset date
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_ad_reset_date') THEN
        ALTER TABLE profiles ADD COLUMN last_ad_reset_date date DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- Recreate the watch_ad function with fixed logic
CREATE OR REPLACE FUNCTION watch_ad()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  reward_amount numeric;
  is_new_day boolean;
BEGIN
  -- Lock the row for update to prevent race conditions (Critical for fast ad watching)
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid() FOR UPDATE;

  -- Check if we need to reset daily counter (Lazy Reset Logic)
  -- Resets if the stored date is older than today OR if it's null
  is_new_day := user_profile.last_ad_reset_date < CURRENT_DATE OR user_profile.last_ad_reset_date IS NULL;
  
  IF is_new_day THEN
    UPDATE profiles 
    SET ads_watched_today = 0, last_ad_reset_date = CURRENT_DATE 
    WHERE id = auth.uid();
    
    -- Update local variable to reflect reset for subsequent checks
    user_profile.ads_watched_today := 0;
  END IF;

  -- Check daily limit (5000 ads)
  IF user_profile.ads_watched_today >= 5000 THEN
    RAISE EXCEPTION 'Daily ad limit reached (5000/5000)';
  END IF;

  -- Determine Reward based on VIP Level
  -- VIP 3: $0.001
  -- VIP 2: $0.0008
  -- VIP 1: $0.0005
  -- VIP 0: $0.00025 (Default)
  IF user_profile.vip_level >= 3 THEN
    reward_amount := 0.001;
  ELSIF user_profile.vip_level = 2 THEN
    reward_amount := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN
    reward_amount := 0.0005;
  ELSE
    reward_amount := 0.00025;
  END IF;

  -- Update User: Add Balance, Increment Counters
  UPDATE profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,
    ads_watched_today = ads_watched_today + 1
  WHERE id = auth.uid();

  -- Handle Referral Bonus (10% to the referrer)
  IF user_profile.referred_by IS NOT NULL THEN
    UPDATE profiles
    SET 
      balance = balance + (reward_amount * 0.10),
      referral_earnings = referral_earnings + (reward_amount * 0.10)
    WHERE id = user_profile.referred_by;
  END IF;

END;
$$;
