-- Migration: Fix Signup Trigger to handle existing Telegram IDs (Orphan Profiles)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  tg_id bigint;
  referral_code_val text;
  referrer_id_val uuid;
BEGIN
  -- Extract Telegram ID from metadata
  -- We use COALESCE to handle cases where it might be missing (though it shouldn't be for Telegram auth)
  tg_id := (new.raw_user_meta_data->>'telegram_id')::bigint;

  -- 1. Handle Orphan Profiles (Data Cleanup)
  -- If a profile exists with this telegram_id but different UUID (orphan), delete it to allow new signup
  IF tg_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE telegram_id = tg_id) THEN
    DELETE FROM public.profiles WHERE telegram_id = tg_id;
  END IF;

  -- 2. Generate Referral Code (Simple Random String)
  referral_code_val := lower(substr(md5(random()::text), 0, 7));
  
  -- Ensure uniqueness of referral code
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = referral_code_val) LOOP
    referral_code_val := lower(substr(md5(random()::text), 0, 7));
  END LOOP;

  -- 3. Process Referral (If user was invited)
  referrer_id_val := NULL;
  IF new.raw_user_meta_data->>'referral_code' IS NOT NULL THEN
    SELECT id INTO referrer_id_val 
    FROM public.profiles 
    WHERE referral_code = (new.raw_user_meta_data->>'referral_code')::text
    LIMIT 1;
  END IF;

  -- 4. Insert New Profile
  INSERT INTO public.profiles (
    id,
    email,
    telegram_id,
    referral_code,
    referred_by,
    balance,
    ads_watched,
    ads_watched_today,
    vip_level,
    mining_unlocked,
    mining_deposit,
    referral_earnings
  )
  VALUES (
    new.id,
    new.email,
    tg_id,
    referral_code_val,
    referrer_id_val,
    0.00000, -- Initial Balance
    0,
    0,
    0, -- VIP 0
    false,
    0,
    0
  );

  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Log the error details for debugging
  RAISE LOG 'Error in handle_new_user: %', SQLERRM;
  -- Raise a generic error to the client (or specific if needed)
  RAISE EXCEPTION 'Database error during signup: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure the trigger is correctly set
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
