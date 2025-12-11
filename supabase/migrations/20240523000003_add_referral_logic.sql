/*
  # Add Referral Logic and Secure Ad Watching
  
  ## Query Description:
  1. Adds `referred_by` column to profiles to track who invited the user.
  2. Updates `handle_new_user` trigger to look up referral codes during signup.
  3. Creates `watch_ad` RPC function to securely handle rewards and 10% referral commission transactionally.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
*/

-- 1. Add referred_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
        ALTER TABLE public.profiles ADD COLUMN referred_by uuid REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Update the User Creation Trigger to handle Referral Codes
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  referrer_id uuid;
  input_ref_code text;
BEGIN
  -- Extract referral code from metadata (passed during signUp)
  input_ref_code := new.raw_user_meta_data->>'referral_code';
  
  -- Find referrer if code exists
  IF input_ref_code IS NOT NULL AND input_ref_code <> '' THEN
    SELECT id INTO referrer_id FROM public.profiles WHERE referral_code = input_ref_code LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, email, referral_code, referred_by)
  VALUES (
    new.id, 
    new.email,
    encode(gen_random_bytes(6), 'hex'), -- Generate unique random referral code
    referrer_id
  );
  RETURN new;
END;
$$;

-- 3. Secure Watch Ad Function (Handles Reward + Commission)
CREATE OR REPLACE FUNCTION public.watch_ad()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_profile public.profiles%ROWTYPE;
  reward decimal;
  referrer_reward decimal;
  result json;
BEGIN
  -- Get current user profile
  SELECT * INTO user_profile FROM public.profiles WHERE id = auth.uid();
  
  IF user_profile IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF user_profile.ads_watched_today >= 5000 THEN
    RAISE EXCEPTION 'Daily ad limit reached';
  END IF;

  -- Calculate reward based on VIP level
  IF user_profile.vip_level = 3 THEN reward := 0.001;
  ELSIF user_profile.vip_level = 2 THEN reward := 0.0008;
  ELSIF user_profile.vip_level = 1 THEN reward := 0.0005;
  ELSE reward := 0.00025;
  END IF;

  -- Update user stats
  UPDATE public.profiles
  SET 
    balance = balance + reward,
    ads_watched = ads_watched + 1,
    ads_watched_today = ads_watched_today + 1,
    last_ad_watched_at = now()
  WHERE id = auth.uid();

  -- Handle Referral Commission (10%) if referrer exists
  IF user_profile.referred_by IS NOT NULL THEN
    referrer_reward := reward * 0.10;
    
    UPDATE public.profiles
    SET 
      balance = balance + referrer_reward,
      referral_earnings = referral_earnings + referrer_reward
    WHERE id = user_profile.referred_by;
  END IF;

  -- Return updated profile
  SELECT row_to_json(p) INTO result FROM public.profiles p WHERE id = auth.uid();
  RETURN result;
END;
$$;
