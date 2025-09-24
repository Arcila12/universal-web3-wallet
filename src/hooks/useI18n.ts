import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { setLocale, getCurrentLocale, loadLocaleFromStorage, SupportedLocale } from '../locales';
import {t as localeT} from '../locales';
interface I18nContextType {
  t: (key: string, fallback?: string) => string;
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  loading: boolean;
}

export const I18nContext = createContext<I18nContextType | null>(null);

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export const useI18nProvider = () => {
  const [locale, setCurrentLocale] = useState<SupportedLocale>(getCurrentLocale());
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState({});

  // Create a t function that triggers re-render when locale changes
  const t = useCallback((key: string, fallback?: string): string => {
    return localeT(key, fallback);
  }, [locale]);

  useEffect(() => {
    const loadInitialLocale = async () => {
      const savedLocale = await loadLocaleFromStorage();
      setCurrentLocale(savedLocale);
      setLocale(savedLocale);
      setLoading(false);
    };
    loadInitialLocale();
  }, []);

  const changeLocale = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
    setCurrentLocale(newLocale);
    // Force re-render by updating state
    forceUpdate({});
  }, []);

  return {
    t,
    locale,
    setLocale: changeLocale,
    loading
  };
};