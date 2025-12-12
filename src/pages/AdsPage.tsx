import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { Play, AlertCircle, Loader2, Maximize, RefreshCw } from 'lucide-react';

export const AdsPage = () => {
  const { profile, t, refreshProfile } = useApp();
  const { haptic } = useTelegram();
  const [loadingAd, setLoadingAd] = useState(false);

  if (!profile) return null;

  const getRewardPerAd = () => {
    if (profile.vip_level === 3) return 0.001;
    if (profile.vip_level === 2) return 0.0008;
    if (profile.vip_level === 1) return 0.0005;
    return 0.00025;
  };

  const handleWatchAd = async (type: 'interstitial' | 'popup' = 'interstitial') => {
    if (profile.ads_watched_today >= 5000) return;
    
    haptic.impact('medium');
    setLoadingAd(true);

    try {
        if (typeof window.show_10310779 === 'function') {
            console.log(`Showing ${type} Ad...`);
            
            const adPromise = type === 'popup' 
                ? window.show_10310779('pop') 
                : window.show_10310779();

            await adPromise.then(() => {
                console.log("Ad completed, granting reward...");
                completeAd();
            }).catch((err: any) => {
                console.error("Ad closed/error:", err);
                setLoadingAd(false);
            });
        } else {
            // Fallback for testing if SDK fails or AdBlock
            console.warn("SDK not loaded, simulating ad for testing...");
            setTimeout(() => completeAd(), 2000);
        }
    } catch (e) {
        console.error("Ad Execution Error", e);
        setLoadingAd(false);
    }
  };

  const completeAd = async () => {
    try {
      const { error } = await supabase.rpc('watch_ad');

      if (error) throw error;
      
      haptic.notification('success');
      await refreshProfile();
    } catch (err: unknown) {
      console.error('Error updating ad stats:', err);
      haptic.notification('error');
    } finally {
      setLoadingAd(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <div className="bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div className="flex justify-between items-start mb-4 relative z-10">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider">{t('balance')}</p>
            <h2 className="text-3xl font-bold text-white mt-1" dir="ltr">${profile.balance.toFixed(5)}</h2>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30">
                <span className="text-cyan-400 text-xs font-bold">VIP {profile.vip_level}</span>
            </div>
            <button onClick={() => refreshProfile()} className="text-gray-500 hover:text-white transition-colors">
                <RefreshCw size={14} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">{t('ads_today')}</p>
            {/* FIX: Force LTR direction for numbers to fix "5000 /" issue */}
            <div className="flex items-baseline gap-1" dir="ltr">
                <span className="text-white font-mono text-lg font-bold">{profile.ads_watched_today}</span>
                <span className="text-gray-500 text-xs">/ 5000</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-400 text-xs mb-1">{t('ad_reward')}</p>
            <p className="text-green-400 font-mono text-lg" dir="ltr">${getRewardPerAd()}</p>
          </div>
        </div>
      </div>

      {/* Ad Action Area */}
      <div className="flex flex-col items-center justify-center py-6 gap-6">
        
        {/* Main Interstitial Button */}
        <div className="relative w-48 h-48 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          
          <button
            onClick={() => handleWatchAd('interstitial')}
            disabled={loadingAd || profile.ads_watched_today >= 5000}
            className="w-40 h-40 rounded-full bg-gradient-to-b from-cyan-600 to-blue-700 shadow-[0_0_40px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none group relative overflow-hidden"
          >
            <div className="absolute top-0 -left-[100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform skew-x-12 group-hover:animate-[shine_1.5s_infinite]"></div>

            {loadingAd ? (
              <div className="flex flex-col items-center">
                  <Loader2 size={32} className="text-white animate-spin mb-2" />
                  <span className="text-[10px] text-white/70">{t('watching')}</span>
              </div>
            ) : (
              <>
                <div className="relative">
                    <Play size={40} className="fill-white mb-2 group-hover:scale-110 transition-transform relative z-10" />
                </div>
                <span className="text-sm font-bold">{t('watch_ad')}</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Popup Button */}
        <button
            onClick={() => handleWatchAd('popup')}
            disabled={loadingAd || profile.ads_watched_today >= 5000}
            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all active:scale-95 disabled:opacity-50"
        >
            <Maximize size={18} className="text-purple-400" />
            <span className="text-sm font-medium text-gray-200">{t('watch_popup')}</span>
        </button>

        {profile.ads_watched_today >= 5000 && (
          <div className="mt-2 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{t('daily_limit')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
