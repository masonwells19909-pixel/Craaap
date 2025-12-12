/*
  # Add Mining and Withdrawal Functions
  
  Creates necessary functions for the mining and withdrawal features that were missing.
  Includes security settings (search_path) to prevent warnings.

  1. New Functions:
    - deposit_for_mining: Moves balance to mining deposit
    - withdraw_mining_deposit: Moves deposit back to balance (after 24h)
    - spin_mining_wheel: Daily spin for rewards based on deposit
    - request_withdrawal: Creates a withdrawal request
  
  2. New Tables:
    - withdrawals (if not exists)
*/

-- Create withdrawals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    amount NUMERIC NOT NULL,
    wallet_address TEXT NOT NULL,
    network TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, paid, rejected
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on withdrawals
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own withdrawals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'withdrawals' AND policyname = 'Users can view own withdrawals'
    ) THEN
        CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
            FOR SELECT USING (auth.uid() = user_id);
    END IF;
END $$;

-- Function: Deposit for Mining
CREATE OR REPLACE FUNCTION public.deposit_for_mining(amount_input numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_balance numeric;
BEGIN
    -- Check balance
    SELECT balance INTO user_balance FROM public.profiles WHERE id = auth.uid();
    
    IF user_balance IS NULL OR user_balance < amount_input THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    IF amount_input < 1 OR amount_input > 10 THEN
        RAISE EXCEPTION 'Deposit must be between 1 and 10';
    END IF;

    -- Update profile
    UPDATE public.profiles
    SET 
        balance = balance - amount_input,
        mining_deposit = COALESCE(mining_deposit, 0) + amount_input,
        deposit_date = now()
    WHERE id = auth.uid();
END;
$$;

-- Function: Withdraw Mining Deposit
CREATE OR REPLACE FUNCTION public.withdraw_mining_deposit()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_deposit numeric;
    dep_date timestamptz;
BEGIN
    SELECT mining_deposit, deposit_date INTO current_deposit, dep_date 
    FROM public.profiles WHERE id = auth.uid();

    IF current_deposit IS NULL OR current_deposit <= 0 THEN
        RAISE EXCEPTION 'No deposit to withdraw';
    END IF;

    -- Check 24h lock
    IF dep_date IS NOT NULL AND dep_date > (now() - interval '24 hours') THEN
        RAISE EXCEPTION 'Deposit is locked for 24 hours';
    END IF;

    -- Refund
    UPDATE public.profiles
    SET 
        balance = balance + current_deposit,
        mining_deposit = 0,
        deposit_date = null
    WHERE id = auth.uid();
END;
$$;

-- Function: Spin Mining Wheel
CREATE OR REPLACE FUNCTION public.spin_mining_wheel()
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_deposit numeric;
    last_spin timestamptz;
    reward numeric;
BEGIN
    SELECT mining_deposit, last_mining_spin INTO current_deposit, last_spin 
    FROM public.profiles WHERE id = auth.uid();

    IF current_deposit IS NULL OR current_deposit < 1 THEN
        RAISE EXCEPTION 'Deposit required to spin';
    END IF;

    -- Check cooldown (allow if null or > 24h)
    IF last_spin IS NOT NULL AND last_spin > (now() - interval '24 hours') THEN
        RAISE EXCEPTION 'Spin available once every 24 hours';
    END IF;

    -- Calculate Reward: Random between 1% and 5% of deposit
    -- e.g. $10 deposit -> $0.10 to $0.50
    reward := (random() * 0.04 + 0.01) * current_deposit;
    
    -- Update profile
    UPDATE public.profiles
    SET 
        balance = balance + reward,
        last_mining_spin = now()
    WHERE id = auth.uid();

    RETURN reward;
END;
$$;

-- Function: Request Withdrawal
CREATE OR REPLACE FUNCTION public.request_withdrawal(amount_input numeric, wallet_addr text, network_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_balance numeric;
BEGIN
    SELECT balance INTO user_balance FROM public.profiles WHERE id = auth.uid();

    IF user_balance IS NULL OR user_balance < amount_input THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    IF amount_input < 1 THEN
        RAISE EXCEPTION 'Minimum withdrawal is 1';
    END IF;

    -- Deduct balance
    UPDATE public.profiles
    SET balance = balance - amount_input
    WHERE id = auth.uid();

    -- Create record
    INSERT INTO public.withdrawals (user_id, amount, wallet_address, network)
    VALUES (auth.uid(), amount_input, wallet_addr, network_type);
END;
$$;
