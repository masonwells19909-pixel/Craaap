-- Force fix for missing columns in profiles table
-- This script checks for existence before adding to avoid errors

DO $$
BEGIN
    -- 1. Add ads_watched if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ads_watched') THEN
        ALTER TABLE profiles ADD COLUMN ads_watched BIGINT DEFAULT 0;
    END IF;

    -- 2. Add ads_watched_today if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'ads_watched_today') THEN
        ALTER TABLE profiles ADD COLUMN ads_watched_today INTEGER DEFAULT 0;
    END IF;

    -- 3. Add last_ad_reset_date if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_ad_reset_date') THEN
        ALTER TABLE profiles ADD COLUMN last_ad_reset_date DATE DEFAULT CURRENT_DATE;
    END IF;
END $$;

-- 4. Re-create the watch_ad function to ensure it uses these columns correctly
CREATE OR REPLACE FUNCTION watch_ad()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  new_balance float8;
  reward_amount float8;
  daily_limit int := 5000;
BEGIN
  -- Get profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  -- Calculate Reward based on VIP
  IF user_profile.vip_level = 3 THEN reward_amount := 0.001;
  ELSIF user_profile.vip_level = 2 THEN reward_amount := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN reward_amount := 0.0005;
  ELSE reward_amount := 0.00025;
  END IF;

  -- Daily Reset Logic
  IF user_profile.last_ad_reset_date < CURRENT_DATE THEN
     user_profile.ads_watched_today := 0;
     user_profile.last_ad_reset_date := CURRENT_DATE;
  END IF;

  -- Check Limit
  IF user_profile.ads_watched_today >= daily_limit THEN
     RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- Update
  UPDATE profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,
    ads_watched_today = ads_watched_today + 1,
    last_ad_reset_date = user_profile.last_ad_reset_date
  WHERE id = auth.uid();

  RETURN json_build_object('success', true, 'new_balance', user_profile.balance + reward_amount);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;
