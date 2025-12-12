/*
  # Fix watch_ad function conflict
  
  1. Drops the existing `watch_ad` function to resolve return type conflicts.
  2. Re-creates the function with robust logic to:
     - Increment `ads_watched` (lifetime counter) for VIP progress.
     - Increment `ads_watched_today` for daily limits.
     - Add balance based on VIP level.
     - Upgrade VIP level automatically.
*/

-- Drop the function first to avoid "cannot change return type" error
DROP FUNCTION IF EXISTS watch_ad();

-- Re-create the function with correct logic
CREATE OR REPLACE FUNCTION watch_ad()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_vip int;
  reward_amount numeric;
  new_total_ads int;
BEGIN
  -- Get current VIP level
  SELECT vip_level INTO current_vip
  FROM profiles
  WHERE id = auth.uid();

  -- Calculate Reward based on VIP Level
  IF current_vip >= 3 THEN
    reward_amount := 0.001;
  ELSIF current_vip = 2 THEN
    reward_amount := 0.0008;
  ELSIF current_vip = 1 THEN
    reward_amount := 0.0005;
  ELSE
    reward_amount := 0.00025;
  END IF;

  -- Update Balance and Counters
  -- We use RETURNING to get the new total for the VIP check immediately
  UPDATE profiles
  SET 
    balance = balance + reward_amount,
    ads_watched = ads_watched + 1,
    ads_watched_today = ads_watched_today + 1
  WHERE id = auth.uid()
  RETURNING ads_watched INTO new_total_ads;

  -- VIP Upgrade Logic (Check if user qualifies for next level)
  IF new_total_ads >= 50000 AND current_vip < 3 THEN
    UPDATE profiles SET vip_level = 3 WHERE id = auth.uid();
  ELSIF new_total_ads >= 30000 AND current_vip < 2 THEN
    UPDATE profiles SET vip_level = 2 WHERE id = auth.uid();
  ELSIF new_total_ads >= 15000 AND current_vip < 1 THEN
    UPDATE profiles SET vip_level = 1 WHERE id = auth.uid();
  END IF;
END;
$$;
