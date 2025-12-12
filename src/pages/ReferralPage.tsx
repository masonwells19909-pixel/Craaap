import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, ReferralUser } from '../lib/supabase';
import { Users, Copy, UserPlus, Calendar, AlertCircle, Share2, Link as LinkIcon, Check, RefreshCw } from 'lucide-react';
import { useTelegram } from '../hooks/useTelegram';

export const ReferralPage = () => {
  const { profile, t } = useApp();
  const { tg, haptic } = useTelegram();
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get Bot Username from env
  const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME || 'Crypto';

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

  if (!profile) return null;

  const referralCode = profile.referral_code || '---';
  
  // Construct the Mini App Invite Link
  // Format: https://t.me/BOT_USERNAME/app?startapp=REFERRAL_CODE
  const inviteLink = `https://t.me/${BOT_USERNAME}/app?startapp=${referralCode}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    haptic.selection();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareLink = () => {
    haptic.impact('medium');
    const text = `Join me on Crypto Miner and earn rewards! Use my link to start:`;
    // Using Telegram Share URL
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent(text)}`;
    
    if (tg?.openTelegramLink) {
        tg.openTelegramLink(shareUrl);
    } else {
        window.open(shareUrl, '_blank');
    }
  };

  // Safe access to profile properties
  const earnings = profile.referral_earnings || 0;

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-black rounded-2xl p-6 text-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <Users size={48} className="mx-auto text-blue-300 mb-4 relative z-10" />
        <h2 className="text-xl font-bold text-white mb-2 relative z-10">{t('invite_friends')}</h2>
        <p className="text-sm text-blue-200 mb-6 relative z-10 max-w-[80%] mx-auto">
          {t('invite_friends')}
        </p>

        {/* Link Display & Actions */}
        <div className="space-y-3 relative z-10">
            {/* Link Box */}
            <div className="bg-black/40 backdrop-blur-sm rounded-xl p-3 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-blue-500/20 p-2 rounded-lg shrink-0">
                        <LinkIcon size={18} className="text-blue-400" />
                    </div>
                    <div className="text-left overflow-hidden w-full">
                        <p className="text-[10px] text-gray-400 uppercase truncate">{t('your_code')}</p>
                        <p className="text-sm font-mono text-white truncate w-full opacity-90 select-all">
                            {inviteLink}
                        </p>
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
                <button 
                    onClick={handleCopyLink}
                    className="flex-1 bg-white/10 hover:bg-white/20 border border-white/10 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-gray-300" />}
                    <span className={copied ? "text-green-400 font-bold" : "text-gray-200"}>
                        {copied ? t('link_copied') : t('copy_link')}
                    </span>
                </button>

                <button 
                    onClick={handleShareLink}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 border border-blue-400/30 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                >
                    <Share2 size={18} className="text-white" />
                    <span className="text-white font-bold">{t('share_link')}</span>
                </button>
            </div>
        </div>
      </div>

      {/* Stats Grid */}
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

      {/* Friends List */}
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
            <p className="text-xs mt-1">Share your link to start earning!</p>
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
