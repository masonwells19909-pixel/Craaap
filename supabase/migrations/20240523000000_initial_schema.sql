/*
  # Initial Schema for Crypto Mining App
  Creates profiles and withdrawals tables.

  ## Query Description:
  This migration sets up the core user data structure including balances, ad counters, VIP levels, and withdrawal history.
  
  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - public.profiles: Stores user stats (balance, ads, vip, mining).
  - public.withdrawals: Stores withdrawal requests.
  - Triggers: Auto-create profile on signup.
  
  ## Security Implications:
  - RLS Enabled on all tables.
  - Policies allow users to read/update their own data.
*/

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  balance decimal default 0,
  ads_watched int default 0,
  ads_watched_today int default 0,
  last_ad_watched_at timestamptz,
  last_daily_reset timestamptz default now(),
  vip_level int default 0,
  mining_unlocked boolean default false,
  mining_deposit decimal default 0,
  last_mining_spin timestamptz,
  referral_code text unique,
  referrer_id uuid references public.profiles(id),
  referral_earnings decimal default 0,
  created_at timestamptz default now()
);

-- Create withdrawals table
create table if not exists public.withdrawals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  amount decimal not null,
  wallet_address text not null,
  network text not null,
  status text default 'pending', -- pending, completed, rejected
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.withdrawals enable row level security;

-- Policies for profiles
create policy "Users can view own profile"
  on public.profiles for select
  using ( auth.uid() = id );

create policy "Users can update own profile"
  on public.profiles for update
  using ( auth.uid() = id );

-- Policies for withdrawals
create policy "Users can view own withdrawals"
  on public.withdrawals for select
  using ( auth.uid() = user_id );

create policy "Users can insert withdrawals"
  on public.withdrawals for insert
  with check ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, referral_code)
  values (
    new.id,
    new.email,
    substring(md5(random()::text) from 1 for 8) -- Generate random 8-char code
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
