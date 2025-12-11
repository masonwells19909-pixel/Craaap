-- Function to self-heal missing profiles (Fixes "Corrupted User" state)
CREATE OR REPLACE FUNCTION public.self_heal_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_meta jsonb;
  v_ref_code text;
BEGIN
  -- Get current user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if profile already exists
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RETURN;
  END IF;

  -- Get user data from auth.users
  SELECT email, raw_user_meta_data INTO v_email, v_meta
  FROM auth.users
  WHERE id = v_user_id;

  -- Generate a random referral code if missing
  v_ref_code := COALESCE(v_meta->>'referral_code', encode(gen_random_bytes(4), 'hex'));

  -- Insert missing profile
  INSERT INTO public.profiles (
    id, 
    email, 
    referral_code, 
    referred_by,
    balance,
    ads_watched,
    ads_watched_today,
    vip_level,
    mining_unlocked,
    mining_deposit,
    referral_earnings
  ) VALUES (
    v_user_id,
    COALESCE(v_email, 'user_' || v_user_id || '@telegram.miniapp.com'),
    v_ref_code,
    NULL, -- Cannot recover referrer in self-heal mode, but allows user to enter app
    0,
    0,
    0,
    1,
    FALSE,
    0,
    0
  );
END;
$$;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION public.self_heal_profile TO authenticated;
