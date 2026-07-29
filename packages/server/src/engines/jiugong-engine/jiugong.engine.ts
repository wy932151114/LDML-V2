// ============================================================
// 道之自然·命理规则引擎 — 九宫飞星引擎
// 洛书九宫 + 流年/流月/流日飞星 + 方位能量
// ============================================================

import { Injectable } from '@nestjs/common';
import { calculateNinePalace, ninePalaceToString } from '@dzg/core';
import { NINE_STARS } from '@dzg/core';

@Injectable()
export class JiugongEngine {
  /**
   * 计算指定日期的九宫飞星
   */
  calculate(year: number, month: number, day: number) {
    const full = calculateNinePalace(year, month, day);

    const mapPalace = (arr: typeof full.year, starKey: 'currentStar' | 'yearStar' | 'monthStar' | 'dayStar' = 'currentStar') =>
      arr.map(p => ({
        position: p.position,
        name: p.name,
        direction: p.direction,
        star: {
          number: (p as any)[starKey] || p.currentStar,
          name: NINE_STARS[(p as any)[starKey] || p.currentStar].name,
          wuxing: NINE_STARS[(p as any)[starKey] || p.currentStar].wuxing,
          type: NINE_STARS[(p as any)[starKey] || p.currentStar].type,
          color: NINE_STARS[(p as any)[starKey] || p.currentStar].color,
        },
        energy: p.energy,
        type: p.type,
        suitable: p.suitable,
        avoid: p.avoid,
      }));

    return {
      palaces: mapPalace(full.year),
      year: mapPalace(full.year, 'currentStar'),
      month: mapPalace(full.month, 'currentStar'),
      day: mapPalace(full.day, 'currentStar'),
      summary: full.summary,
      text: ninePalaceToString(full),
    };
  }

  /**
   * 获取今日九宫（快捷方式）
   */
  getToday() {
    const now = new Date();
    return this.calculate(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }

  /**
   * 获取方向对应的宫位信息
   */
  getDirectionInfo(direction: string) {
    const now = new Date();
    const np = calculateNinePalace(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const palace = np.year.find(p => p.direction === direction || p.name === direction);
    if (!palace) return null;

    return {
      direction: palace.direction,
      palaceName: palace.name,
      star: {
        number: palace.currentStar,
        name: NINE_STARS[palace.currentStar].name,
        type: NINE_STARS[palace.currentStar].type,
      },
      energy: palace.energy,
      type: palace.type,
      suitable: palace.suitable,
      avoid: palace.avoid,
    };
  }
}
