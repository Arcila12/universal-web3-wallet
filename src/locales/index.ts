import browser from 'webextension-polyfill';
import { zhCN } from './zh-CN';
import { enUS } from './en-US';
import { jaJP } from './ja-JP';
import { koKR } from './ko-KR';

export type LocaleKey = keyof typeof zhCN;
export type TranslationKey = string;

const locales = {
  'zh-CN': zhCN,
  'en-US': enUS,
  'ja-JP': jaJP,
  'ko-KR': koKR
};

export type SupportedLocale = keyof typeof locales;

let currentLocale: SupportedLocale = 'zh-CN';

export const setLocale = (locale: SupportedLocale) => {
  currentLocale = locale;
};

export const getCurrentLocale = (): SupportedLocale => {
  return currentLocale;
};

// Helper function to get nested value from object using dot notation
const getNestedValue = (obj: any, path: string): string => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : path;
  }, obj);
};

export const t = (key: string, fallback?: string): string => {
  const translation = getNestedValue(locales[currentLocale], key);
  return translation !== key ? translation : fallback || key;
};

// Load locale from storage
export const loadLocaleFromStorage = async (): Promise<SupportedLocale> => {
  try {
    if (typeof browser !== 'undefined' && browser.storage) {
      const result = await browser.storage.local.get(['language']);
      if (result.language && locales[result.language as SupportedLocale]) {
        currentLocale = result.language as SupportedLocale;
      }
    }
  } catch (error) {
    console.error('Failed to load locale from storage:', error);
  }
  return currentLocale;
};

export { zhCN, enUS, jaJP, koKR };