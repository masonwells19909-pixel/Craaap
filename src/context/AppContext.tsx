import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { translations, Language } from '../lib/translations';
import { User, Session } from '@supabase/supabase-js';

interface AppContextType {
  user: User | null;
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  loading: boolean;
  error: string | null;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['ar']) => string;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('ar');

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
    window.location.reload();
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      // Don't clear error immediately to avoid UI flickering if it was a persistent error
      // setError(null); 
      
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
           // Profile missing! Attempt Self-Heal
           console.log('Profile missing, attempting self-heal...');
           const { error: healError } = await supabase.rpc('self_heal_profile');
           
           if (!healError) {
             // Retry fetch after heal
             const { data: retryData } = await supabase
               .from('profiles')
               .select('*')
               .eq('id', user.id)
               .single();
             if (retryData) {
               handleProfileData(retryData);
               return;
             }
           } else {
             console.error('Self-heal failed:', healError);
             setError('Account setup failed. Please try resetting.');
             return;
           }
        } else {
           // If it's a network error (TypeError: Failed to fetch), just log it and don't block the UI if we already have data
           if (fetchError.message && fetchError.message.includes('fetch')) {
               console.warn('Network error refreshing profile, keeping old data');
               return;
           }
           throw fetchError;
        }
      }

      if (data) {
        handleProfileData(data);
        setError(null); // Clear error on success
      }
    } catch (err: unknown) {
      console.error('Error refreshing profile:', err);
      // Only set global error if we don't have a profile yet (initial load)
      if (!profile) {
          const message = err instanceof Error ? err.message : 'Connection Error';
          setError(message);
      }
    }
  };

  const handleProfileData = (data: Profile) => {
    const today = new Date().toISOString().split('T')[0];
    // Robust check for daily reset
    if (data.last_ad_reset_date && data.last_ad_reset_date < today) {
        data.ads_watched_today = 0;
    }
    setProfile(data);
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshProfile().finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [user]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof typeof translations['ar']) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ user, profile, setProfile, loading, error, language, setLanguage, t, refreshProfile, logout }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
