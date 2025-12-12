/*
  # Add get_my_referrals function
  
  ## Query Description:
  Adds a missing RPC function required by the ReferralPage to fetch the list of invited users.
  It returns masked emails and referral counts for each invitee.
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Low"
  - Requires-Backup: false
  - Reversible: true
  
  ## Security Implications:
  - SECURITY DEFINER: Yes, to access profiles of other users (the invitees).
  - RLS: Function filters by `referred_by = auth.uid()`, ensuring users only see their own referrals.
*/

CREATE OR REPLACE FUNCTION public.get_my_referrals()
RETURNS TABLE (
  masked_email text,
  joined_at timestamptz,
  friends_invited integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Mask email logic: first 2 chars + *** + domain part
    CASE 
      WHEN p.email IS NULL OR position('@' in p.email) = 0 THEN 'User ' || substring(p.id::text from 1 for 4)
      ELSE 
        substring(p.email from 1 for 2) || '***' || substring(p.email from position('@' in p.email))
    END as masked_email,
    p.created_at as joined_at,
    (SELECT count(*)::integer FROM public.profiles sub WHERE sub.referred_by = p.id) as friends_invited
  FROM public.profiles p
  WHERE p.referred_by = auth.uid()
  ORDER BY p.created_at DESC;
END;
$$;
