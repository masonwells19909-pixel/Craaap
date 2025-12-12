-- Migration: Fix Earnings Logic & Daily Reset
-- Description: Replaces the watch_ad function with a robust, atomic transaction logic.

CREATE OR REPLACE FUNCTION public.watch_ad()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated permissions to ensure updates happen
SET search_path = public, auth -- Secure search path
AS $$
DECLARE
    user_id uuid := auth.uid();
    user_profile record;
    referrer_id uuid;
    reward_amount numeric;
    referral_bonus numeric;
    current_date_str text;
    new_balance numeric;
    new_ads_today int;
    new_ads_total int;
BEGIN
    -- 1. Get Current Date (UTC)
    current_date_str := to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD');

    -- 2. Lock the user row to prevent race conditions (Critical for fast clicking)
    SELECT * INTO user_profile FROM public.profiles WHERE id = user_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'User profile not found');
    END IF;

    -- 3. Handle Daily Reset Logic
    IF user_profile.last_ad_reset_date IS DISTINCT FROM current_date_str THEN
        -- It's a new day, reset counter
        new_ads_today := 0;
    ELSE
        new_ads_today := user_profile.ads_watched_today;
    END IF;

    -- 4. Check Daily Limit (5000 ads)
    IF new_ads_today >= 5000 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Daily limit reached (5000/5000)');
    END IF;

    -- 5. Determine Reward based on VIP Level
    -- Level 0: 0.00025, Level 1: 0.0005, Level 2: 0.0008, Level 3: 0.001
    IF user_profile.vip_level = 3 THEN
        reward_amount := 0.001;
    ELSIF user_profile.vip_level = 2 THEN
        reward_amount := 0.0008;
    ELSIF user_profile.vip_level = 1 THEN
        reward_amount := 0.0005;
    ELSE
        reward_amount := 0.00025;
    END IF;

    -- 6. Update User Stats
    new_balance := user_profile.balance + reward_amount;
    new_ads_today := new_ads_today + 1;
    new_ads_total := user_profile.ads_watched + 1;

    -- 7. Handle Referral Bonus (10%)
    referrer_id := user_profile.referred_by;
    IF referrer_id IS NOT NULL THEN
        referral_bonus := reward_amount * 0.10;
        
        -- Update referrer balance safely
        UPDATE public.profiles 
        SET 
            balance = balance + referral_bonus,
            referral_earnings = referral_earnings + referral_bonus
        WHERE id = referrer_id;
    END IF;

    -- 8. Commit Updates to User Profile
    UPDATE public.profiles
    SET 
        balance = new_balance,
        ads_watched = new_ads_total,
        ads_watched_today = new_ads_today,
        last_ad_reset_date = current_date_str
    WHERE id = user_id;

    -- 9. Return Success & New Data
    RETURN jsonb_build_object(
        'success', true, 
        'new_balance', new_balance,
        'ads_today', new_ads_today,
        'ads_total', new_ads_total,
        'reward', reward_amount
    );
END;
$$;
