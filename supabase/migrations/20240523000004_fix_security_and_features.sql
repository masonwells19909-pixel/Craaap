-- Fix Security Advisories: Set search_path for existing functions
ALTER FUNCTION handle_new_user SET search_path = public;
ALTER FUNCTION watch_ad SET search_path = public;

-- Add deposit_date to profiles if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deposit_date') THEN
        ALTER TABLE public.profiles ADD COLUMN deposit_date TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Function to get referrals list securely
CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS TABLE (
  masked_email text,
  joined_at timestamptz,
  friends_invited bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SUBSTRING(p.email FROM 1 FOR 3) || '***' || SUBSTRING(p.email FROM POSITION('@' IN p.email))) as masked_email,
    p.created_at as joined_at,
    (SELECT COUNT(*) FROM profiles sub WHERE sub.referred_by = p.referral_code) as friends_invited
  FROM profiles p
  WHERE p.referred_by = (SELECT referral_code FROM profiles WHERE id = auth.uid())
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to withdraw mining deposit
CREATE OR REPLACE FUNCTION withdraw_mining_deposit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile profiles%ROWTYPE;
BEGIN
  -- Get user profile
  SELECT * INTO user_profile FROM profiles WHERE id = auth.uid();
  
  -- Checks
  IF user_profile.mining_deposit <= 0 THEN
    RAISE EXCEPTION 'No deposit to withdraw';
  END IF;
  
  -- Check 24h lock (using deposit_date or last_mining_spin as fallback)
  IF user_profile.deposit_date IS NOT NULL AND (EXTRACT(EPOCH FROM (NOW() - user_profile.deposit_date)) < 86400) THEN
     RAISE EXCEPTION 'Deposit is locked for 24 hours';
  END IF;

  -- Execute Withdrawal
  UPDATE profiles 
  SET 
    balance = balance + mining_deposit,
    mining_deposit = 0,
    mining_unlocked = false,
    deposit_date = NULL
  WHERE id = auth.uid();
END;
$$;
