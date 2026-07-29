/**
 * 道之自然·命理引擎 — 集成验证脚本
 * 直接运行：npx tsx verify.ts
 */

import { calculateBaZi } from './src/bazi/core';
import { calculateWuXing, wuxingToString, analyzeShiShen } from './src/wuxing/analysis';
import { calculateNinePalace, ninePalaceToString, getYearStarCenter } from './src/jiugong/flyingStar';
import { calculateDaYun, calculateLiuNian } from './src/dayun/dayunEngine';
import { analyzeShenSha } from './src/shensha/shensha';
import { NINE_STARS, TIAN_GAN } from './src/utils/constants';

console.log('='.repeat(60));
console.log('道之自然·命理AI引擎 — 算法验证'.green ? '道之自然·命理AI引擎 — 算法验证' : '道之自然·命理AI引擎 — 算法验证');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name: string, condition: boolean) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

// === 1. 八字排盘 ===
console.log('\n📌 Step 1: 八字排盘');
const bazi = calculateBaZi({
  year: 1990, month: 8, day: 12,
  hour: 14, minute: 30,
  gender: '男',
});

test('年柱应为庚午', bazi.year.full === '庚午');
test('月柱应为甲申', bazi.month.full === '甲申');
test('年柱纳音路旁土', bazi.year.nayin === '路旁土');
test('日主计算', bazi.dayMaster.length === 1);
test('四柱完整', [bazi.year, bazi.month, bazi.day, bazi.hour].every(p => p.full.length === 2));

console.log(`  八字：${bazi.year.full} ${bazi.month.full} ${bazi.day.full} ${bazi.hour.full}`);
console.log(`  日主：${bazi.dayMaster}`);
console.log(`  年柱纳音：${bazi.year.nayin}`);
console.log(`  年柱藏干：${bazi.year.hiddenStems.join('、')}`);
console.log(`  月柱藏干：${bazi.month.hiddenStems.join('、')}`);
console.log(`  日柱藏干：${bazi.day.hiddenStems.join('、')}`);
console.log(`  时柱藏干：${bazi.hour.hiddenStems.join('、')}`);

// 立春前测试
const baziPrev = calculateBaZi({
  year: 1990, month: 2, day: 1,
  hour: 8, minute: 0,
  gender: '男',
});
test('立春前应为己巳年', baziPrev.year.full === '己巳');

// 时柱差别测试
const baziSub = calculateBaZi({
  year: 1990, month: 8, day: 12,
  hour: 23, minute: 30,
  gender: '男',
});
test('子时时柱地支为子', baziSub.hour.earthlyBranch === '子');

const baziChou = calculateBaZi({
  year: 1990, month: 8, day: 12,
  hour: 1, minute: 30,
  gender: '男',
});
test('丑时时柱地支为丑', baziChou.hour.earthlyBranch === '丑');
test('不同时辰的时柱不同', baziSub.hour.full !== baziChou.hour.full);

// 多日期日柱测试
for (const { y, m, d } of [{ y: 2000, m: 1, d: 1 }, { y: 2010, m: 6, d: 15 }, { y: 2024, m: 12, d: 25 }]) {
  const b = calculateBaZi({ year: y, month: m, day: d, hour: 12, minute: 0, gender: '男' });
  test(`日柱有效 ${y}-${m}-${d}`, b.day.full.length === 2 && !!b.day.nayin);
}

// === 2. 五行分析 ===
console.log('\n📌 Step 2: 五行动态分析');
const wx = calculateWuXing(bazi);
console.log(wuxingToString(wx));

test('五行分数均为正', Object.values(wx.scores).every(s => s > 0));
const totalPct = Object.values(wx.percentage).reduce((a, b) => a + b, 0);
test('百分比总和≈100%', Math.abs(totalPct - 100) < 2);
test('日主五行匹配', wx.dayMasterWx === TIAN_GAN[bazi.dayMaster].wuxing);
test('身强弱判定有效', ['身强', '身弱', '中和'].includes(wx.bodyStrength));
test('有用神', wx.yongShen.length > 0);
test('有忌神', wx.jiShen.length > 0);
test('平衡状态有效', ['平衡', '偏旺', '偏弱', '过旺', '过弱'].includes(wx.balanceState as any));

