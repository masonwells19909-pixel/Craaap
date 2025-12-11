import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { Play, AlertCircle } from 'lucide-react';

export const AdsPage = () => {
  const { profile, t, refreshProfile } = useApp();
  const { haptic } = useTelegram();
  const [watching, setWatching] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!profile) return null;

  const getRewardPerAd = () => {
    if (profile.vip_level === 3) return 0.001;
    if (profile.vip_level === 2) return 0.0008;
    if (profile.vip_level === 1) return 0.0005;
    return 0.00025;
  };

  const handleWatchAd = async () => {
    if (profile.ads_watched_today >= 5000) return;
    
    haptic.impact('light');
    setWatching(true);
    setProgress(0);

    // Simulate watching ad (5 seconds)
    const duration = 5000;
    const interval = 50;
    const steps = duration / interval;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      setProgress((currentStep / steps) * 100);
      
      if (currentStep >= steps) {
        clearInterval(timer);
        completeAd();
      }
    }, interval);
  };

  const completeAd = async () => {
    try {
      const { error } = await supabase.rpc('watch_ad');

      if (error) throw error;
      
      haptic.notification('success');
      await refreshProfile();
    } catch (err) {
      console.error('Error updating ad stats:', err);
      haptic.notification('error');
    } finally {
      setWatching(false);
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
            <h2 className="text-3xl font-bold text-white mt-1">${profile.balance.toFixed(5)}</h2>
          </div>
          <div className="bg-cyan-500/20 px-3 py-1 rounded-full border border-cyan-500/30">
            <span className="text-cyan-400 text-xs font-bold">VIP {profile.vip_level}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 relative z-10">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-400 text-[10px]">{t('ads_today')}</p>
            <p className="text-white font-mono text-lg">{profile.ads_watched_today} <span className="text-gray-500 text-xs">/ 5000</span></p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-gray-400 text-[10px]">{t('ad_reward')}</p>
            <p className="text-green-400 font-mono text-lg">${getRewardPerAd()}</p>
          </div>
        </div>
      </div>

      {/* Ad Action Area */}
      <div className="flex flex-col items-center justify-center py-10">
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
          
          {watching && (
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="96"
                cy="96"
                r="90"
                stroke="currentColor"
                strokeWidth="4"
                fill="transparent"
                className="text-cyan-500 transition-all duration-100 ease-linear"
                strokeDasharray={565.48}
                strokeDashoffset={565.48 - (565.48 * progress) / 100}
              />
            </svg>
          )}

          <button
            onClick={handleWatchAd}
            disabled={watching || profile.ads_watched_today >= 5000}
            className="w-40 h-40 rounded-full bg-gradient-to-b from-cyan-600 to-blue-700 shadow-[0_0_40px_rgba(6,182,212,0.4)] flex flex-col items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none group"
          >
            {watching ? (
              <span className="text-2xl font-bold animate-pulse">{Math.round(progress)}%</span>
            ) : (
              <>
                <Play size={40} className="fill-white mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-bold">{t('watch_ad')}</span>
              </>
            )}
          </button>
        </div>

        {profile.ads_watched_today >= 5000 && (
          <div className="mt-6 flex items-center gap-2 text-red-400 bg-red-500/10 px-4 py-2 rounded-lg">
            <AlertCircle size={16} />
            <span className="text-sm">{t('daily_limit')}</span>
          </div>
        )}
      </div>
    </div>
  );
};
