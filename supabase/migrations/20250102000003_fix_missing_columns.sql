-- 1. Ensure all necessary columns exist in the profiles table
-- We use IF NOT EXISTS to prevent errors if they are already there
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_watched BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ads_watched_today INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_ad_reset_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS vip_level INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS balance DECIMAL DEFAULT 0.0;

-- 2. Force update the watch_ad function to use these columns correctly
CREATE OR REPLACE FUNCTION watch_ad()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
  reward_amount DECIMAL;
  new_balance DECIMAL;
  today DATE := CURRENT_DATE;
BEGIN
  -- Get profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Profile not found');
  END IF;

  -- Calculate Reward based on VIP level
  -- VIP 0: 0.00025
  -- VIP 1: 0.0005
  -- VIP 2: 0.0008
  -- VIP 3: 0.001
  reward_amount := 0.00025;
  IF user_profile.vip_level = 1 THEN reward_amount := 0.0005; END IF;
  IF user_profile.vip_level = 2 THEN reward_amount := 0.0008; END IF;
  IF user_profile.vip_level = 3 THEN reward_amount := 0.001; END IF;

  -- Reset daily counter if needed (Safe Check)
  IF user_profile.last_ad_reset_date IS NULL OR user_profile.last_ad_reset_date < today THEN
    UPDATE profiles 
    SET ads_watched_today = 0, last_ad_reset_date = today 
    WHERE id = auth.uid();
    user_profile.ads_watched_today := 0;
  END IF;

  -- Check limit
  IF user_profile.ads_watched_today >= 5000 THEN
    RETURN json_build_object('success', false, 'message', 'Daily limit reached');
  END IF;

  -- Update stats safely
  UPDATE profiles
  SET 
    balance = COALESCE(balance, 0) + reward_amount,
    ads_watched = COALESCE(ads_watched, 0) + 1,
    ads_watched_today = COALESCE(ads_watched_today, 0) + 1,
    last_ad_reset_date = today
  WHERE id = auth.uid()
  RETURNING balance INTO new_balance;

  RETURN json_build_object('success', true, 'new_balance', new_balance);
END;
$$;
