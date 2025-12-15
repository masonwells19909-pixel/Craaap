/*
  # Security Fix: Set Search Path for RPC Functions
  
  ## Description
  This migration addresses the "Function Search Path Mutable" security advisory.
  It explicitly sets the `search_path` to `public` for all SECURITY DEFINER functions.
  This prevents malicious users from hijacking function execution by manipulating the search path.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Low" (No data change, only configuration)
  - Requires-Backup: false
  - Reversible: true
*/

-- Secure watch_ad function
ALTER FUNCTION public.watch_ad() SET search_path = public;

-- Secure mining functions
ALTER FUNCTION public.spin_mining_wheel() SET search_path = public;
ALTER FUNCTION public.deposit_for_mining(numeric) SET search_path = public;
ALTER FUNCTION public.withdraw_mining_deposit() SET search_path = public;

-- Secure withdrawal function
ALTER FUNCTION public.request_withdrawal(numeric, text, text) SET search_path = public;

-- Secure referral function
ALTER FUNCTION public.get_my_referrals() SET search_path = public;

-- Secure utility functions
ALTER FUNCTION public.self_heal_profile() SET search_path = public;

-- Note: Trigger functions usually inherit context, but good practice to secure if they call other funcs
-- Assuming handle_new_user is the trigger function
ALTER FUNCTION public.handle_new_user() SET search_path = public;
