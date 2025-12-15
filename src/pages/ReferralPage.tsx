import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, ReferralUser } from '../lib/supabase';
import { Users, UserPlus, Calendar, AlertCircle, Check, RefreshCw, Hash, ArrowRight } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';
import { ReferralLinkCard } from '../components/ReferralLinkCard';

export const ReferralPage = () => {
  const { profile, t, refreshProfile } = useApp();
  const { haptic } = useTelegram();
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Manual Entry States
  const [inputCode, setInputCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (profile) {
      fetchReferrals();
    }
  }, [profile]);

  const fetchReferrals = async () => {
    setLoading(true);
    try {
      setError(null);
      const { data, error } = await supabase.rpc('get_my_referrals');
      if (error) throw error;
      setReferrals(data || []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      setError('Failed to load friends list');
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemCode = async () => {
    if (!inputCode.trim()) return;
    setRedeemLoading(true);
    setRedeemMsg(null);
    haptic.impact('light');

    try {
        const { data, error } = await supabase.rpc('redeem_invite', { code_input: inputCode.trim() });
        
        if (error) throw error;

        if (data && data.success) {
            setRedeemMsg({ type: 'success', text: t('code_redeemed') });
            haptic.notification('success');
            setInputCode('');
            refreshProfile();
        } else {
            let msg = t('error');
            if (data?.message === 'already_referred') msg = t('already_referred');
            if (data?.message === 'invalid_code') msg = t('invalid_code');
            if (data?.message === 'self_referral') msg = t('self_referral');
            setRedeemMsg({ type: 'error', text: msg });
            haptic.notification('error');
        }
    } catch (err) {
        console.error("Redeem error:", err);
        setRedeemMsg({ type: 'error', text: t('error') });
        haptic.notification('error');
    } finally {
        setRedeemLoading(false);
    }
  };

  if (!profile) return null;

  const referralCode = profile.referral_code || profile.id; // Fallback to ID if code is missing
  const earnings = profile.referral_earnings || 0;
  const isReferred = !!profile.referred_by;

  return (
    <div className="space-y-6 pb-20 px-5 pt-4">
      
      {/* 1. New Referral Link Component */}
      <div className="animate-fade-in">
        <ReferralLinkCard referralCode={referralCode} />
      </div>

      {/* 2. Manual Code Entry (Only if not referred) */}
      {!isReferred && (
          <div className="bg-[#1f2937] border border-yellow-500/20 rounded-2xl p-5 relative overflow-hidden shadow-lg animate-fade-in">
             <div className="flex items-start gap-4 relative z-10">
                <div className="bg-yellow-500/10 p-3 rounded-xl shrink-0">
                    <Hash size={24} className="text-yellow-500" />
                </div>
                <div className="flex-1 w-full">
                    <h3 className="text-white font-bold text-sm mb-1">{t('enter_code')}</h3>
                    <p className="text-gray-400 text-xs mb-3 leading-relaxed">{t('enter_code_desc')}</p>
                    
                    <div className="flex gap-2 w-full">
                        <input 
                            type="text" 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={inputCode}
                            onChange={(e) => setInputCode(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                            placeholder={t('code_placeholder')}
                            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-yellow-500 transition-colors font-mono tracking-widest text-center placeholder:font-sans placeholder:tracking-normal"
                        />
                        <button 
                            onClick={handleRedeemCode}
                            disabled={redeemLoading || inputCode.length < 3}
                            className="bg-yellow-600 hover:bg-yellow-500 disabled:opacity-50 disabled:grayscale text-black font-bold px-4 rounded-xl text-xs flex items-center justify-center gap-1 transition-all active:scale-95 min-w-[60px]"
                        >
                            {redeemLoading ? <RefreshCw size={18} className="animate-spin" /> : <ArrowRight size={20} />}
                        </button>
                    </div>
                    
                    {redeemMsg && (
                        <div className={`mt-3 p-2 rounded-lg text-xs font-medium text-center flex items-center justify-center gap-2 ${redeemMsg.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {redeemMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                            {redeemMsg.text}
                        </div>
                    )}
                </div>
             </div>
          </div>
      )}

      {/* 3. Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">{t('friends_invited')}</p>
          <p className="text-2xl font-bold text-white mt-1">{referrals.length}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-gray-400 text-xs">{t('total_earnings')}</p>
          <p className="text-2xl font-bold text-green-400 mt-1">${earnings.toFixed(4)}</p>
        </div>
      </div>

      {/* 4. Friends List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <UserPlus size={16} /> Your Team
            </h3>
            <button 
                onClick={fetchReferrals} 
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                disabled={loading}
            >
                <RefreshCw size={14} className={loading ? "animate-spin text-blue-400" : "text-gray-400"} />
            </button>
        </div>
        
        {loading && referrals.length === 0 ? (
          <div className="text-center py-8 text-gray-500 animate-pulse">Loading...</div>
        ) : error ? (
            <div className="text-center py-8 text-red-400 bg-red-500/5 rounded-xl border border-red-500/10 flex flex-col items-center gap-2">
                <AlertCircle size={20} />
                <p className="text-xs">{error}</p>
            </div>
        ) : referrals.length === 0 ? (
          <div className="text-center py-12 text-gray-600 bg-white/5 rounded-xl border border-white/5 border-dashed">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p>No friends invited yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref, idx) => {
                const email = ref.masked_email || 'Unknown';
                const initial = email.substring(0, 2).toUpperCase();
                const dateStr = ref.joined_at ? new Date(ref.joined_at).toLocaleDateString() : '---';
                
                return (
                  <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center animate-[fadeIn_0.5s_ease-in-out]">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-gray-300">
                        {initial}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{email}</p>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400">
                          <Calendar size={10} />
                          {dateStr}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Invited</p>
                      <p className="text-sm font-bold text-blue-400">{ref.friends_invited || 0}</p>
                    </div>
                  </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
