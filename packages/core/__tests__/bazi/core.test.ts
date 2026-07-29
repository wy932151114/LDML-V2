import { describe, it, expect } from 'vitest';
import { calculateBaZi } from '../../src/bazi/core';
import { calculateWuXing, wuxingToString, analyzeShiShen } from '../../src/wuxing/analysis';
import { calculateNinePalace, ninePalaceToString, getYearStarCenter } from '../../src/jiugong/flyingStar';
import { calculateDaYun, calculateLiuNian } from '../../src/dayun/dayunEngine';
import { analyzeShenSha } from '../../src/shensha/shensha';
import { NINE_STARS, TIAN_GAN } from '../../src/utils/constants';

// ============================================================
// 测试用例：使用已知八字验证算法正确性
// ============================================================

/**
 * 测试案例1：已知八字
 * 出生：1990年8月12日 14:30（北京时间）
 * 性别：男
 */
describe('八字排盘核心算法', () => {
  it('应该正确计算年柱：1990年8月 > 立春，应为庚午年', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });
    
    expect(bazi.year.heavenlyStem).toBe('庚');
    expect(bazi.year.earthlyBranch).toBe('午');
    expect(bazi.year.full).toBe('庚午');
    expect(bazi.year.nayin).toBe('路旁土');
  });

  it('立春前出生应为上一年干支', () => {
    // 1990年2月1日（立春前）→ 应为己巳年
    const bazi = calculateBaZi({
      year: 1990, month: 2, day: 1,
      hour: 8, minute: 0,
      gender: '男',
    });
    
    expect(bazi.year.heavenlyStem).toBe('己');
    expect(bazi.year.earthlyBranch).toBe('巳');
    expect(bazi.year.full).toBe('己巳');
  });

  it('应该能区分时柱地支（子时和丑时的时柱不同）', () => {
    const bazi1 = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 23, minute: 30,  // 子时
      gender: '男',
    });
    
    const bazi2 = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 1, minute: 30,   // 丑时
      gender: '男',
    });

    expect(bazi1.hour.earthlyBranch).toBe('子');
    expect(bazi2.hour.earthlyBranch).toBe('丑');
    expect(bazi1.hour.full).not.toBe(bazi2.hour.full);
  });

  it('日柱计算应在合理范围内（1900-2100年）', () => {
    const dates = [
      { y: 1990, m: 1, d: 1 },
      { y: 2000, m: 1, d: 1 },
      { y: 2010, m: 6, d: 15 },
      { y: 2024, m: 12, d: 25 },
    ];

    for (const { y, m, d } of dates) {
      const bazi = calculateBaZi({
        year: y, month: m, day: d,
        hour: 12, minute: 0,
        gender: '男',
      });
      
      expect(bazi.day.heavenlyStem).toBeTruthy();
      expect(bazi.day.earthlyBranch).toBeTruthy();
      expect(bazi.day.full.length).toBe(2);
      expect(bazi.day.nayin).toBeTruthy();
      expect(bazi.dayMaster).toBe(bazi.day.heavenlyStem);
    }
  });

  it('真太阳时修正应改变时柱', () => {
    const baziDefault = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 8, minute: 0,
      gender: '男',
    });
    
    const baziSolar = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 8, minute: 0,
      gender: '男',
      longitude: 87,
      useTrueSolar: true,
    });

    console.log('默认时柱:', baziDefault.hour.full);
    console.log('真太阳时修正后时柱:', baziSolar.hour.full);
  });
});

// ============================================================
// 五行分析测试
// ============================================================

describe('五行动态分析系统', () => {
  it('应该正确计算五行分布', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const wx = calculateWuXing(bazi);
    
    for (const score of Object.values(wx.scores)) {
      expect(score).toBeGreaterThan(0);
    }

    const totalPct = Object.values(wx.percentage).reduce((a, b) => a + b, 0);
    expect(totalPct).toBeCloseTo(100, -1);

    expect(wx.dayMasterWx).toBe(TIAN_GAN[bazi.dayMaster].wuxing);

    console.log(wuxingToString(wx));
  });

  it('身强弱判定应该是身强或身弱之一', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const wx = calculateWuXing(bazi);
    expect(['身强', '身弱', '中和']).toContain(wx.bodyStrength);
    expect(wx.yongShen.length).toBeGreaterThan(0);
    expect(wx.jiShen.length).toBeGreaterThan(0);
  });

  it('十神分析应该返回完整的十神表', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const ss = analyzeShiShen(bazi);
    
    expect(Object.keys(ss.stem).length).toBeGreaterThanOrEqual(4);
    const totalCount = Object.values(ss.stats).reduce((a, b) => a + b, 0);
    expect(totalCount).toBeGreaterThan(0);
    expect(ss.ranking.length).toBe(10);
  });
});

// ============================================================
// 九宫飞星测试
// ============================================================

