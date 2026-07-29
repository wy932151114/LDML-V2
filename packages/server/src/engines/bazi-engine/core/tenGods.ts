// ============================================================
// 道之自然·命理引擎 — 十神系统
// 根据日干和命局天干/藏干计算十神
// 正官/偏官/正印/偏印/正财/偏财/食神/伤官/比肩/劫财
// ============================================================

import type { StemName } from './heavenlyStems';
import { HEAVENLY_STEMS, isYangStem } from './heavenlyStems';
import { ELEMENT_CN, cnToElement, getRelation } from './fiveElements';

export type TenGod =
  | '正官' | '偏官' | '正印' | '偏印'
  | '正财' | '偏财' | '食神' | '伤官' | '比肩' | '劫财';

/**
 * 根据日干获取某天干的十神
 * @param dayMaster 日主天干
 * @param target 目标天干
 * @returns 十神名称
 */
export function getTenGod(dayMaster: StemName, target: StemName): TenGod {
  const dm = HEAVENLY_STEMS[dayMaster];
  const tg = HEAVENLY_STEMS[target];

  // 同五行
  if (dm.element === tg.element) {
    return isYangStem(dayMaster) === isYangStem(target) ? '比肩' : '劫财';
  }

  // 生我者为印
  const generateMe: Record<string, string> = {
    wood: 'water', fire: 'wood', earth: 'fire', metal: 'earth', water: 'metal',
  };
  if (generateMe[dm.element] === tg.element) {
    return isYangStem(dayMaster) === isYangStem(target) ? '偏印' : '正印';
  }

  // 我生者为食伤
  const iGenerate: Record<string, string> = {
    wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
  };
  if (iGenerate[dm.element] === tg.element) {
    return isYangStem(dayMaster) === isYangStem(target) ? '食神' : '伤官';
  }

  // 克我者为官杀
  const controlMe: Record<string, string> = {
    wood: 'metal', fire: 'water', earth: 'wood', metal: 'fire', water: 'earth',
  };
  if (controlMe[dm.element] === tg.element) {
    return isYangStem(dayMaster) === isYangStem(target) ? '偏官' : '正官';
  }

  // 我克者为财
  const iControl: Record<string, string> = {
    wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire',
  };
  if (iControl[dm.element] === tg.element) {
    return isYangStem(dayMaster) === isYangStem(target) ? '偏财' : '正财';
  }

  return '比肩'; // fallback
}

/** 十神对应五行 */
export function getTenGodElement(tenGod: TenGod): string {
  const map: Record<TenGod, string> = {
    '比肩': '同我', '劫财': '同我',
    '正印': '生我', '偏印': '生我',
    '食神': '我生', '伤官': '我生',
    '正官': '克我', '偏官': '克我',
    '正财': '我克', '偏财': '我克',
  };
  return map[tenGod] || '';
}

export const ALL_TEN_GODS: TenGod[] = [
  '正官', '偏官', '正印', '偏印',
  '正财', '偏财', '食神', '伤官', '比肩', '劫财',
];
