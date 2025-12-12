import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { Play, AlertCircle, Loader2, Trophy, TrendingUp, Globe, ChevronDown, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AdsPage = () => {
  const { profile, t, refreshProfile, language, setLanguage } = useApp();
  const { haptic } = useTelegram();
  const [loadingAd, setLoadingAd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [earnedAmount, setEarnedAmount] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ensure fresh data on mount
  useEffect(() => {
    refreshProfile();
  }, []);

  if (!profile) return null;

  const getRewardPerAd = () => {
    if (profile.vip_level === 3) return 0.001;
    if (profile.vip_level === 2) return 0.0008;
    if (profile.vip_level === 1) return 0.0005;
    return 0.00025;
  };

  const currentReward = getRewardPerAd();

  // Calculate progress to next level
  const getNextLevelInfo = () => {
    if (profile.vip_level >= 3) return { target: 50000, nextLvl: 'MAX', progress: 100 };
    
    let target = 15000;
    let nextLvl = 1;
    
    if (profile.vip_level === 1) { target = 30000; nextLvl = 2; }
    if (profile.vip_level === 2) { target = 50000; nextLvl = 3; }
    
    const progress = Math.min((profile.ads_watched / target) * 100, 100);
    return { target, nextLvl, progress };
  };

  const nextLevel = getNextLevelInfo();

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await refreshProfile();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleWatchAd = async () => {
    if (profile.ads_watched_today >= 5000) {
        setErrorMsg(t('daily_limit'));
        return;
    }
    
    haptic.impact('medium');
    setLoadingAd(true);
    setErrorMsg('');

    try {
        // 1. Show Ad (Monetag SDK)
        if (typeof window.show_10310779 === 'function') {
            await window.show_10310779().then(() => {
                processReward();
            }).catch((err: any) => {
                console.error("Ad closed/error:", err);
                setLoadingAd(false);
            });
        } else {
            // Fallback for development/testing
            console.warn("SDK not loaded, simulating ad...");
            setTimeout(() => processReward(), 2000);
        }
    } catch (e) {
        console.error("Ad Execution Error", e);
        setErrorMsg('Failed to load ad provider.');
        setLoadingAd(false);
    }
  };

  const processReward = async () => {
    try {
      // Call Secure RPC
      const { data, error } = await supabase.rpc('watch_ad');

      if (error) throw error;
      
      // Check logic response
      if (data && data.success === false) {
          throw new Error(data.message || 'Failed to process reward');
      }

      haptic.notification('success');
      setEarnedAmount(currentReward);
      setShowSuccessModal(true);
      
      // Sync with Server (The RPC returns new data, but refreshProfile ensures full sync)
      await refreshProfile();

      // Hide modal after delay
      setTimeout(() => setShowSuccessModal(false), 3000);

    } catch (err: unknown) {
      console.error('Error updating ad stats:', err);
      haptic.notification('error');
      const msg = err instanceof Error ? err.message : 'Failed to process reward';
      setErrorMsg(msg);
    } finally {
      setLoadingAd(false);
    }
  };

  return (
    <div className="flex flex-col h-full px-5 pt-4 pb-24 max-w-md mx-auto w-full font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
         <h1 className="text-xl font-bold text-white tracking-tight">Earn cryptocurrency</h1>
         
         <div className="relative group">
            <button className="flex items-center gap-2 bg-[#1f2937] hover:bg-[#374151] transition-colors px-3 py-1.5 rounded-full border border-white/10">
                <Globe size={14} className="text-gray-400" />
                <span className="text-[11px] font-medium text-gray-300 uppercase">{language}</span>
            </button>
            <select 
                value={language} 
                onChange={(e) => setLanguage(e.target.value as any)}
                className="absolute inset-0 opacity-0 cursor-pointer"
            >
                <option value="en">EN</option>
                <option value="ar">AR</option>
                <option value="ru">RU</option>
            </select>
         </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-[#111827] rounded-[32px] p-6 shadow-2xl border border-white/5 relative overflow-hidden mb-8">
        {/* Background Glow */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        {/* Balance Section */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-gray-400 text-[11px] font-medium tracking-wider uppercase mb-1 opacity-80">BALANCE</p>
            <h1 className="text-[40px] leading-none font-bold text-white tracking-tight">
              ${profile.balance.toFixed(5)}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-3">
             <div className="bg-gradient-to-r from-cyan-600 to-cyan-500 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-cyan-900/40">
                <Trophy size={12} className="text-white fill-white" />
                <span className="text-white text-[10px] font-bold tracking-wide">VIP {profile.vip_level}</span>
             </div>
             <button 
                onClick={handleManualRefresh} 
                className={`text-gray-600 hover:text-gray-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
             >
                <RefreshCw size={16} />
             </button>
          </div>
        </div>

        {/* Sub Cards Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {/* Ads Today */}
          <div className="bg-[#1f2937] rounded-2xl p-4 border border-white/5 relative group hover:border-white/10 transition-colors">
             <p className="text-gray-500 text-[11px] mb-2 font-medium">Ads Today</p>
             <div className="flex items-baseline gap-1">
                <span className="text-white font-bold text-lg">/ 5000</span>
             </div>
             <div className="absolute top-4 right-4 text-gray-600 font-mono text-xs">
                {profile.ads_watched_today}
             </div>
          </div>

          {/* Ad Reward */}
          <div className="bg-[#1f2937] rounded-2xl p-4 border border-white/5 relative group hover:border-white/10 transition-colors">
             <p className="text-gray-500 text-[11px] mb-2 font-medium">Ad Reward</p>
             <div className="flex items-center gap-1.5">
                <TrendingUp size={16} className="text-green-500" />
                <span className="text-green-500 font-bold text-lg tracking-wide">
                    ${currentReward}
                </span>
             </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
           <div className="flex justify-between text-[10px] text-gray-500 mb-2 font-medium px-1">
              <span>Ads Watched:</span>
              <span>To Next Level {nextLevel.nextLvl} ({nextLevel.target})</span>
           </div>
           <div className="h-1.5 bg-[#1f2937] rounded-full overflow-hidden">
              <motion.div 
                 initial={{ width: 0 }}
                 animate={{ width: `${nextLevel.progress}%` }}
                 transition={{ duration: 1, ease: "easeOut" }}
                 className="h-full bg-[#1f2937] relative"
              >
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-full"></div>
              </motion.div>
           </div>
        </div>
      </div>

      {/* Error Message Container (Matches Screenshot Design) */}
      <div className="mb-6 min-h-[48px]">
        <AnimatePresence>
            {errorMsg && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-[#2a1215] border border-red-900/50 rounded-xl p-3 flex items-center justify-center gap-2.5 text-red-400 text-sm font-medium shadow-lg"
                >
                    <AlertCircle size={18} />
                    {errorMsg}
                </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Big Circular Watch Button (Matches Screenshot) */}
      <div className="flex-1 flex items-center justify-center relative pb-8">
         {/* Outer Glow Rings */}
         <div className="absolute w-[280px] h-[280px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none"></div>
         <div className="absolute w-[240px] h-[240px] border border-blue-500/10 rounded-full"></div>
         
         {/* The Button */}
         <button
            onClick={handleWatchAd}
            disabled={loadingAd || profile.ads_watched_today >= 5000}
            className="relative w-56 h-56 rounded-full bg-gradient-to-b from-[#3b82f6] to-[#2563eb] shadow-[0_10px_40px_-10px_rgba(37,99,235,0.5)] flex flex-col items-center justify-center group transition-all active:scale-95 disabled:opacity-80 disabled:grayscale disabled:shadow-none z-10"
         >
            {/* Inner Top Highlight */}
            <div className="absolute top-0 inset-x-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
            
            {loadingAd ? (
                <Loader2 size={56} className="text-white animate-spin drop-shadow-md" />
            ) : (
                <>
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform">
                        <Play size={32} className="text-blue-600 fill-blue-600 ml-1.5" />
                    </div>
                    <span className="text-white font-bold text-xl drop-shadow-md tracking-wide">Watch Ad</span>
                    <div className="bg-black/20 px-4 py-1.5 rounded-full mt-3 backdrop-blur-sm border border-white/10">
                        <span className="text-white text-sm font-medium tracking-wider">+ ${currentReward}</span>
                    </div>
                </>
            )}
         </button>
      </div>

      {/* Success Modal / Toast */}
      <AnimatePresence>
        {showSuccessModal && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-[#111827] border border-green-500/20 shadow-[0_0_40px_rgba(34,197,94,0.15)] px-6 py-4 rounded-2xl flex items-center gap-4 z-50 w-[90%] max-w-xs"
            >
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
                    <TrendingUp size={20} className="text-green-500" />
                </div>
                <div>
                    <h4 className="text-white font-bold text-sm">Reward Received</h4>
                    <p className="text-green-500 text-xs font-mono mt-0.5">+ ${earnedAmount} added</p>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
