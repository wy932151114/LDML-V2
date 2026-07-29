// ============================================================
// DZS-OS V2 — i18n React Context + Hook
// ============================================================

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Locale, DEFAULT_LOCALE, getBrowserLocale, persistLocale, loadPersistedLocale } from './index';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  availableLocales: { code: Locale; label: string; native: string }[];
}

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (key: string) => key,
  availableLocales: [],
});

// 懒加载语言包
const loadMessages = (locale: Locale): Record<string, any> => {
  try {
    // 动态加载对应语言的 JSON
    // 打包时只打包 zh-CN（其他语言包按需加载）
    switch (locale) {
      case 'zh-CN':
        return require('./zh-CN.json');
      case 'en':
        // return require('./en.json'); // 预留
      case 'zh-TW':
        // return require('./zh-TW.json'); // 预留
      default:
        return require('./zh-CN.json');
    }
  } catch {
    return {};
  }
};

/** 点号分隔路径取值 */
function resolvePath(obj: any, path: string): string | undefined {
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = current[key];
  }
  return typeof current === 'string' ? current : undefined;
}

/** 简单模板替换：{{key}} → value */
function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `{{${key}}}`;
  });
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [messages, setMessages] = useState<Record<string, any>>({});

  // 初始化
  useEffect(() => {
    const persisted = loadPersistedLocale();
    const initial = persisted || getBrowserLocale();
    setLocaleState(initial);
    setMessages(loadMessages(initial));
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    setMessages(loadMessages(newLocale));
    persistLocale(newLocale);
    // 设置 HTML lang 属性
    document.documentElement.lang = newLocale.replace('-', '-');
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const raw = resolvePath(messages, key);
      if (raw === undefined) return key; // fallback to key
      return interpolate(raw, params);
    },
    [messages],
  );

  const value: I18nContextValue = {
    locale,
    setLocale,
    t,
    availableLocales: [
      { code: 'zh-CN' as Locale, label: '简体中文', native: '简体中文' },
      { code: 'en' as Locale, label: 'English', native: 'English' },
      { code: 'zh-TW' as Locale, label: '繁體中文', native: '繁體中文' },
      { code: 'vi' as Locale, label: 'Tiếng Việt', native: 'Tiếng Việt' },
      { code: 'th' as Locale, label: 'ภาษาไทย', native: 'ภาษาไทย' },
      { code: 'ms' as Locale, label: 'Bahasa Melayu', native: 'Bahasa Melayu' },
      { code: 'id' as Locale, label: 'Bahasa Indonesia', native: 'Bahasa Indonesia' },
    ],
  };

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