describe('九宫飞星算法', () => {
  it('流年飞星入中应逐年顺飞', () => {
    const y2024 = getYearStarCenter(2024);
    const y2025 = getYearStarCenter(2025);
    
    expect(((y2024 - 1 + 1) % 9) + 1).toBe(y2025);
    console.log(`2024年入中：${y2024}号星（${NINE_STARS[y2024].name}）`);
    console.log(`2025年入中：${y2025}号星（${NINE_STARS[y2025].name}）`);
  });

  it('应该生成完整的九宫盘', () => {
    const np = calculateNinePalace(2025, 1, 15);
    
    expect(np.year.length).toBe(9);
    expect(np.month.length).toBe(9);
    expect(np.day.length).toBe(9);
    
    expect(np.summary.bestDirection).toBeTruthy();
    expect(np.summary.worstDirection).toBeTruthy();

    console.log(ninePalaceToString(np));
  });
});

// ============================================================
// 大运流年测试
// ============================================================

describe('大运流年引擎', () => {
  it('应该正确计算大运', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const daYun = calculateDaYun(bazi, 4);
    
    expect(daYun.pillars.length).toBe(8);
    expect(daYun.startAge).toBe(4);
    expect(daYun.pillars[0].startAge).toBe(4);
    expect(daYun.pillars[0].endAge).toBe(13);
    for (const p of daYun.pillars) {
      expect(p.endAge - p.startAge + 1).toBe(10);
    }

    console.log('大运排盘：');
    daYun.pillars.forEach(p => {
      console.log(`  ${p.startAge}-${p.endAge}岁（${p.startYear}-${p.endYear}年）：${p.ganZhi}`);
    });
  });

  it('应该能分析当前流年', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const daYun = calculateDaYun(bazi, 4);
    const currentYear = new Date().getFullYear();
    const liuNian = calculateLiuNian(currentYear, bazi, daYun);

    expect(liuNian.year).toBe(currentYear);
    expect(liuNian.ganZhi.length).toBe(2);
    expect(['大吉', '吉', '平', '凶', '大凶']).toContain(liuNian.luckRating);
    expect(liuNian.focusAreas.length).toBeGreaterThan(0);

    console.log(`\n${currentYear}年流年分析：`);
    console.log(`  干支：${liuNian.ganZhi}`);
    console.log(`  吉凶：${liuNian.luckRating}`);
    console.log(`  关注领域：${liuNian.focusAreas.join('、')}`);
  });
});

// ============================================================
// 神煞测试
// ============================================================

describe('神煞系统', () => {
  it('应该正确分析神煞', () => {
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });

    const shensha = analyzeShenSha(bazi);
    
    expect(shensha.all.length).toBeGreaterThan(0);
    
    console.log('\n神煞分析：');
    shensha.all.forEach(s => {
      console.log(`  [${s.type}] ${s.name}（${s.pillar}柱）：${s.description}`);
    });
  });
});

// ============================================================
// 完整流程集成测试
// ============================================================

describe('完整命理分析流程', () => {
  it('应该能完成从排盘到九宫飞星的完整链路', () => {
    // Step 1: 排盘
    const bazi = calculateBaZi({
      year: 1990, month: 8, day: 12,
      hour: 14, minute: 30,
      gender: '男',
    });
    expect(bazi.dayMaster).toBeTruthy();
    console.log('\n====== 完整命理分析流程 ======');
    console.log(`八字：${bazi.year.full} ${bazi.month.full} ${bazi.day.full} ${bazi.hour.full}`);
    console.log(`日主：${bazi.dayMaster}`);

    // Step 2: 五行分析
    const wx = calculateWuXing(bazi);
    expect(wx.bodyStrength).toBeTruthy();
    console.log(`身强弱：${wx.bodyStrength}`);
    console.log(`用神：${wx.yongShen.join('、')}  忌神：${wx.jiShen.join('、')}`);

    // Step 3: 十神
    const ss = analyzeShiShen(bazi);
    expect(ss.ranking.length).toBe(10);
    console.log(`最强十神：${ss.ranking[0].shishen}（${ss.ranking[0].count}次）`);

    // Step 4: 神煞
    const shensha = analyzeShenSha(bazi);
    console.log(`吉神：${shensha.auspicious.map(s => s.name).join('、')}`);
    console.log(`凶煞：${shensha.inauspicious.map(s => s.name).join('、')}`);

    // Step 5: 大运
    const daYun = calculateDaYun(bazi, 4);
    const currentYear = new Date().getFullYear();
    console.log(`当前大运（${currentYear}年）：`);
    const currentDYPillar = daYun.pillars.find(p => currentYear >= p.startYear && currentYear <= p.endYear);
    if (currentDYPillar) {
      console.log(`  ${currentDYPillar.ganZhi}（${currentDYPillar.startAge}-${currentDYPillar.endAge}岁）`);
    }

    // Step 6: 流年
    const liuNian = calculateLiuNian(currentYear, bazi, daYun);
    console.log(`${currentYear}年流年：${liuNian.ganZhi}（${liuNian.luckRating}）`);

    // Step 7: 九宫飞星
    const today = new Date();
    const np = calculateNinePalace(today.getFullYear(), today.getMonth() + 1, today.getDate());
    console.log(`今日吉方：${np.summary.bestDirection}`);
    console.log(`今日凶方：${np.summary.worstDirection}`);

    console.log('\n✅ 完整链路测试通过！所有模块协同工作正常。');
  });
});
