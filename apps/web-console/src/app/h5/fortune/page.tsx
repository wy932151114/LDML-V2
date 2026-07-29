'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Sun, Moon, Wind, Droplets, Flame, Sparkles } from 'lucide-react';
import BottomNav from '@/app/h5/_components/BottomNav';

/**
 * 道之自然 · H5 每日运势页面
 * 基于八字排盘 + 当日干支的运势分析
 */

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const SHENG_XIAO = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const SHI_CHEN = [
  { name: '子时', start: '23:00', end: '00:59', index: 0 },
  { name: '丑时', start: '01:00', end: '02:59', index: 1 },
  { name: '寅时', start: '03:00', end: '04:59', index: 2 },
  { name: '卯时', start: '05:00', end: '06:59', index: 3 },
  { name: '辰时', start: '07:00', end: '08:59', index: 4 },
  { name: '巳时', start: '09:00', end: '10:59', index: 5 },
  { name: '午时', start: '11:00', end: '12:59', index: 6 },
  { name: '未时', start: '13:00', end: '14:59', index: 7 },
  { name: '申时', start: '15:00', end: '16:59', index: 8 },
  { name: '酉时', start: '17:00', end: '18:59', index: 9 },
  { name: '戌时', start: '19:00', end: '20:59', index: 10 },
  { name: '亥时', start: '21:00', end: '22:59', index: 11 },
];

/** 计算指定日期的日干支（基于1984年1月1日甲午日） */
function getDayGanzhi(date: Date): { heavenly: string; earthly: string; full: string } {
  // 用 UTC 对齐去除时区和时分秒影响，确保天数差精确
  const ref = Date.UTC(1984, 0, 1);
  const d = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.round((d - ref) / 86400000);
  // 1984-01-01 = 甲午日（天干索引0，地支索引6），非甲子日
  const heavenly = TIAN_GAN[((diff + 0) % 10 + 10) % 10];
  const earthly = DI_ZHI[((diff + 6) % 12 + 12) % 12];
  return { heavenly, earthly, full: `${heavenly}${earthly}` };
}

function getCurrentShichen(): { name: string; start: string; end: string; index: number } {
  const h = new Date().getHours();
  const m = new Date().getMinutes();
  const totalMinutes = h * 60 + m;
  for (const sc of SHI_CHEN) {
    const [sh, sm] = sc.start.split(':').map(Number);
    const [eh, em] = sc.end.split(':').map(Number);
    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins < startMins) endMins += 1440;
    if (totalMinutes >= startMins && totalMinutes < endMins) return sc;
  }
  return SHI_CHEN[0];
}

const LUNAR_ZH_DAYS = ['初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

function getLunarDate(date: Date): string {
  const ref = new Date(2024, 0, 1);
  const diff = Math.round((date.getTime() - ref.getTime()) / 86400000);
  const lunarDay = (20 + diff) % 30 || 30;
  return LUNAR_ZH_DAYS[lunarDay - 1] || `${lunarDay}日`;
}

type FortuneCategory = 'overall' | 'career' | 'wealth' | 'love' | 'health';

const FORTUNE_DESCRIPTIONS: Record<string, { emoji: string; text: string }> = {
  overall: { emoji: '⭐', text: '总运' },
  career: { emoji: '💼', text: '事业' },
  wealth: { emoji: '💰', text: '财运' },
  love: { emoji: '💕', text: '感情' },
  health: { emoji: '💪', text: '健康' },
};

// ── 多维命理计算维度 ──────────────────────────────────────────

/** 地支五行 */
const DZ_WUXING: Record<string, string> = {
  '子': '水', '丑': '土', '寅': '木', '卯': '木',
  '辰': '土', '巳': '火', '午': '火', '未': '土',
  '申': '金', '酉': '金', '戌': '土', '亥': '水',
};

/** 六合 */
const LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子', '寅': '亥', '卯': '戌', '辰': '酉',
  '巳': '申', '午': '未', '未': '午', '申': '巳', '酉': '辰',
  '戌': '卯', '亥': '寅',
};

/** 三合（月支需在列表中） */
const SAN_HE: Record<string, string[]> = {
  '申': ['子', '辰'], '子': ['申', '辰'], '辰': ['申', '子'],
  '亥': ['卯', '未'], '卯': ['亥', '未'], '未': ['亥', '卯'],
  '寅': ['午', '戌'], '午': ['寅', '戌'], '戌': ['寅', '午'],
  '巳': ['酉', '丑'], '酉': ['巳', '丑'], '丑': ['巳', '酉'],
};

