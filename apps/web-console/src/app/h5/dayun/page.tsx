'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import BottomNav from '@/app/h5/_components/BottomNav';

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

function getHeavenlyStemWuxing(gan: string): string {
  const map: Record<string, string> = { '甲': '木', '乙': '木', '丙': '火', '丁': '火', '戊': '土', '己': '土', '庚': '金', '辛': '金', '壬': '水', '癸': '水' };
  return map[gan] || '';
}

function getShiShen(dayMaster: string, gan: string): string {
  const dmIdx = TIAN_GAN.indexOf(dayMaster);
  const gIdx = TIAN_GAN.indexOf(gan);
  if (dmIdx === -1 || gIdx === -1) return '';
  const diff = (gIdx - dmIdx + 10) % 10;
  const male: Record<number, string> = { 0: '比肩', 1: '劫财', 2: '食神', 3: '伤官', 4: '偏财', 5: '正财', 6: '偏官', 7: '正官', 8: '偏印', 9: '正印' };
  return male[diff] || '';
}

function generateDayun(baziData: any, birthYear: number, birthMonth: number): Array<{
  startAge: number; endAge: number; ganzhi: string; heavenly: string; earthly: string;
  wuxing: string; shishen: string; score: number; desc: string;
}> {
  if (!baziData) return [];
  const dm = baziData.dayMaster || '甲';
  const gender = baziData.gender || '男';
  const yearGan = baziData.pillars?.year?.heavenlyStem || '甲';
  const yearZhi = baziData.pillars?.year?.earthlyBranch || '子';
  const yongShen = baziData.usefulGod?.yongShen || [];
  const isYearYang = ['甲', '丙', '戊', '庚', '壬'].includes(yearGan);
  const isMale = gender === '男';
  const forward = (isYearYang && isMale) || (!isYearYang && !isMale);
  // 粗略计算起运年龄：根据出生年距离上一个/下一个"节"的天数估算
  // 简化算法：阳男阴女顺排，从生日到下一个节气；阴男阳女逆排，到上一个节气
  // 这里做一个粗略估算，以出生月份为参考
  const roughStartAge = Math.max(1, Math.round((birthMonth - 1) * 0.3));
  const startAge = roughStartAge;
  const dayunList = [];
  for (let i = 0; i < 10; i++) {
    const offset = forward ? i + 1 : -(i + 1);
    const ganIdx = (TIAN_GAN.indexOf(dm) + offset * 1 + 10) % 10;
    const zhiIdx = (DI_ZHI.indexOf(yearZhi) + offset * 1 + 12) % 12;
    const heavenly = TIAN_GAN[ganIdx];
    const earthly = DI_ZHI[zhiIdx];
    const ganzhi = heavenly + earthly;
    const wx = getHeavenlyStemWuxing(heavenly);
    const ss = getShiShen(dm, heavenly);
    const isGood = yongShen.includes(wx);
    const goodDescs = ['运势上扬，机遇增多', '贵人相助，事半功倍', '事业顺遂，财运亨通', '诸事顺利，宜进取'];
    const badDescs = ['运势平缓，宜守不宜攻', '多有波折，需谨慎行事', '阻力较大，耐心等待', '运势低迷，宜韬光养晦'];
    dayunList.push({
      startAge: startAge + i * 10, endAge: startAge + i * 10 + 9,
      ganzhi, heavenly, earthly, wuxing: wx, shishen: ss,
      score: isGood ? 70 + Math.floor(Math.random() * 20) : 30 + Math.floor(Math.random() * 25),
      desc: isGood ? goodDescs[i % 4] : badDescs[i % 4],
    });
  }
  return dayunList;
}

function getCurrentYearGanzhi(): string {
  const now = new Date();
  const year = now.getFullYear();
  return TIAN_GAN[(year - 4) % 10] + DI_ZHI[(year - 4) % 12];
}

export default function DayunPage() {
  const [baziData, setBaziData] = useState<any>(null);
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [birthMonth, setBirthMonth] = useState<number | null>(null);
  useEffect(() => {
    const stored = sessionStorage.getItem('dzs_bazi_result');
    if (stored) { try { setBaziData(JSON.parse(stored)); } catch {} }
    // 读取排盘输入中的出生年月
    const inputStr = sessionStorage.getItem('dzs_bazi_input');
    if (inputStr) {
      try {
        const input = JSON.parse(inputStr);
        if (input.year) setBirthYear(input.year);
        if (input.month) setBirthMonth(input.month);
      } catch {}
    }
  }, []);

  const dayunList = baziData && birthYear
    ? generateDayun(baziData, birthYear, birthMonth || 5)
    : [];
  const currentYearGanzhi = getCurrentYearGanzhi();
  const currentAge = birthYear ? new Date().getFullYear() - birthYear : 0;
  const currentDayun = dayunList.find(d => {
    return currentAge >= d.startAge && currentAge <= d.endAge;
  }) || dayunList[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0e17] via-[#111827] to-[#0a0e17] text-[#e2e8f0]">
      <header className="sticky top-0 z-10 bg-[#0a0e17]/80 backdrop-blur-lg border-b border-[#1e293b]">
        <div className="flex items-center gap-3 px-4 h-12">
          <button onClick={() => window.history.back()} className="text-[#94a3b8] hover:text-[#f59e0b]"><ArrowLeft size={20} /></button>
          <h1 className="text-sm font-semibold">大运流年</h1>
        </div>
      </header>
      <div className="px-4 pt-4 pb-24 space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-[#0f1525] to-[#1a2332] border border-[#f59e0b]/10 p-5">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={16} className="text-[#f59e0b]" />
            <h2 className="text-sm font-semibold text-[#f59e0b]">流年运势</h2>
          </div>
          <div className="text-sm text-[#e2e8f0]">
            当前流年：<strong className="text-[#f59e0b]">{currentYearGanzhi}</strong>
            {currentDayun && ` · ${currentDayun.ganzhi}大运（${currentDayun.startAge}-${currentDayun.endAge}岁）`}
            {currentDayun && ` · ${currentDayun.desc}`}
          </div>
        </div>

        {dayunList.length > 0 && (
          <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e293b]">
              <h2 className="text-sm font-semibold">十年大运</h2>
            </div>
            <div className="divide-y divide-[#1e293b]">
              {dayunList.map((dy, i) => (
                <div key={i} className="flex items-center px-4 py-2.5 text-xs">
                  <div className="w-16 text-[#64748b]">{dy.startAge}-{dy.endAge}岁</div>
                  <div className="w-14 font-bold text-center" style={{ color: dy.score >= 60 ? '#2ECC71' : '#E74C3C' }}>{dy.ganzhi}</div>
                  <div className="w-10 text-center text-[#94a3b8]">{dy.wuxing}</div>
                  <div className="w-14 text-center text-[#64748b]">{dy.shishen}</div>
                  <div className="flex-1 text-right text-[#64748b]">{dy.desc}</div>
                  <div className={`ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold ${dy.score >= 60 ? 'bg-[#2ECC71]/10 text-[#2ECC71]' : 'bg-[#E74C3C]/10 text-[#E74C3C]'}`}>
                    {dy.score >= 60 ? '吉' : '平'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-[#0f1525] border border-[#1e293b] p-4">
          <h3 className="text-xs font-semibold mb-2 text-[#94a3b8]">什么是大运？</h3>
          <p className="text-xs text-[#64748b] leading-relaxed">
            大运是每十年一换的运势周期，反映人生各阶段的走向。起运年龄由出生日到节气的天数决定（3天=1年），十大运覆盖0-99岁。
          </p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
