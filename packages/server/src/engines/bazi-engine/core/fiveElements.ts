// ============================================================
// 道之自然·命理引擎 — 五行关系引擎
// 相生/相克/相泄/相耗 完整关系
// AI分析的核心基础
// ============================================================

import type { Element5 } from './heavenlyStems';

/** 五行相生：木→火→土→金→水→木 */
export const GENERATE: Record<Element5, Element5> = {
  wood:  'fire',
  fire:  'earth',
  earth: 'metal',
  metal: 'water',
  water: 'wood',
};

/** 五行相克：木→土→水→火→金→木 */
export const CONTROL: Record<Element5, Element5> = {
  wood:  'earth',
  earth: 'water',
  water: 'fire',
  fire:  'metal',
  metal: 'wood',
};

/** 反生（泄）：我生者 = 泄我 */
export const DRAIN: Record<Element5, Element5> = {
  wood:  'water',  // 木泄水
  fire:  'wood',   // 火泄木
  earth: 'fire',   // 土泄火
  metal: 'earth',  // 金泄土
  water: 'metal',  // 水泄金
};

/** 反克（耗）：我克者耗我 */
export const CONSUME: Record<Element5, Element5> = {
  wood:  'metal',  // 木耗金
  fire:  'water',  // 火耗水
  earth: 'wood',   // 土耗木
  metal: 'fire',   // 金耗火
  water: 'earth',  // 水耗土
};

/** 五行颜色 */
export const ELEMENT_COLORS: Record<Element5, string> = {
  wood:  '#2ECC71',
  fire:  '#E74C3C',
  earth: '#F39C12',
  metal: '#BDC3C7',
  water: '#3498DB',
};

/** 五行方向 */
export const ELEMENT_DIRECTIONS: Record<Element5, string> = {
  wood:  '东',
  fire:  '南',
  earth: '中',
  metal: '西',
  water: '北',
};

/** 五行数字 */
export const ELEMENT_NUMBERS: Record<Element5, number[]> = {
  wood:  [3, 8],
  fire:  [2, 7],
  earth: [5, 10],
  metal: [4, 9],
  water: [1, 6],
};

/** 五行对应中文 */
export const ELEMENT_CN: Record<Element5, string> = {
  wood:  '木',
  fire:  '火',
  earth: '土',
  metal: '金',
  water: '水',
};

/** 中文转英文五行 */
export function cnToElement(cn: string): Element5 | null {
  const map: Record<string, Element5> = { '木': 'wood', '火': 'fire', '土': 'earth', '金': 'metal', '水': 'water' };
  return map[cn] || null;
}

/** 英文五行转中文 */
export function elementToCn(el: Element5): string {
  return ELEMENT_CN[el];
}

/** 全部五行列表 */
export const ALL_ELEMENTS: Element5[] = ['wood', 'fire', 'earth', 'metal', 'water'];

/** 五行生克关系描述 */
export function getRelation(a: Element5, b: Element5): '生' | '克' | '被生' | '被克' | '同' | '无关' {
  if (a === b) return '同';
  if (GENERATE[a] === b) return '生';
  if (CONTROL[a] === b) return '克';
  if (GENERATE[b] === a) return '被生';
  if (CONTROL[b] === a) return '被克';
  return '无关';
}
