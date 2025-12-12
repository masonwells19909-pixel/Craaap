import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase, ReferralUser } from '../lib/supabase';
import { Users, Copy, UserPlus, Calendar, AlertCircle } from 'lucide-react';

export const ReferralPage = () => {
  const { profile, t } = useApp();
  const [referrals, setReferrals] = useState<ReferralUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      fetchReferrals();
    }
  }, [profile]);

  const fetchReferrals = async () => {
    try {
      setError(null);
      const { data, error } = await supabase.rpc('get_my_referrals');
      if (error) throw error;
      setReferrals(data || []);
    } catch (err) {
      console.error('Error fetching referrals:', err);
      // Don't block the UI, just show empty list or error state
      setError('Failed to load friends list');
    } finally {
      setLoading(false);
    }
  };

  if (!profile) return null;

  const copyCode = () => {
    if (profile.referral_code) {
        navigator.clipboard.writeText(profile.referral_code);
        // Optional: Add toast feedback here
    }
  };

  // Safe access to profile properties to prevent crashes
  const earnings = profile.referral_earnings || 0;
  const referralCode = profile.referral_code || '---';

  return (
    <div className="space-y-6 pb-20">
      {/* Hero Card */}
      <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-black rounded-2xl p-6 text-center border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.2)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <Users size={48} className="mx-auto text-blue-300 mb-4 relative z-10" />
        <h2 className="text-xl font-bold text-white mb-2 relative z-10">{t('invite_friends')}</h2>
        <p className="text-sm text-blue-200 mb-6 relative z-10">
          Earn 10% from your friends' ad earnings forever!
        </p>

        <div className="bg-black/40 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between border border-white/10 relative z-10 group cursor-pointer" onClick={copyCode}>
          <div className="text-left">
            <p className="text-[10px] text-gray-400 uppercase">{t('your_code')}</p>
            <p className="text-xl font-mono font-bold text-white tracking-widest group-hover:text-blue-400 transition-colors">
                {referralCode}
            </p>
          </div>
          <button className="p-2 bg-white/5 rounded-lg group-hover:bg-blue-500/20 transition-colors">
            <Copy size={20} className="text-blue-400" />
          </button>
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
        <h3 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
          <UserPlus size={16} /> Your Team
        </h3>
        
        {loading ? (
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
            <p className="text-xs mt-1">Share your code to start earning!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((ref, idx) => {
                // Safe handling for potentially missing data
                const email = ref.masked_email || 'Unknown';
                const initial = email.substring(0, 2).toUpperCase();
                const dateStr = ref.joined_at ? new Date(ref.joined_at).toLocaleDateString() : '---';
                
                return (
                  <div key={idx} className="bg-white/5 p-4 rounded-xl border border-white/5 flex justify-between items-center">
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
