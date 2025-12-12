import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  balance: number;
  ads_watched: number;
  ads_watched_today: number;
  last_ad_reset_date?: string; // Added field for robust daily reset tracking
  vip_level: number;
  mining_unlocked: boolean;
  mining_deposit: number;
  last_mining_spin: string | null;
  deposit_date: string | null;
  referral_code: string;
  referral_earnings: number;
  referred_by: string | null;
  created_at: string;
};

export type ReferralUser = {
  masked_email: string;
  joined_at: string;
  friends_invited: number;
};
