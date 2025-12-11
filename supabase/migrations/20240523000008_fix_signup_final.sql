-- Migration: Fix Signup Trigger Permissions and Logic
-- Description: Replaces handle_new_user with a SECURITY DEFINER version to bypass RLS during cleanup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER -- CRITICAL: Allows the function to modify profiles even if the user isn't logged in yet
SET search_path = public -- CRITICAL: Fixes security advisory and ensures correct table resolution
AS $$
DECLARE
  t_id text;
  ref_code_input text;
  referrer_id_val uuid;
  new_ref_code text;
BEGIN
  -- 1. Extract Metadata safely
  -- We treat telegram_id as text initially to avoid JSON casting issues
  t_id := new.raw_user_meta_data->>'telegram_id';
  ref_code_input := new.raw_user_meta_data->>'referral_code';

  -- 2. Handle Telegram ID Collision (Zombie Profiles)
  IF t_id IS NOT NULL THEN
    -- Delete any existing profile with this telegram_id (cleanup orphan)
    -- Casting telegram_id to text ensures comparison works whether the column is BigInt or Text
    DELETE FROM public.profiles WHERE telegram_id::text = t_id;
  END IF;

  -- 3. Resolve Referrer (Safe Lookup)
  -- Only look up if code is provided and not empty
  IF ref_code_input IS NOT NULL AND ref_code_input != '' THEN
    BEGIN
        SELECT id INTO referrer_id_val 
        FROM public.profiles 
        WHERE referral_code = ref_code_input 
        LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
        -- If lookup fails (e.g. invalid syntax), just ignore referral
        referrer_id_val := NULL;
    END;
  END IF;

  -- 4. Generate Unique Referral Code for New User
  LOOP
    new_ref_code := lower(substring(md5(random()::text) from 1 for 6));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_ref_code);
  END LOOP;

  -- 5. Insert New Profile
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
    referral_earnings,
    created_at
  )
  VALUES (
    new.id,
    new.email,
    t_id, -- Postgres will auto-cast this text to BigInt if the column is BigInt
    new_ref_code,
    referrer_id_val,
    0, -- Initial Balance
    0, -- Initial Ads Watched
    0, -- Initial Ads Today
    0, -- Initial VIP Level
    false, -- Mining Locked
    0, -- Mining Deposit
    0, -- Referral Earnings
    now()
  );

  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error to Postgres logs for debugging but try not to crash the auth flow if possible
    -- However, for data integrity, we usually must raise the error.
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE; -- Re-throw error to notify Supabase Auth
END;
$$;

-- Ensure the trigger is correctly bound (Re-applying to be safe)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
