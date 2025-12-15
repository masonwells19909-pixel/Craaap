/* 
# Fix Referral Columns Mismatch
This migration ensures the 'referred_by' column exists and migrates data if 'referrer_id' was used previously.
It fixes the "column does not exist" error in the friends list.
*/

-- 1. Add referred_by column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referred_by') THEN
        ALTER TABLE profiles ADD COLUMN referred_by UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 2. Migrate data from referrer_id if it exists (fixing the mismatch hint)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'referrer_id') THEN
        -- Copy data to referred_by where it is null to preserve old referrals
        UPDATE profiles 
        SET referred_by = referrer_id 
        WHERE referred_by IS NULL;
    END IF;
END $$;

-- 3. Re-create the function to be 100% sure it matches the schema
CREATE OR REPLACE FUNCTION get_my_referrals()
RETURNS TABLE (
  masked_email TEXT,
  joined_at TIMESTAMPTZ,
  friends_invited BIGINT
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN p.email IS NOT NULL AND length(p.email) > 4 THEN 
        substring(p.email from 1 for 2) || '***' || substring(p.email from position('@' in p.email))
      ELSE 'User ' || substring(p.id::text from 1 for 4)
    END as masked_email,
    p.created_at as joined_at,
    (SELECT count(*) FROM profiles sub WHERE sub.referred_by = p.id)::BIGINT as friends_invited
  FROM profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions again just in case
GRANT EXECUTE ON FUNCTION get_my_referrals() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_referrals() TO service_role;