/** 六冲 */
const LIU_CHONG: Record<string, string> = {
  '子': '午', '丑': '未', '寅': '申', '卯': '酉',
  '辰': '戌', '巳': '亥', '午': '子', '未': '丑',
  '申': '寅', '酉': '卯', '戌': '辰', '亥': '巳',
};

/** 六害 */
const LIU_HAI: Record<string, string> = {
  '子': '未', '丑': '午', '寅': '巳', '卯': '辰',
  '辰': '卯', '巳': '寅', '午': '丑', '未': '子',
  '申': '亥', '酉': '戌', '戌': '酉', '亥': '申',
};

/** 天干五行 */
const GAN_WUXING: Record<string, string> = {
  '甲': '木', '乙': '木', '丙': '火', '丁': '火',
  '戊': '土', '己': '土', '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

/** 天干阴阳 */
const GAN_YY: Record<string, string> = {
  '甲': '阳', '乙': '阴', '丙': '阳', '丁': '阴',
  '戊': '阳', '己': '阴', '庚': '阳', '辛': '阴',
  '壬': '阳', '癸': '阴',
};

/** 五行相生：生我者 */
const WX_SHENG_WO: Record<string, string> = { '木': '水', '火': '木', '土': '火', '金': '土', '水': '金' };
/** 五行相克：克我者 */
const WX_KE_WO: Record<string, string> = { '木': '金', '火': '水', '土': '木', '金': '火', '水': '土' };

/** 计算十神：日天干 vs 当天干 */
function getTenGod(dmGan: string, dayGan: string): string {
  if (dmGan === dayGan) return '比肩';
  const dmWx = GAN_WUXING[dmGan], dgWx = GAN_WUXING[dayGan];
  const sameYy = GAN_YY[dmGan] === GAN_YY[dayGan];
  if (dmWx === dgWx) return '劫财';
  if (WX_SHENG_WO[dmWx] === dgWx) return sameYy ? '偏印' : '正印';
  if (WX_SHENG_WO[dgWx] === dmWx) return sameYy ? '食神' : '伤官';
  if (WX_KE_WO[dmWx] === dgWx) return sameYy ? '七杀' : '正官';
  if (WX_KE_WO[dgWx] === dmWx) return sameYy ? '偏财' : '正财';
  return '—';
}

/** 神煞——根据日期核对简易黄历 */
function getDayStarName(dz: string): string {
  const stars: Record<string, string> = {
    '子': '文昌', '丑': '天厄', '寅': '驿马', '卯': '桃花',
    '辰': '华盖', '巳': '福德', '午': '天喜', '未': '天乙',
    '申': '天厨', '酉': '金匮', '戌': '空亡', '亥': '太极',
  };
  return stars[dz] || '—';
}

function generateDailyFortune(baziData: any, dayGanzhi: string): {
  scores: Record<FortuneCategory, { score: number; level: string; desc: string }>;
  yiList: string[];
  jiList: string[];
  advice: string;
} {
  const now = new Date();
  const h = now.getHours();
  const isEvening = h >= 17 || h < 5;

  // ── 输入数据 ──
  const baseScore = baziData?.strength?.strengthScore || 50;
  const yongShen: string[] = baziData?.usefulGod?.yongShen || [];
  const jiShen: string[] = baziData?.usefulGod?.jiShen || [];
  const percentages = baziData?.elementBalance?.percentage || {};
  const dayMaster = baziData?.dayMaster || '甲';
  const monthBranch: string | undefined = baziData?.pillars?.month?.earthlyBranch;

  const gan = dayGanzhi[0];
  const zhi = dayGanzhi[1];
  const ganWx = GAN_WUXING[gan] || '土';
  const zhiWx = DZ_WUXING[zhi] || '土';

  // ── 维度①：天干用神 ──
  const isGanLucky = yongShen.includes(ganWx);
  const isGanBad = jiShen.includes(ganWx);

  // ── 维度②：地支用神 ──
  const isZhiLucky = yongShen.includes(zhiWx);
  const isZhiBad = jiShen.includes(zhiWx);

  // ── 维度③：地支与月支关系 ──
  let branchRelation = 0;
  let branchTag = '';
  if (monthBranch) {
    if (LIU_HE[zhi] === monthBranch) { branchRelation = 10; branchTag = '六合'; }
    else if (SAN_HE[zhi]?.includes(monthBranch)) { branchRelation = 6; branchTag = '三合'; }
    else if (LIU_CHONG[zhi] === monthBranch) { branchRelation = -12; branchTag = '六冲'; }
    else if (LIU_HAI[zhi] === monthBranch) { branchRelation = -8; branchTag = '六害'; }
  }

  // ── 维度④：十神 ──
  const tenGod = getTenGod(dayMaster, gan);
  const TEN_GOD_SCORE: Record<string, number> = {
    '正官': 8, '七杀': -3, '正财': 10, '偏财': 7,
    '正印': 8, '偏印': 5, '比肩': 0, '劫财': -5,
    '食神': 6, '伤官': -2,
  };
  const tenGodAdj = TEN_GOD_SCORE[tenGod] || 0;

  // ── 维度⑤：神煞 ──
  const starName = getDayStarName(zhi);
  const STAR_SCORE: Record<string, number> = {
    '文昌': 8, '天乙': 8, '天喜': 10, '福德': 6,
    '金匮': 7, '太极': 5, '天厨': 4, '驿马': 3,
    '桃花': 2, '华盖': 0, '天厄': -5, '空亡': -8,
  };
  const starAdj = STAR_SCORE[starName] || 0;

  // ── 计算总分 ──
  const adjustment = (isGanLucky ? 12 : isGanBad ? -10 : 0)
    + (isZhiLucky ? 8 : isZhiBad ? -6 : 0)
    + branchRelation
    + tenGodAdj
    + starAdj;

  const overallScore = Math.min(95, Math.max(15, 50 + adjustment));

  // ── 分项运势 ──
  const s = percentages;
  const getLevel = (n: number) => n >= 80 ? '大吉' : n >= 65 ? '吉' : n >= 50 ? '中平' : n >= 35 ? '小凶' : '大凶';

  const tenGodCareers: Record<string, number> = { '正官': 15, '七杀': 8, '正财': 10, '偏财': 5, '正印': 8, '偏印': 3, '食神': 5, '伤官': 0, '比肩': 3, '劫财': -3 };
  const careerAdj = (isGanLucky ? 12 : 0) + (isZhiLucky ? 5 : 0) + branchRelation / 2 + (tenGodCareers[tenGod] || 0) + starAdj / 2;
  const careerScore = Math.min(95, Math.max(15, 50 + careerAdj));

  const wealthAdj = (isZhiLucky ? 10 : 0) + (isGanLucky ? 5 : 0) + (['正财', '偏财'].includes(tenGod) ? 12 : 0) + (s['金'] || 0) / 5 + (s['水'] || 0) / 6 + (isEvening ? 5 : -2);
  const wealthScore = Math.min(95, Math.max(15, 45 + wealthAdj));

  const loveAdj = (['比肩', '劫财'].includes(tenGod) ? -5 : ['食神', '伤官'].includes(tenGod) ? 3 : ['正官'].includes(tenGod) ? 8 : ['正财', '偏财'].includes(tenGod) ? 6 : 0) + branchRelation / 2 + (s['木'] || 0) / 5 + (s['火'] || 0) / 6;
  const loveScore = Math.min(95, Math.max(15, 50 + loveAdj));

  const healthAdj = (['食神', '伤官'].includes(tenGod) ? 8 : ['正印', '偏印'].includes(tenGod) ? 6 : ['七杀', '劫财'].includes(tenGod) ? -5 : 0) + (['木'].includes(ganWx) ? -3 : 0) + starAdj / 2;
  const healthScore = Math.min(95, Math.max(15, 55 + healthAdj));

  const scores: Record<FortuneCategory, { score: number; level: string; desc: string }> = {
    overall: { score: overallScore, level: '', desc: `日主${dayMaster} · ${ganWx}${ganWx}日 · ${tenGod} · ${starName}` },
    career:  { score: careerScore,  level: '', desc: branchRelation > 0 ? '月日相合，事业顺遂' : branchRelation < 0 ? '月日冲克，宜守不宜攻' : isGanLucky ? '天干得用，利决策' : '天干失用，稳扎稳打' },
    wealth:  { score: wealthScore,  level: '', desc: isEvening ? '晚间财星较旺，偏财可期' : '正财为主，量入为出' },
    love:    { score: loveScore,    level: '', desc: ['比肩', '劫财'].includes(tenGod) ? '比劫日，宜增进感情沟通' : ['正官'].includes(tenGod) ? '官星日，感情关系和谐' : ['桃花'].includes(starName) ? '桃花日，异性缘佳' : '顺其自然，多些陪伴' },
    health:  { score: healthScore,  level: '', desc: `注意${ganWx === '火' ? '心脑血管' : ganWx === '水' ? '肾脏泌尿' : ganWx === '木' ? '肝胆' : ganWx === '金' ? '呼吸系统' : '脾胃'}保养` },
  };
  scores.overall.level = getLevel(overallScore);
  scores.career.level = getLevel(careerScore);
  scores.wealth.level = getLevel(wealthScore);
  scores.love.level = getLevel(loveScore);
  scores.health.level = getLevel(healthScore);

  // ── 宜忌生成（多维动态） ──
  const yiPool: string[] = [];
  const jiPool: string[] = [];

  // 天干用神 → 宜决策/向上
  if (isGanLucky) yiPool.push('决策签约', '拜访贵人', '学习进修', '开张启市');
  else yiPool.push('整理内务', '静心修养', '梳理计划');

  // 地支用神 → 宜出行/社交
  if (isZhiLucky) yiPool.push('社交聚会', '出行洽谈');
  else yiPool.push('减少外出', '独处内省');

  // 地支合 → 宜合作 / 冲 → 忌争执
  if (branchRelation > 0) { yiPool.push('团队协作', '合作共赢'); }
  if (branchRelation < -5) { jiPool.push('与人争执', '重大签约'); }

  // 十神宜忌
  const tenGodYi: Record<string, string[]> = {
    '正官': ['按部就班', '接受考核'], '正财': ['财务规划', '稳健投资'],
    '偏财': ['拓展渠道', '小额试水'], '正印': ['学习充电', '求教长辈'],
    '食神': ['创意发挥', '享受生活'], '伤官': ['表达见解', '艺术创作'],
    '七杀': ['攻坚克难', '运动健身'], '比肩': ['朋友相聚', '团队活动'],
    '劫财': ['分享资源', '合作协商'],
  };
  const tenGodJi: Record<string, string[]> = {
    '七杀': ['冲动决策', '强行推进'], '劫财': ['过度投资', '轻信他人'],
    '伤官': ['口舌是非', '顶撞上级'],
  };
  if (tenGodYi[tenGod]) yiPool.push(...tenGodYi[tenGod]);
  if (tenGodJi[tenGod]) jiPool.push(...tenGodJi[tenGod]);

  // 神煞宜忌
  if (starName === '桃花') { yiPool.push('浪漫约会', '形象提升'); jiPool.push('轻率承诺'); }
  if (starName === '驿马') { yiPool.push('短途出行', '运动锻炼'); jiPool.push('冲动远行'); }
  if (starName === '文昌') { yiPool.push('考试面试', '文书工作'); }
  if (starName === '天喜') { yiPool.push('庆典活动', '表白求婚'); }
  if (starName === '空亡') { jiPool.push('重要决策', '开始新项目'); }

  // 通用宜忌
  yiPool.push(isEvening ? '酉时（17-19点）行要事' : '午时（11-13点）行要事');
  yiPool.push(`面向${yongShen.length ? ['东', '南', '西', '北', '中'][['木', '火', '金', '水', '土'].indexOf(yongShen[0])] || '南' : '南'}方工作`);
  jiPool.push('过度消费', '熬夜');

  // 去重
  const unique = (a: string[]) => [...new Set(a)];

  // ── AI改运建议 ──
  const relationDesc = branchRelation > 0 ? `，月日${branchTag}，贵人运佳` : branchRelation < 0 ? `，月日${branchTag}，需谨慎行事` : '';
  const advicePiece =
    `今日为【${gan}${zhi}日】${ganWx}${ganWx}，十神${tenGod}，神煞「${starName}」${starAdj > 0 ? '吉' : starAdj < 0 ? '凶' : '平'}。` +
    `用神【${yongShen.join('、') || '—'}】` +
    `${isGanLucky ? `，天干${ganWx}得用` : isGanBad ? `，天干${ganWx}为忌` : ''}` +
    `${isZhiLucky ? `，地支${zhiWx}相助` : ''}` +
    `${relationDesc}。` +
    `当前${getCurrentShichen().name}，建议${isEvening ? '回顾今日、规划明日' : '集中精力处理要务'}。`;

  return {
    scores,
    yiList: unique(yiPool).slice(0, 5),
    jiList: unique(jiPool).slice(0, 4),
    advice: advicePiece,
  };
}

export default function FortunePage() {
  const [baziData, setBaziData] = useState<any>(null);
  const [activeCategory, setActiveCategory] = useState<FortuneCategory>('overall');
  const [clientDate, setClientDate] = useState<Date | null>(null);

  useEffect(() => {
    // 确保客户端日期（避免 SSR 锁定服务端时间）
    setClientDate(new Date());
    // 读取排盘数据
    const stored = sessionStorage.getItem('dzs_bazi_result');
    if (stored) {
      try { setBaziData(JSON.parse(stored)); } catch {}
    }
  }, []);

  if (!clientDate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0] flex items-center justify-center">
        <div className="text-[#64748b] text-sm">加载中...</div>
      </div>
    );
  }

  const dayGanzhi = getDayGanzhi(clientDate);
  const shichen = getCurrentShichen();
  const fortune = generateDailyFortune(baziData, dayGanzhi.full);
  const currentScore = fortune.scores[activeCategory];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0]">
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => window.history.back()} className="text-[#94a3b8] hover:text-[#f59e0b] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-sm font-semibold">每日运势</h1>
          <span className="text-[10px] text-[#64748b] ml-auto">
            {clientDate.getFullYear()}年{clientDate.getMonth() + 1}月{clientDate.getDate()}日
          </span>
        </div>
      </header>

      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#1a2332] border border-[#1e293b] p-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-lg font-bold text-[#f59e0b]">{dayGanzhi.full}日</div>
              <div className="text-xs text-[#64748b] mt-1">
                · {shichen.name}
              </div>
            </div>
            <div className="text-right">
              {baziData ? (
                <div className="text-xs text-[#94a3b8]">
                  日主{baziData.dayMaster}
                  <span className={`ml-1 ${baziData.strength?.bodyStrength === '身强' ? 'text-[#2ECC71]' : 'text-[#f59e0b]'}`}>
                    · {baziData.strength?.bodyStrength || ''}
                  </span>
                </div>
              ) : (
                <div className="text-xs text-[#64748b]">未排盘</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-6 text-center">
          <div className="relative w-28 h-28 mx-auto mb-3">
            <svg viewBox="0 0 120 120" className="w-28 h-28 -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="6" />
              <circle cx="60" cy="60" r="52" fill="none" stroke="#f59e0b" strokeWidth="6"
                strokeDasharray={`${(fortune.scores[activeCategory]?.score / 100) * 327} 327`}
                strokeLinecap="round" className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-2xl font-bold text-[#f59e0b]">
                {fortune.scores[activeCategory]?.score || 0}
              </div>
              <div className="text-[10px] text-[#64748b]">{fortune.scores[activeCategory]?.level || ''}</div>
            </div>
          </div>
          <div className="text-sm font-medium text-[#e2e8f0]">
            {FORTUNE_DESCRIPTIONS[activeCategory]?.text || '总运'}
          </div>
          <div className="text-xs text-[#64748b] mt-1">
            {fortune.scores[activeCategory]?.desc || ''}
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(Object.entries(FORTUNE_DESCRIPTIONS) as [FortuneCategory, { emoji: string; text: string }][]).map(([key, val]) => {
            const score = fortune.scores[key]?.score || 0;
            const level = fortune.scores[key]?.level || '';
            const isActive = key === activeCategory;
            const color = level === '大吉' || level === '吉' ? '#2ECC71' : level === '中平' ? '#f59e0b' : '#E74C3C';
            return (
              <button key={key} onClick={() => setActiveCategory(key)}
                className={`rounded-xl py-2 text-center border transition-all ${isActive ? 'bg-[#f59e0b]/10 border-[#f59e0b]/20' : 'bg-[#1a2332] border-[#2a3a4e]'}`}>
                <div className="text-lg">{val.emoji}</div>
                <div className="text-[10px] text-[#64748b]">{val.text}</div>
                <div className="text-xs font-bold mt-0.5" style={{ color }}>{score}</div>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
            <h3 className="text-xs font-semibold mb-3 text-[#2ECC71]">宜</h3>
            <div className="space-y-2">
              {fortune.yiList.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#2ECC71] shrink-0">✅</span>
                  <span className="text-[#e2e8f0]">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
            <h3 className="text-xs font-semibold mb-3 text-[#E74C3C]">忌</h3>
            <div className="space-y-2">
              {fortune.jiList.map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-[#E74C3C] shrink-0">❌</span>
                  <span className="text-[#e2e8f0]">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#1a2332] border border-[#f59e0b]/10 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-[#f59e0b]" />
            <h3 className="text-xs font-semibold text-[#f59e0b]">AI改运建议</h3>
          </div>
          <p className="text-sm text-[#e2e8f0] leading-relaxed">{fortune.advice}</p>
          <div className="mt-2 text-xs text-[#64748b]">
            当前时辰：{shichen.name}（{shichen.start}-{shichen.end}）
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-[#4a5a6e]">
            {baziData ? '基于您的八字排盘结果分析' : '排盘后运势分析更精准'}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
