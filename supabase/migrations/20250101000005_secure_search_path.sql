/*
  # Security Fix: Set Search Path for Functions
  
  ## Description
  This migration secures all custom functions by explicitly setting their search_path to 'public'.
  This prevents potential search path hijacking vulnerabilities (CVE-2018-1058).
  
  ## Affected Functions:
  - watch_ad
  - get_my_referrals
  - deposit_for_mining
  - spin_mining_wheel
  - withdraw_mining_deposit
  - request_withdrawal
  - self_heal_profile
  - handle_new_user
  
  ## Impact
  - Security: High (Fixes security warnings)
  - Data: None (No data modification)
*/

-- Secure watch_ad
ALTER FUNCTION public.watch_ad() SET search_path = public;

-- Secure get_my_referrals
ALTER FUNCTION public.get_my_referrals() SET search_path = public;

-- Secure mining functions
ALTER FUNCTION public.deposit_for_mining(numeric) SET search_path = public;
ALTER FUNCTION public.spin_mining_wheel() SET search_path = public;
ALTER FUNCTION public.withdraw_mining_deposit() SET search_path = public;

-- Secure withdrawal function
ALTER FUNCTION public.request_withdrawal(numeric, text, text) SET search_path = public;

-- Secure utility functions
ALTER FUNCTION public.self_heal_profile() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
