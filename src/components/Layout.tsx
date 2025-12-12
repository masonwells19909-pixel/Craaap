import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTelegram } from '../hooks/useTelegram';
import { Tv, Pickaxe, Crown, Users, Wallet, Globe, Loader2, AlertTriangle, RefreshCw, Power, Trash2, Settings, Smartphone, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '../lib/supabase';
import { Language } from '../lib/translations';

export const Layout = () => {
  const { user, profile, loading, error, t, language, setLanguage, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const { tg } = useTelegram();
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
    let timer: ReturnType<typeof setTimeout>;
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
                {language === 'ar' ? 'جاري الدخول تلقائياً...' : 'Logging in...'}
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
              onChange={(e) => setLanguage(e.target.value as Language)}
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rawError, setRawError] = useState(''); // Store the actual raw error
  const [status, setStatus] = useState(''); 
  const { language } = useApp();

  // Detect if we are inside Telegram OR in Simulation Mode
  const [isSimulating, setIsSimulating] = useState(false);
  // Allow custom ID for simulation to bypass stuck users
  const [simId, setSimId] = useState(123456789);
  
  const isTelegramUser = !!tg?.initDataUnsafe?.user || isSimulating;

  useEffect(() => {
    if (isTelegramUser) {
      handleTelegramAutoLogin();
    }
  }, [isTelegramUser, simId]);

  const handleTelegramAutoLogin = async (retryCount = 0) => {
    setLoading(true);
    const isAr = language === 'ar';
    
    if (retryCount > 0) {
        setStatus(isAr ? `محاولة الاتصال (${retryCount})...` : `Retrying connection (${retryCount})...`);
    } else {
        setStatus(isAr ? 'جاري التحقق من حساب تيليجرام...' : 'Verifying Telegram Account...');
    }
    
    setError('');
    setRawError('');
    
    try {
      // Use real TG user or Mock user for simulation
      const tgUser = isSimulating 
        ? { id: simId, first_name: 'Test', last_name: 'User' } 
        : tg!.initDataUnsafe.user!;
      
      // Force cleanup of any stale session first if this is the first attempt
      if (retryCount === 0) {
        // We check against the NEW email format (V3)
        const derivedEmail = `u${tgUser.id}_v3@tm.app`;
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user.email !== derivedEmail) {
            await supabase.auth.signOut();
        }
      }

      // NEW EMAIL FORMAT TO BYPASS STUCK USERS (V3 Strategy)
      const dummyEmail = `u${tgUser.id}_v3@tm.app`;
      const dummyPassword = `tg_pass_${tgUser.id}_secure_hash_v3`; 

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
                 if (signUpError.message.includes('User already registered')) {
                     // If registered but login failed, it might be a race condition or stale state
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
    } catch (err: unknown) {
      console.error('Telegram Auth Error:', err);
      let msg = err instanceof Error ? err.message : 'Login Failed';
      setRawError(msg); // Save raw error for display
      
      // Translate common errors
      if (msg.includes('Database error')) msg = language === 'ar' ? 'خطأ في قاعدة البيانات' : 'Database error';
      if (msg.includes('Failed to fetch')) msg = language === 'ar' ? 'فشل الاتصال بالخادم' : 'Connection failed';
      if (msg.includes('User already registered')) msg = language === 'ar' ? 'المستخدم مسجل بالفعل (حاول مرة أخرى)' : 'User already registered';
      
      // Specific handling for disabled signups
      if (msg.includes('Signups not allowed')) {
        msg = language === 'ar' 
            ? 'تنبيه للمطور: يجب تفعيل خيار "Allow new users to sign up" في إعدادات Supabase.' 
            : 'Dev Error: Enable "Allow new users to sign up" in Supabase.';
      }

      // Specific handling for disabled email provider
      if (msg.includes('Email logins are disabled') || msg.includes('provider is disabled')) {
         msg = language === 'ar'
            ? 'تنبيه للمطور: يجب تفعيل خيار "Email Provider" في إعدادات Supabase (المفتاح الأول).'
            : 'Dev Error: Enable "Email Provider" in Supabase settings (The first toggle).';
      }

      // Specific handling for Unconfirmed Email (Stale User)
      if (msg.includes('Email not confirmed')) {
          msg = language === 'ar' 
            ? 'الحساب معلق (غير مفعل). يرجى حذف المستخدم من لوحة تحكم Supabase والمحاولة مجدداً.'
            : 'Account unconfirmed. Please delete user from Supabase Dashboard and retry.';
      }

      setError(msg);
      setStatus('');
    } finally {
        // If successful, AppContext will detect user and unmount this component
    }
  };

  // If inside Telegram or Simulating, show Loading/Error Screen ONLY (No Form)
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
                 <ShieldAlert size={28} className="text-red-500" />
                 <span className="font-bold text-base">{language === 'ar' ? 'خطأ في الإعدادات' : 'Configuration Error'}</span>
                 <p className="text-xs opacity-90 text-center leading-relaxed font-medium">{error}</p>
                 
                 {/* Raw Error Display for Debugging */}
                 <div className="w-full bg-black/40 p-2 rounded text-[10px] font-mono text-left text-red-300 overflow-x-auto mt-2 border border-red-500/20">
                    <span className="font-bold block mb-1 text-gray-400">Raw Error from Supabase:</span>
                    {rawError}
                 </div>

                 <div className="flex flex-col gap-2 mt-4 w-full">
                    <button 
                        onClick={() => {
                            setLoading(true);
                            setError('');
                            handleTelegramAutoLogin();
                        }}
                        className="w-full bg-white/10 hover:bg-white/20 text-white px-3 py-3 rounded-lg text-xs transition-colors font-bold"
                    >
                        {language === 'ar' ? 'إعادة المحاولة الآن' : 'Retry Now'}
                    </button>

                    <button 
                        onClick={async () => {
                            await supabase.auth.signOut();
                            localStorage.clear();
                            window.location.reload();
                        }}
                        className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-3 rounded-lg text-xs transition-colors font-medium flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} />
                        {language === 'ar' ? 'حذف البيانات وإعادة التشغيل' : 'Hard Reset & Reload'}
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

      <div className="z-10 w-full max-w-md bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl text-center">
        <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Crypto Miner
            </h1>
            <p className="text-xs text-gray-500 mt-2 uppercase tracking-widest border border-white/10 inline-block px-2 py-1 rounded">
                {language === 'ar' ? 'وضع المتصفح / المطور' : 'Browser / Dev Mode'}
            </p>
        </div>
        
        <div className="space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed">
                {language === 'ar' 
                    ? 'هذا التطبيق مصمم للعمل داخل تيليجرام. في المتصفح، يمكنك محاكاة تجربة الدخول التلقائي.' 
                    : 'This app is designed for Telegram. In browser, you can simulate the auto-login experience.'}
            </p>

            <button 
                onClick={() => setIsSimulating(true)}
                className="w-full bg-[#229ED9] hover:bg-[#1e8cc2] text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
                <Smartphone size={20} />
                {language === 'ar' ? 'محاكاة الدخول عبر تيليجرام' : 'Simulate Telegram Login'}
            </button>

            <div className="pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-500 mb-2">
                    {language === 'ar' ? 'أدوات المطور' : 'Developer Tools'}
                </p>
                <button 
                    onClick={async () => {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        window.location.reload();
                    }}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                >
                    <Trash2 size={14} />
                    {language === 'ar' ? 'مسح البيانات المحلية' : 'Clear Local Data'}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
