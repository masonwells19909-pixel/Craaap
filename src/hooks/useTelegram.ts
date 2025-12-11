import { useEffect, useState } from 'react';

// Define the shape of the Telegram WebApp object
interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
    };
    auth_date?: string;
    hash?: string;
    start_param?: string; // This is the referral code
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  setHeaderColor?: (color: string) => void;
  platform?: string;
}

export const useTelegram = () => {
  const [tg, setTg] = useState<TelegramWebApp | null>(null);
  const [user, setUser] = useState<any>(null);
  const [startParam, setStartParam] = useState<string | null>(null);

  useEffect(() => {
    // Safe access to window.Telegram
    const telegram = (window as any).Telegram?.WebApp;
    
    if (telegram) {
      setTg(telegram);
      telegram.ready();
      setUser(telegram.initDataUnsafe?.user);
      setStartParam(telegram.initDataUnsafe?.start_param || null);
      
      // Expand by default
      try {
        telegram.expand();
      } catch (e) {
        console.error('Failed to expand', e);
      }
    }
  }, []);

  const haptic = {
    impact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.impactOccurred(style); } catch(e) {}
      }
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.notificationOccurred(type); } catch(e) {}
      }
    },
    selection: () => {
      if (tg?.HapticFeedback) {
        try { tg.HapticFeedback.selectionChanged(); } catch(e) {}
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
