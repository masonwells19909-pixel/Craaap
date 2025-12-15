/*
  # Secure Functions (Security Advisory Fix)
  
  ## Query Description:
  This migration sets the `search_path` for all critical RPC functions to `public`.
  This prevents potential security vulnerabilities where a malicious user could 
  create objects in other schemas that might be executed by these functions.
  
  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Low" (No data changes, only function config)
  - Requires-Backup: false
  - Reversible: true
*/

-- Secure watch_ad
ALTER FUNCTION watch_ad() SET search_path = public;

-- Secure referral functions
ALTER FUNCTION get_my_referrals() SET search_path = public;

-- Secure mining functions
ALTER FUNCTION spin_mining_wheel() SET search_path = public;
ALTER FUNCTION deposit_for_mining(numeric) SET search_path = public;
ALTER FUNCTION withdraw_mining_deposit() SET search_path = public;

-- Secure withdrawal function
ALTER FUNCTION request_withdrawal(numeric, text, text) SET search_path = public;

-- Secure self-heal
ALTER FUNCTION self_heal_profile() SET search_path = public;
