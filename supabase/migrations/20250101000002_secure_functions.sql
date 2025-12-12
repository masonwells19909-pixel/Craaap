/*
  # Secure Database Functions
  Fixes security warnings by setting explicit search_path for all public functions.

  ## Metadata:
  - Schema-Category: "Security"
  - Impact-Level: "Low" (No logic change, just security hardening)
  - Requires-Backup: false
  - Reversible: true
*/

-- Secure watch_ad
ALTER FUNCTION public.watch_ad() SET search_path = public;

-- Secure get_my_referrals
ALTER FUNCTION public.get_my_referrals() SET search_path = public;

-- Secure mining functions
ALTER FUNCTION public.deposit_for_mining(numeric) SET search_path = public;
ALTER FUNCTION public.withdraw_mining_deposit() SET search_path = public;
ALTER FUNCTION public.spin_mining_wheel() SET search_path = public;

-- Secure withdrawal function
ALTER FUNCTION public.request_withdrawal(numeric, text, text) SET search_path = public;

-- Secure utility functions
ALTER FUNCTION public.self_heal_profile() SET search_path = public;
