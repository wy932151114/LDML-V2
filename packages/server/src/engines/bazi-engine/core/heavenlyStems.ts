// ============================================================
// 道之自然·命理引擎 — 天干常量
// 独立文件，工程级设计
// ============================================================

export type StemName = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type Element5 = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export type YinYang = 'yang' | 'yin';

export interface HeavenlyStem {
  name: StemName;
  element: Element5;
  yinYang: YinYang;
  /** 中文五行 */
  elementCn: string;
  /** 五行序号 0木1火2土3金4水 */
  wxIndex: number;
}

export const HEAVENLY_STEMS: Record<StemName, HeavenlyStem> = {
  '甲': { name: '甲', element: 'wood',    yinYang: 'yang', elementCn: '木', wxIndex: 0 },
  '乙': { name: '乙', element: 'wood',    yinYang: 'yin',  elementCn: '木', wxIndex: 0 },
  '丙': { name: '丙', element: 'fire',    yinYang: 'yang', elementCn: '火', wxIndex: 1 },
  '丁': { name: '丁', element: 'fire',    yinYang: 'yin',  elementCn: '火', wxIndex: 1 },
  '戊': { name: '戊', element: 'earth',   yinYang: 'yang', elementCn: '土', wxIndex: 2 },
  '己': { name: '己', element: 'earth',   yinYang: 'yin',  elementCn: '土', wxIndex: 2 },
  '庚': { name: '庚', element: 'metal',   yinYang: 'yang', elementCn: '金', wxIndex: 3 },
  '辛': { name: '辛', element: 'metal',   yinYang: 'yin',  elementCn: '金', wxIndex: 3 },
  '壬': { name: '壬', element: 'water',   yinYang: 'yang', elementCn: '水', wxIndex: 4 },
  '癸': { name: '癸', element: 'water',   yinYang: 'yin',  elementCn: '水', wxIndex: 4 },
};

export const STEM_LIST: StemName[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];

/** 天干转序号 (0-9) */
export function stemToIndex(stem: StemName): number {
  return STEM_LIST.indexOf(stem);
}

/** 序号转天干 */
export function indexToStem(index: number): StemName {
  return STEM_LIST[((index % 10) + 10) % 10];
}

/** 判断是否为阳干 */
export function isYangStem(stem: StemName): boolean {
  return HEAVENLY_STEMS[stem].yinYang === 'yang';
}

/** 判断是否为阴干 */
export function isYinStem(stem: StemName): boolean {
  return HEAVENLY_STEMS[stem].yinYang === 'yin';
}
