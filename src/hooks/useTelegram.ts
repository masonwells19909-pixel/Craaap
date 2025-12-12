import { useEffect, useState } from 'react';
import { TelegramWebApp, TelegramUser } from '../types/telegram';

export const useTelegram = () => {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    // Safe access to window.Telegram
    const telegram = (window as any).Telegram?.WebApp as TelegramWebApp;
    
    if (telegram) {
      setTg(telegram);
      telegram.ready();
      
      if (telegram.initDataUnsafe?.user) {
        setUser(telegram.initDataUnsafe.user);
      }
      
      setStartParam(telegram.initDataUnsafe?.start_param || null);
      
      // Expand by default
      try {
        telegram.expand();
      } catch (e) {
        console.error('Failed to expand Telegram WebApp', e);
      }
    }
  }, []);

  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.impactOccurred(style); } catch(e) { /* ignore */ }
      }
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.notificationOccurred(type); } catch(e) { /* ignore */ }
      }
    },
    selection: () => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.selectionChanged(); } catch(e) { /* ignore */ }
      }
    }
  };

  return {
    tg,
    user,
    startParam,
    haptic,
    close: () => tg?.close(),
    expand: () => tg?.expand(),
    isReady: !!tg,
  };
};
