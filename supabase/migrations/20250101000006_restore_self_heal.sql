-- Restore the self_heal_profile function
-- This function is critical for the "Auto-Auth" feature to recover from race conditions during signup

CREATE OR REPLACE FUNCTION public.self_heal_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Secure search path
AS $$
DECLARE
  v_uid uuid;
  v_email text;
  v_meta jsonb;
  v_ref_code text;
BEGIN
  -- Get current user ID
  v_uid := auth.uid();
  
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if profile already exists to avoid duplicate key error
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_uid) THEN
    RETURN;
  END IF;

  -- Get user details from auth.users
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users
  WHERE id = v_uid;

  -- Generate a random referral code if not present
  v_ref_code := COALESCE(v_meta->>'referral_code', encode(gen_random_bytes(6), 'hex'));

  -- Insert missing profile
  INSERT INTO public.profiles (
    id,
    email,
    referral_code,
    full_name,
    balance,
    ads_watched,
    ads_watched_today,
    vip_level,
    mining_unlocked,
    mining_deposit,
    referral_earnings,
    created_at
  )
  VALUES (
    v_uid,
    v_email,
    v_ref_code,
    COALESCE(v_meta->>'full_name', 'User'),
    0, -- Initial balance
    0, -- Initial ads watched
    0, -- Initial ads today
    1, -- Initial VIP level
    false, -- Mining locked
    0, -- Mining deposit
    0, -- Referral earnings
    now()
  );
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.self_heal_profile() TO authenticated;
