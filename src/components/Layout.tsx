import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { Tv, Pickaxe, Crown, Users, Wallet, Globe, Loader2, AlertTriangle, RefreshCw, Power, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';

export const Layout = () => {
  const { user, profile, loading, error, t, language, setLanguage, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { tg, isReady } = useTelegram();
  const [showTimeout, setShowTimeout] = useState(false);

  // Telegram Integration & Expansion & Language Detection
  useEffect(() => {
    if (tg) {
      try {
        tg.expand();
        tg.ready();
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#000000');
        }

        // Auto-detect language from Telegram
        if (tg.initDataUnsafe?.user?.language_code) {
          const tgLang = tg.initDataUnsafe.user.language_code.toLowerCase();
          if (tgLang.includes('ar')) setLanguage('ar');
          else if (tgLang.includes('ru')) setLanguage('ru');
          else setLanguage('en'); 
        }
      } catch (e) {
        console.error("TG Init Error", e);
      }
    }
  }, [tg, setLanguage]);

  // Loading Timeout Handler
  useEffect(() => {
    let timer: any;
    if (loading) {
      timer = setTimeout(() => {
        setShowTimeout(true);
      }, 8000); // Show retry button after 8 seconds
    } else {
      setShowTimeout(false);
    }
    return () => clearTimeout(timer);
  }, [loading]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white gap-6 relative overflow-hidden p-6 text-center">
        {/* Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-cyan-500/20 blur-[100px] rounded-b-full"></div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-red-600/20 blur-[100px] rounded-t-full"></div>
        
        <Loader2 className="animate-spin text-cyan-500 relative z-10" size={48} />
        
        <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Crypto Miner
            </h2>
            <p className="text-sm text-gray-300 animate-pulse font-medium">
                {language === 'ar' ? 'جاري تجهيز التطبيق...' : 'Setting up App...'}
            </p>
        </div>

        {showTimeout && (
            <div className="relative z-20 mt-8 flex flex-col gap-3 w-full max-w-xs">
                <button 
                    onClick={() => window.location.reload()}
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/10 px-6 py-3 rounded-xl transition-all text-sm w-full"
                >
                    <RefreshCw size={16} />
                    {language === 'ar' ? 'إعادة تحميل الصفحة' : 'Reload Page'}
                </button>
                
                <button 
                    onClick={async () => {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-6 py-3 rounded-xl transition-all text-sm text-red-400 w-full"
                >
                    <Power size={16} />
                    {language === 'ar' ? 'إعادة تعيين التطبيق' : 'Reset App'}
                </button>
            </div>
        )}
      </div>
    );
  }

  // Auth Handling
  if (!user) {
    return <AuthScreen />;
  }

  // Fallback if user exists but profile is still null (Self-heal failed)
  if (!profile) {
     return (
        <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white gap-4 p-6 text-center">
            <AlertTriangle className="text-red-500" size={40} />
            <h3 className="font-bold text-lg">{language === 'ar' ? 'مشكلة في البيانات' : 'Data Error'}</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                {error || (language === 'ar' ? 'تعذر تحميل بيانات الحساب.' : 'Could not load account data.')}
            </p>
            
            <div className="flex flex-col gap-3 mt-6 w-full max-w-xs">
                <button 
                    onClick={() => window.location.reload()} 
                    className="w-full px-6 py-3 bg-white/10 rounded-xl text-sm hover:bg-white/20 border border-white/10"
                >
                    {language === 'ar' ? 'تحديث' : 'Retry'}
                </button>
                <button 
                    onClick={logout} 
                    className="w-full px-6 py-3 bg-red-500/10 text-red-400 rounded-xl text-sm hover:bg-red-500/20 border border-red-500/10"
                >
                    {language === 'ar' ? 'تسجيل خروج' : 'Logout'}
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
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[180px] bg-cyan-500/20 blur-[80px] rounded-b-full opacity-80"></div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[180px] bg-red-600/20 blur-[80px] rounded-t-full opacity-80"></div>
         <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[40px] h-[80%] bg-gradient-to-b from-cyan-900/10 to-red-900/10 blur-[40px]"></div>
         <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[40px] h-[80%] bg-gradient-to-b from-cyan-900/10 to-red-900/10 blur-[40px]"></div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 h-[100dvh] flex flex-col pb-20 overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div className="flex justify-between items-center p-4 backdrop-blur-md bg-black/10 sticky top-0 z-20 border-b border-white/5">
          <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
            <Globe size={14} className="text-gray-400" />
            <select 
              value={language} 
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent text-xs text-gray-300 outline-none border-none cursor-pointer appearance-none pr-2 font-medium"
            >
              <option value="ar" className="bg-gray-900">العربية</option>
              <option value="en" className="bg-gray-900">English</option>
              <option value="ru" className="bg-gray-900">Русский</option>
            </select>
          </div>
        </div>

        <div className="flex-1 p-4">
          <Outlet />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-t border-white/10 pb-safe">
        <div className="flex justify-around items-center p-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={clsx(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-300 w-1/5 relative group",
                  isActive ? "text-cyan-400" : "text-gray-500 hover:text-gray-300"
                )}
              >
                {isActive && <div className="absolute inset-0 bg-cyan-500/10 blur-md rounded-lg"></div>}
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className="relative z-10 transition-transform group-active:scale-90" />
                <span className="text-[10px] font-medium relative z-10">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const AuthScreen = () => {
  const { tg, startParam } = useTelegram();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState(''); 
  const { t, language } = useApp();

  // Detect if we are inside Telegram (checking initDataUnsafe.user existence)
  const isTelegramUser = !!tg?.initDataUnsafe?.user;

  useEffect(() => {
    if (isTelegramUser) {
      handleTelegramAutoLogin();
    }
  }, [isTelegramUser]);

  const handleTelegramAutoLogin = async (retryCount = 0) => {
    setLoading(true);
    const isAr = tg?.initDataUnsafe?.user?.language_code === 'ar';
    
    if (retryCount > 0) {
        setStatus(isAr ? `محاولة الاتصال (${retryCount})...` : `Retrying connection (${retryCount})...`);
    } else {
        setStatus(isAr ? 'جاري التحقق من حساب تيليجرام...' : 'Verifying Telegram Account...');
    }
    
    setError('');
    
    try {
      const tgUser = tg!.initDataUnsafe.user!;
      
      // Force cleanup of any stale session first if this is the first attempt
      if (retryCount === 0) {
        const { data: { session } } = await supabase.auth.getSession();
        const derivedEmail = `${tgUser.id}@telegram.miniapp.com`;
        if (session && session.user.email !== derivedEmail) {
            await supabase.auth.signOut();
        }
      }

      const dummyEmail = `${tgUser.id}@telegram.miniapp.com`;
      const dummyPassword = `tg_pass_${tgUser.id}_secure_hash`; 

      // 1. Try to Sign In
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: dummyPassword
      });

      if (signInError) {
        // 2. If Sign In fails, Try Sign Up
        if (signInError.message.includes('Invalid login credentials')) {
             setStatus(isAr ? 'جاري إنشاء حسابك الجديد...' : 'Creating your account...');
             const { error: signUpError } = await supabase.auth.signUp({
                email: dummyEmail,
                password: dummyPassword,
                options: {
                  data: {
                    referral_code: startParam || '',
                    full_name: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
                    telegram_id: tgUser.id
                  }
                }
             });
             
             if (signUpError) {
                 // If user exists but login failed, it might be a race condition or password issue.
                 // We can't reset password easily without email.
                 // But if "User already registered" happens here, it means signIn failed but signUp says user exists.
                 // This implies password mismatch or auth provider issue.
                 if (signUpError.message.includes('User already registered')) {
                     if (retryCount < 2) {
                        setTimeout(() => handleTelegramAutoLogin(retryCount + 1), 1500);
                        return;
                     }
                 }
                 throw signUpError;
             }
        } else {
            throw signInError;
        }
      }
    } catch (err: any) {
      console.error('Telegram Auth Error:', err);
      let msg = err.message || 'Login Failed';
      
      // Translate common errors
      if (msg.includes('Database error')) msg = language === 'ar' ? 'خطأ في قاعدة البيانات' : 'Database error';
      if (msg.includes('Failed to fetch')) msg = language === 'ar' ? 'فشل الاتصال بالخادم' : 'Connection failed';
      if (msg.includes('User already registered')) msg = language === 'ar' ? 'المستخدم مسجل بالفعل (حاول مرة أخرى)' : 'User already registered';

      setError(msg);
      setStatus('');
    } finally {
        // If successful, AppContext will detect user and unmount this component
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            data: { referral_code: referralCode }
          }
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isTelegramUser) {
    return (
      <div className="min-h-[100dvh] bg-black flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
        <div className="fixed inset-0 z-0 pointer-events-none">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-cyan-500/20 blur-[100px] rounded-b-full"></div>
           <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-red-600/20 blur-[100px] rounded-t-full"></div>
        </div>

        <div className="z-10 flex flex-col items-center gap-6 w-full max-w-xs">
           <div className="relative">
             <div className="absolute inset-0 bg-cyan-500 blur-xl opacity-20 animate-pulse"></div>
             <Loader2 size={64} className="text-cyan-400 animate-spin relative z-10" />
           </div>
           
           <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
             Crypto Miner
           </h2>
           
           <div className="text-center space-y-4 w-full">
             {status && <p className="text-gray-300 font-medium animate-pulse text-sm">{status}</p>}
             
             {error && (
               <div className="bg-red-900/20 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm flex flex-col items-center gap-2 animate-[shake_0.5s_ease-in-out]">
                 <AlertTriangle size={24} className="text-red-500" />
                 <span className="font-bold">{language === 'ar' ? 'حدث خطأ' : 'Error'}</span>
                 <p className="text-xs opacity-80 text-center leading-relaxed">{error}</p>
                 
                 <div className="flex gap-2 mt-2 w-full">
                    <button 
                        onClick={() => handleTelegramAutoLogin()}
                        className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-2 rounded-lg text-xs transition-colors"
                    >
                        {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
                    </button>
                    <button 
                        onClick={async () => {
                            await supabase.auth.signOut();
                            window.location.reload();
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                    >
                        <Trash2 size={12} />
                        {language === 'ar' ? 'تنظيف' : 'Clear'}
                    </button>
                 </div>
               </div>
             )}
           </div>
        </div>
      </div>
    );
  }

  // Browser Fallback (Dev Mode)
  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none bg-black">
         <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-cyan-500/20 blur-[100px] rounded-b-full"></div>
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-[250px] bg-red-600/20 blur-[100px] rounded-t-full"></div>
      </div>

      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Crypto Miner
            </h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest border border-white/10 inline-block px-2 py-1 rounded">Dev Mode / Browser</p>
        </div>
        
        <div className="flex gap-4 mb-6 p-1 bg-black/40 rounded-xl">
          <button 
            onClick={() => setIsLogin(true)}
            className={clsx("flex-1 py-2 rounded-lg text-sm font-medium transition-all", isLogin ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-gray-200")}
          >
            {t('login')}
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={clsx("flex-1 py-2 rounded-lg text-sm font-medium transition-all", !isLogin ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-gray-200")}
          >
            {t('signup')}
          </button>
        </div>

        <form onSubmit={handleManualAuth} className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">{t('email')}</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all"
              placeholder="name@example.com"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1 ml-1">{t('password')}</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs text-gray-400 mb-1 ml-1">Referral Code</label>
              <input 
                type="text" 
                value={referralCode}
                onChange={e => setReferralCode(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition-all"
                placeholder="Optional"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-xs text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}

          <button 
            disabled={loading}
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? '...' : (isLogin ? t('login') : t('signup'))}
          </button>
        </form>
      </div>
    </div>
  );
};
