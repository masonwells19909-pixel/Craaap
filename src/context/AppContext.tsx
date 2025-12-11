import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, Profile } from '../lib/supabase';
import { translations, Language } from '../lib/translations';

interface AppContextType {
  user: any | null;
  profile: Profile | null;
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
  const [user, setUser] = useState<any | null>(null);
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
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
         // Real error (not just missing row)
         throw fetchError;
      }

      if (data) {
        setProfile(data);
      } else {
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
            setProfile(retryData);
          } else {
            setError('Failed to recover profile');
          }
        } else {
          console.error('Self-heal failed:', healError);
          setError('Account setup failed. Please try resetting.');
        }
      }
    } catch (err: any) {
      console.error('Error refreshing profile:', err);
      setError(err.message || 'Connection Error');
    }
  };

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setLoading(true);
      refreshProfile().finally(() => setLoading(false));
    } else {
      setProfile(null);
    }
  }, [user]);

  // Set document direction based on language
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: keyof typeof translations['ar']) => {
    return translations[language][key] || key;
  };

  return (
    <AppContext.Provider value={{ user, profile, loading, error, language, setLanguage, t, refreshProfile, logout }}>
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
