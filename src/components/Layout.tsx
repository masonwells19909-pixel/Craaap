import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { Tv, Pickaxe, Crown, Users, Wallet, Globe, Loader2, AlertTriangle, RefreshCw, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import { Language } from '../lib/translations';

export const Layout = () => {
  const { user, profile, loading, error, t, language, setLanguage, logout, refreshProfile } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { tg } = useTelegram();
  const [showTimeout, setShowTimeout] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Telegram Integration & Expansion & Language Detection
  useEffect(() => {
    if (tg) {
      try {
        tg.expand();
        tg.ready();
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#000000');
        }

        // Auto-detect language from Telegram if not set manually
        if (tg.initDataUnsafe?.user?.language_code) {
          const tgLang = tg.initDataUnsafe.user.language_code.toLowerCase();
          // Only set if we haven't stored a preference (simplified logic here)
          if (!localStorage.getItem('app_lang')) {
             if (tgLang.includes('ar')) setLanguage('ar');
             else if (tgLang.includes('ru')) setLanguage('ru');
             else setLanguage('en'); 
          }
        }
      } catch (e) {
        console.error("TG Init Error", e);
      }
    }
  }, [tg]);

  // Loading Timeout Handler
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (loading) {
      timer = setTimeout(() => {
        setShowTimeout(true);
      }, 8000); 
    } else {
      setShowTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  const handleRetry = async () => {
    setIsRetrying(true);
    await refreshProfile();
    setTimeout(() => {
        setIsRetrying(false);
        // If still no profile after retry, reload page
        if (!profile) window.location.reload();
    }, 1500);
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white gap-6 relative overflow-hidden p-6 text-center">
        <Loader2 className="animate-spin text-cyan-500 relative z-10" size={48} />
        {showTimeout && (
            <div className="relative z-10 animate-fade-in">
                <p className="text-gray-400 text-sm mb-4">{t('error')}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="px-6 py-2 bg-white/10 rounded-full text-sm font-medium hover:bg-white/20 transition-colors"
                >
                    {t('try_again')}
                </button>
            </div>
        )}
      </div>
    );
  }

  // Auth Handling (Assuming AuthScreen handles the !user case)
  if (!user) {
    return <AuthScreen />; // Using the internal AuthScreen component or logic
  }

  // Fallback if user exists but profile is still null (Data Error)
  if (!profile) {
     return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white gap-6 p-8 text-center">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertTriangle className="text-red-500" size={40} />
            </div>
            <div>
                <h3 className="font-bold text-xl mb-2">{language === 'ar' ? 'تعذر تحميل البيانات' : 'Data Load Error'}</h3>
                <p className="text-gray-400 text-sm">{language === 'ar' ? 'يرجى التحقق من الاتصال وإعادة المحاولة' : 'Please check connection and retry'}</p>
            </div>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={handleRetry} 
                    disabled={isRetrying}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    {isRetrying ? <Loader2 className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                    <span>{language === 'ar' ? 'إعادة المحاولة' : 'Retry'}</span>
                </button>
                
                <button 
                    onClick={logout} 
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm text-gray-400 flex items-center justify-center gap-2"
                >
                    <LogOut size={16} />
                    <span>{t('logout')}</span>
                </button>
            </div>
        </div>
     );
  }

  const navItems = [
    { id: 'ads', icon: Tv, label: t('ads'), path: '/' },
    { id: 'mining', icon: Pickaxe, label: t('mining'), path: '/mining' },
    { id: 'vip', icon: Crown, label: t('vip'), path: '/vip' },
    { id: 'referral', icon: Users, label: t('referral'), path: '/referral' },
    { id: 'withdraw', icon: Wallet, label: t('withdraw'), path: '/withdraw' },
  ];

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-black text-white font-sans">
      {/* Background Gradient matching the image style */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
         <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-[#0f172a] to-black opacity-100"></div>
         <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-cyan-900/20 blur-[100px]"></div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 h-[100dvh] flex flex-col pb-20 overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center px-6 pt-6 pb-2 sticky top-0 z-20">
            <h1 className="text-xl font-bold text-white">Earn cryptocurrency</h1>
            
            <div className="flex items-center gap-2 bg-[#1f2937] px-3 py-1.5 rounded-full border border-white/5">
                <Globe size={12} className="text-gray-400" />
                <select 
                value={language} 
                onChange={(e) => {
                    setLanguage(e.target.value as Language);
                    localStorage.setItem('app_lang', e.target.value);
                }}
                className="bg-transparent text-[10px] text-gray-300 outline-none border-none cursor-pointer appearance-none pr-1 font-medium uppercase"
                >
                <option value="ar" className="bg-gray-900">AR</option>
                <option value="en" className="bg-gray-900">EN</option>
                <option value="ru" className="bg-gray-900">RU</option>
                </select>
            </div>
        </div>

        <div className="flex-1">
          <Outlet />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#000000]/95 backdrop-blur-xl border-t border-white/5 pb-safe">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center gap-1.5 p-2 rounded-lg transition-all duration-300 w-1/5 relative group",
                  isActive ? "text-cyan-400" : "text-gray-500 hover:text-gray-300"
                )}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 transition-transform group-active:scale-90" />
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Simple AuthScreen Placeholder (Assuming logic is handled in AppContext/Main Auth Flow)
const AuthScreen = () => {
    return (
        <div className="min-h-screen bg-black flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-500" size={48} />
        </div>
    );
};
