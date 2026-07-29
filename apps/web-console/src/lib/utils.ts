import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 五行颜色映射
 */
export const WUXING_COLORS = {
  wood: '#2ECC71',
  fire: '#E74C3C',
  earth: '#F39C12',
  metal: '#BDC3C7',
  water: '#3498DB',
} as const;

export const WUXING_NAMES: Record<string, string> = {
  wood: '木', fire: '火', earth: '土', metal: '金', water: '水',
};

export const WUXING_DIRECTIONS: Record<string, string> = {
  wood: '东', fire: '南', earth: '中', metal: '西', water: '北',
};

/**
 * 格式化能量值
 */
export function formatEnergy(v: number): string {
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v.toFixed(0);
}

/**
 * 获取风险等级颜色
 */
export function getRiskColor(level: number): string {
  if (level >= 70) return '#E74C3C';
  if (level >= 40) return '#F39C12';
  return '#2ECC71';
}

/**
 * 获取吉凶等级颜色
 */
export function getRatingColor(rating: string): string {
  const colors: Record<string, string> = {
    '大吉': '#2ECC71',
    '吉': '#27AE60',
    '平': '#F39C12',
    '凶': '#E67E22',
    '大凶': '#E74C3C',
  };
  return colors[rating] || '#94a3b8';
}

/**
 * 帧率控制
 */
export function throttleRAF<T extends (...args: any[]) => void>(fn: T): T {
  let ticking = false;
  return ((...args: any[]) => {
    if (!ticking) {
      requestAnimationFrame(() => { fn(...args); ticking = false; });
      ticking = true;
    }
  }) as T;
}
