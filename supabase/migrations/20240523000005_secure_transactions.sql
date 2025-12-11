/*
  # Secure Financial Transactions
  
  ## Query Description:
  This migration moves critical financial logic (Mining Deposit, Mining Spin, Withdrawal) 
  from the frontend to the database to prevent manipulation and cheating.
  
  ## Metadata:
  - Schema-Category: "Safe"
  - Impact-Level: "Medium"
  - Requires-Backup: false
  - Reversible: true
  
  ## Security Implications:
  - All functions use SECURITY DEFINER to run with elevated privileges but control access strictly.
  - search_path is set to public to prevent search path hijacking.
*/

-- 1. Secure Mining Deposit Function
CREATE OR REPLACE FUNCTION public.deposit_for_mining(amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_balance numeric;
BEGIN
  -- Check if amount is valid (1 to 10)
  IF amount < 1 OR amount > 10 THEN
    RAISE EXCEPTION 'Deposit amount must be between $1 and $10';
  END IF;

  -- Get user balance
  SELECT balance INTO user_balance
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check sufficient funds
  IF user_balance < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Perform the transaction atomically
  UPDATE public.profiles
  SET 
    balance = balance - amount,
    mining_deposit = mining_deposit + amount,
    mining_unlocked = true,
    deposit_date = now()
  WHERE id = auth.uid();
END;
$$;

-- 2. Secure Mining Spin Function
CREATE OR REPLACE FUNCTION public.spin_mining_wheel()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile public.profiles%ROWTYPE;
  profit numeric := 0.10; -- Fixed profit per spin
BEGIN
  -- Get user profile
  SELECT * INTO user_profile
  FROM public.profiles
  WHERE id = auth.uid();

  -- Validation checks
  IF NOT user_profile.mining_unlocked THEN
    RAISE EXCEPTION 'Mining is locked. Watch 10,000 ads to unlock.';
  END IF;

  IF user_profile.mining_deposit < 1 THEN
    RAISE EXCEPTION 'Deposit required to start mining.';
  END IF;

  -- Check 24h Cooldown
  IF user_profile.last_mining_spin IS NOT NULL AND 
     user_profile.last_mining_spin > (now() - interval '24 hours') THEN
    RAISE EXCEPTION 'You can only spin once every 24 hours.';
  END IF;

  -- Apply Reward
  UPDATE public.profiles
  SET 
    balance = balance + profit,
    last_mining_spin = now()
  WHERE id = auth.uid();

  RETURN profit;
END;
$$;

-- 3. Secure Withdrawal Request Function
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  amount numeric, 
  wallet_addr text, 
  network_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_balance numeric;
BEGIN
  -- Validate amount
  IF amount < 1 OR amount > 25 THEN
    RAISE EXCEPTION 'Withdrawal amount must be between $1 and $25';
  END IF;

  -- Get balance
  SELECT balance INTO user_balance
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check funds
  IF user_balance < amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- 1. Create withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, wallet_address, network, status)
  VALUES (auth.uid(), amount, wallet_addr, network_type, 'pending');

  -- 2. Deduct balance (Atomic operation)
  UPDATE public.profiles
  SET balance = balance - amount
  WHERE id = auth.uid();
END;
$$;
