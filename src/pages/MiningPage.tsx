import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { useTelegram } from '../hooks/useTelegram';
import { Lock, Coins, ArrowDown, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export const MiningPage = () => {
  const { profile, t, refreshProfile } = useApp();
  const { haptic } = useTelegram();
  const [spinning, setSpinning] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!profile) return null;

  const isUnlocked = profile.ads_watched >= 10000;
  
  const canSpin = !profile.last_mining_spin || 
    (new Date().getTime() - new Date(profile.last_mining_spin).getTime() > 24 * 60 * 60 * 1000);

  const depositLocked = profile.deposit_date && 
    (new Date().getTime() - new Date(profile.deposit_date).getTime() < 24 * 60 * 60 * 1000);

  const handleDeposit = async () => {
    setErrorMsg('');
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < 1 || amount > 10) {
        setErrorMsg(t('mining_deposit_desc'));
        haptic.notification('error');
        return;
    }

    try {
        const { error } = await supabase.rpc('deposit_for_mining', { amount });
        if (error) throw error;
        
        haptic.notification('success');
        setDepositAmount('');
        await refreshProfile();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Deposit failed';
        // Translate common errors
        if (message.includes('Insufficient')) setErrorMsg(t('insufficient_balance'));
        else setErrorMsg(t('error'));
        haptic.notification('error');
    }
  };

  const handleWithdrawDeposit = async () => {
    if (depositLocked) return;
    setWithdrawLoading(true);
    try {
      const { error } = await supabase.rpc('withdraw_mining_deposit');
      if (error) throw error;
      haptic.notification('success');
      await refreshProfile();
    } catch (err: any) {
      console.error('Error withdrawing deposit:', err);
      haptic.notification('error');
      setErrorMsg(t('error'));
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleSpin = async () => {
    if (!canSpin || !isUnlocked || profile.mining_deposit < 1) return;

    setSpinning(true);
    setErrorMsg('');
    haptic.impact('medium');
    
    let ticks = 0;
    const tickInterval = setInterval(() => {
        haptic.selection();
        ticks++;
        if (ticks > 20) clearInterval(tickInterval);
    }, 150);
    
    try {
        await new Promise(resolve => setTimeout(resolve, 4000));

        const { error } = await supabase.rpc('spin_mining_wheel');
        
        if (error) throw error;
        haptic.notification('success');
        await refreshProfile();
    } catch (err: any) {
        let message = err instanceof Error ? err.message : 'Spin failed';
        
        // Translate errors
        if (message.includes('cooldown') || message.includes('24 hours')) message = t('wait_24h');
        else if (message.includes('Insufficient')) message = t('insufficient_balance');
        else message = t('try_again');

        setErrorMsg(message);
        haptic.notification('error');
    } finally {
        setSpinning(false);
        clearInterval(tickInterval);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
        <div className="w-32 h-32 rounded-full bg-gray-900 flex items-center justify-center border-4 border-gray-800 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <Lock size={48} className="text-gray-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-300">{t('locked')}</h2>
          <p className="text-gray-500 mt-2">{t('unlock_at')} 10,000 {t('ads_count')}</p>
          <div className="mt-4 w-full max-w-xs bg-gray-800 rounded-full h-2 mx-auto overflow-hidden border border-white/5">
            <div 
              className="h-full bg-cyan-600 shadow-[0_0_10px_rgba(8,145,178,0.5)]" 
              style={{ width: `${Math.min((profile.ads_watched / 10000) * 100, 100)}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500 mt-1">{profile.ads_watched} / 10,000</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <div className="text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent drop-shadow-sm">
          {t('mining_wheel')}
        </h2>
        <p className="text-xs text-gray-400 mt-1">{t('mining_deposit_desc')}</p>
      </div>

      <div className="relative flex justify-center py-6">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 filter drop-shadow-lg">
           <ArrowDown className="text-white fill-white w-10 h-10" />
        </div>

        <motion.div 
          animate={spinning ? { rotate: 360 * 8 + 45 } : { rotate: 0 }}
          transition={{ duration: 4, ease: "circOut" }}
          className="w-72 h-72 rounded-full border-[6px] border-gray-800 bg-gray-900 relative flex items-center justify-center shadow-[0_0_60px_rgba(234,179,8,0.15)] overflow-hidden"
          style={{
            background: `conic-gradient(
              #eab308 0deg 45deg,
              #1f2937 45deg 90deg,
              #f97316 90deg 135deg,
              #1f2937 135deg 180deg,
              #eab308 180deg 225deg,
              #1f2937 225deg 270deg,
              #f97316 270deg 315deg,
              #1f2937 315deg 360deg
            )`
          }}
        >
           <div className="absolute inset-4 rounded-full border border-white/10"></div>
           
           <div className="z-20 bg-gradient-to-br from-gray-800 to-black w-20 h-20 rounded-full flex items-center justify-center border-4 border-gray-700 shadow-xl">
             <Coins className="text-yellow-500 w-8 h-8" />
           </div>

           {!spinning && (
             <>
               <span className="absolute top-8 text-[10px] font-bold text-black transform -translate-x-1/2 left-1/2">WIN</span>
               <span className="absolute bottom-8 text-[10px] font-bold text-black transform -translate-x-1/2 left-1/2">WIN</span>
               <span className="absolute left-8 text-[10px] font-bold text-black transform -translate-y-1/2 top-1/2">WIN</span>
               <span className="absolute right-8 text-[10px] font-bold text-black transform -translate-y-1/2 top-1/2">WIN</span>
             </>
           )}
        </motion.div>
      </div>

      <div className="space-y-4 max-w-sm mx-auto">
        {errorMsg && (
            <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm text-center">
                {errorMsg}
            </div>
        )}

        {profile.mining_deposit < 1 ? (
          <div className="bg-white/5 p-5 rounded-2xl border border-white/10 backdrop-blur-sm">
            <label className="text-xs text-gray-400 block mb-2 font-medium">{t('deposit')} ($1 - $10)</label>
            <div className="flex gap-2">
              <input 
                type="number" 
                value={depositAmount}
                onChange={e => setDepositAmount(e.target.value)}
                placeholder="1.00"
                className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 outline-none focus:border-yellow-500 text-white transition-colors"
              />
              <button 
                onClick={handleDeposit}
                className="bg-yellow-600 hover:bg-yellow-500 text-black font-bold px-6 rounded-xl text-sm transition-all active:scale-95"
              >
                {t('deposit')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center bg-white/5 p-4 rounded-2xl border border-white/10">
               <div className="flex justify-between items-center mb-4 px-2">
                  <span className="text-sm text-gray-400">{t('balance')}</span>
                  <span className="text-yellow-400 font-mono font-bold text-lg">${profile.mining_deposit.toFixed(2)}</span>
               </div>
               
               <button
                onClick={handleSpin}
                disabled={!canSpin || spinning}
                className="w-full py-4 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-500 hover:to-orange-500 rounded-xl font-bold text-lg text-black shadow-[0_0_20px_rgba(234,179,8,0.3)] disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
              >
                {spinning ? '...' : (canSpin ? t('spin') : t('wait_24h'))}
              </button>
              
              {!canSpin && (
                 <p className="text-xs text-red-400 mt-3 bg-red-500/10 py-2 rounded-lg">{t('wait_24h')}</p>
              )}
            </div>

            <button
              onClick={handleWithdrawDeposit}
              disabled={depositLocked || withdrawLoading}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm text-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogOut size={16} />
              {withdrawLoading ? t('processing') : depositLocked ? `${t('locked')} (24h)` : t('withdraw')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