// === 3. 十神分析 ===
console.log('\n📌 Step 3: 十神分析');
const ss = analyzeShiShen(bazi);
console.log(`  天干十神：`);
const pList = [bazi.year, bazi.month, bazi.day, bazi.hour];
for (const p of pList) {
  console.log(`    ${p.full}: ${ss.stem[p.heavenlyStem] || '-'}`);
}
console.log(`  十神排名前三：${ss.ranking.slice(0, 3).map(s => `${s.shishen}(${s.count})`).join(' > ')}`);
test('十神统计完整', Object.keys(ss.stats).length === 10);
test('有十神排名', ss.ranking.length === 10);

// === 4. 神煞系统 ===
console.log('\n📌 Step 4: 神煞系统');
const shensha = analyzeShenSha(bazi);
console.log(`  吉神：${shensha.auspicious.map(s => s.name).join('、') || '无'}`);
console.log(`  凶煞：${shensha.inauspicious.map(s => s.name).join('、') || '无'}`);
console.log(`  共 ${shensha.all.length} 个神煞`);
test('有神煞结果', shensha.all.length > 0);
test('吉神数量正确', shensha.auspicious.length <= shensha.all.length);

// === 5. 大运 ===
console.log('\n📌 Step 5: 大运排盘');
const daYun = calculateDaYun(bazi, 4);
test('大运数量为8', daYun.pillars.length === 8);
test('起始年龄为4', daYun.startAge === 4);
test('首运起于4岁', daYun.pillars[0].startAge === 4);
test('末运止于83岁', daYun.pillars[7].endAge === 83);

console.log(`  起运年龄：${daYun.startAge}岁`);
console.log(`  大运列表：`);
for (const p of daYun.pillars) {
  const range = `${p.startAge}-${p.endAge}岁（${p.startYear}-${p.endYear}）`;
  console.log(`    ${range}: ${p.ganZhi} ${p.stemShiShen ? `[${p.stemShiShen}]` : ''}`);
}

// === 6. 流年 ===
console.log('\n📌 Step 6: 当前流年');
const curYear = new Date().getFullYear();
const liuNian = calculateLiuNian(curYear, bazi, daYun);
test('流年干支有效', liuNian.ganZhi.length === 2);
test('流年吉凶有效', ['大吉', '吉', '平', '凶', '大凶'].includes(liuNian.luckRating));
test('有关注领域', liuNian.focusAreas.length > 0);
console.log(`  ${curYear}年：${liuNian.ganZhi} [${liuNian.luckRating}]`);
console.log(`  关注领域：${liuNian.focusAreas.join('、')}`);
console.log(`  大运关系：${liuNian.daYunRelation}`);

// === 7. 九宫飞星 ===
console.log('\n📌 Step 7: 九宫飞星');
const y2024 = getYearStarCenter(2024);
const y2025 = getYearStarCenter(2025);
test('2024→2025入中顺飞', ((y2024 - 1 + 1) % 9) + 1 === y2025);
console.log(`  2024年入中：${y2024}号（${NINE_STARS[y2024].name}星）`);
console.log(`  2025年入中：${y2025}号（${NINE_STARS[y2025].name}星）`);

const np = calculateNinePalace(curYear, new Date().getMonth() + 1, new Date().getDate());
test('年飞星9宫', np.year.length === 9);
test('月飞星9宫', np.month.length === 9);
test('日飞星9宫', np.day.length === 9);
test('有最佳方位', !!np.summary.bestDirection);
test('有最差方位', !!np.summary.worstDirection);

console.log(ninePalaceToString(np));

// === 最终 ===
console.log('\n' + '='.repeat(60));
console.log(`📊 测试结果：${passed} 通过 / ${failed} 失败 / 共 ${passed + failed} 项`);
console.log(failed === 0 ? '🎉 全部通过！' : '❌ 有失败项，请检查');
console.log('='.repeat(60));
