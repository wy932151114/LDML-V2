// ============================================================
// 道之自然·命理规则引擎 — 真太阳时引擎
// 经度修正 + 均时差计算
// ============================================================

import { Injectable } from '@nestjs/common';

@Injectable()
export class SolarEngine {
  /**
   * 计算真太阳时
   * @param beijingHour 用户输入的北京时间（小时）
   * @param beijingMinute 用户输入的北京时间（分钟）
   * @param longitude 当地经度（东经为正）
   * @param year 年份
   * @param month 月份
   * @param day 日期
   * @returns 修正后的时辰
   */
  calculate(
    beijingHour: number,
    beijingMinute: number,
    longitude: number,
    year: number,
    month: number,
    day: number,
  ) {
    // 经度修正：东经120°为标准，每1°=4分钟
    const longitudeDiff = longitude - 120;
    const longitudeCorrection = longitudeDiff * 4;

    // 均时差
    const equationOfTime = this.getEquationOfTime(year, month, day);

    // 总偏移（分钟）
    const totalOffset = longitudeCorrection + equationOfTime;

    // 修正后的总分钟数
    let totalMinutes = beijingHour * 60 + beijingMinute + totalOffset;
    if (totalMinutes < 0) totalMinutes += 1440;
    if (totalMinutes >= 1440) totalMinutes -= 1440;

    const resultHour = Math.floor(totalMinutes / 60);
    const resultMinute = Math.round(totalMinutes % 60);

    // 时辰对应
    const shichen = this.getShiChen(resultHour, resultMinute);

    return {
      trueSolarTime: `${String(resultHour).padStart(2, '0')}:${String(resultMinute).padStart(2, '0')}`,
      hour: resultHour,
      minute: resultMinute,
      shichen,
      longitudeCorrection: Math.round(longitudeCorrection * 100) / 100,
      equationOfTime: Math.round(equationOfTime * 100) / 100,
      totalOffset: Math.round(totalOffset * 100) / 100,
      // 是否跨时辰
      isCrossed: this.didCrossShiChen(beijingHour, beijingMinute, resultHour, resultMinute),
    };
  }

  /** 计算均时差（分钟） */
  private getEquationOfTime(year: number, month: number, day: number): number {
    const dayOfYear = this.getDayOfYear(year, month, day);
    const B = (2 * Math.PI * (dayOfYear - 81)) / 364;
    return 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  }

  private getDayOfYear(year: number, month: number, day: number): number {
    const start = new Date(Date.UTC(year, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day));
    return Math.floor((end.getTime() - start.getTime()) / 86400000);
  }

  private getShiChen(hour: number, minute: number): string {
    const map: Record<number, string> = {
      0: '子时', 1: '丑时', 2: '丑时', 3: '寅时', 4: '寅时',
      5: '卯时', 6: '卯时', 7: '辰时', 8: '辰时', 9: '巳时',
      10: '巳时', 11: '午时', 12: '午时', 13: '未时', 14: '未时',
      15: '申时', 16: '申时', 17: '酉时', 18: '酉时', 19: '戌时',
      20: '戌时', 21: '亥时', 22: '亥时', 23: '子时',
    };
    return map[hour] || '未知';
  }

  private didCrossShiChen(
    origHour: number, origMinute: number,
    newHour: number, newMinute: number,
  ): boolean {
    const origShichen = this.getShiChen(origHour, origMinute);
    const newShichen = this.getShiChen(newHour, newMinute);
    return origShichen !== newShichen;
  }
}
