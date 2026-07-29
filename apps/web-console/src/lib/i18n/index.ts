// ============================================================
// DZS-OS V2 — 国际化 (i18n) 工具
// 轻量级 JSON-based 多语言支持
// 预留扩展点：英文 (en)、繁体中文 (zh-TW)、东南亚语言
// ============================================================

export type Locale = 'zh-CN' | 'en' | 'zh-TW' | 'vi' | 'th' | 'ms' | 'id';

export interface LocaleDef {
  code: Locale;
  label: string;
  native: string;
}

/** 支持的语言列表（当前仅简体中文就绪，其余预留） */
export const SUPPORTED_LOCALES: LocaleDef[] = [
  { code: 'zh-CN', label: '简体中文', native: '简体中文' },
  { code: 'en', label: 'English', native: 'English' },
  { code: 'zh-TW', label: '繁體中文', native: '繁體中文' },
  { code: 'vi', label: 'Tiếng Việt', native: 'Tiếng Việt' },
  { code: 'th', label: 'ภาษาไทย', native: 'ภาษาไทย' },
  { code: 'ms', label: 'Bahasa Melayu', native: 'Bahasa Melayu' },
  { code: 'id', label: 'Bahasa Indonesia', native: 'Bahasa Indonesia' },
];

/** 默认语言 */
export const DEFAULT_LOCALE: Locale = 'zh-CN';

/** 翻译键值类型 */
export type TranslationKeys = Record<string, string | Record<string, any>>;

/** 获取浏览器语言偏好 */
export function getBrowserLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const lang = navigator.language || '';
  if (lang.startsWith('zh')) {
    if (lang.startsWith('zh-TW') || lang.startsWith('zh-HK')) return 'zh-TW';
    return 'zh-CN';
  }
  if (lang.startsWith('vi')) return 'vi';
  if (lang.startsWith('th')) return 'th';
  if (lang.startsWith('ms')) return 'ms';
  if (lang.startsWith('id')) return 'id';
  return 'en';
}

/** 持久化语言偏好 */
export function persistLocale(locale: Locale): void {
  try {
    localStorage.setItem('dzs_locale', locale);
  } catch {}
}

export function loadPersistedLocale(): Locale | null {
  try {
    const stored = localStorage.getItem('dzs_locale');
    if (stored && SUPPORTED_LOCALES.some((l) => l.code === stored)) {
      return stored as Locale;
    }
  } catch {}
  return null;
}
