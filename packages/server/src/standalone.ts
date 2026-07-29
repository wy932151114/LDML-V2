// ============================================================
// DZS-OS 快速启动入口（开发调试用，无需MongoDB）
// 直接实例化引擎和controller，不经过NestJS DI
// ============================================================

import express from 'express';
import cors from 'cors';
import { BaziEngine } from './engines/bazi-engine/bazi.engine';
import { ValidationCenter } from './validation-center/validation-center';
import { EnergyBus } from './kernel/energy/energy-bus';

const app = express();
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:3333', 'http://172.31.138.38:3333'],
}));
app.use(express.json({ limit: '10mb' }));

const baziEngine = new BaziEngine();
const validationCenter = new ValidationCenter();
const energyBus = new EnergyBus();

// ===== POST /api/v1/bazi/calculate =====
app.post('/api/v1/bazi/calculate', (req, res) => {
  try {
    const { year, month, day, hour, minute, gender, longitude, useTrueSolar } = req.body;
    
    const validation = validationCenter.validateAll({ longitude });
    if (validation.summary.fatalCount > 0) {
      return res.status(400).json({ message: '验证失败', errors: validation.results });
    }

    const result = baziEngine.calculate({
      year, month, day, hour, minute,
      gender: gender || '男',
      longitude: longitude || 120,
      useTrueSolar: useTrueSolar ?? false,
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ===== POST /api/v1/energy/analyze =====
app.post('/api/v1/energy/analyze', (req, res) => {
  try {
    const scores = req.body.baziResult?.elementBalance?.scores || {};
    const state = energyBus.calculateFinalState({ baziScores: scores });

    const elements = ['wood', 'fire', 'earth', 'metal', 'water'];
    const energyField: any = {};
    for (const el of elements) {
      energyField[el] = {
        base: scores[el] || 0,
        seasonalBoost: 0,
        finalScore: state.energies[el as keyof typeof state.energies],
        finalPercent: 0,
      };
    }

    res.json({
      energyField,
      totalEnergy: Object.values(state.energies).reduce((a, b) => a + b, 0),
      dominantElement: state.dominantElement,
      balanceState: state.stability > 65 ? '平衡' : state.stability > 40 ? '偏旺' : '偏弱',
      stability: state.stability,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message });
  }
});

// ===== POST /api/v1/nine-palace/calculate =====
app.post('/api/v1/nine-palace/calculate', (req, res) => {
  const { year, month, day } = req.body;
  const ny = year || new Date().getFullYear();
  const nm = month || new Date().getMonth() + 1;
  const nd = day || new Date().getDate();

  // 九宫模拟数据
  const palaceInfo = [
    { position: 1, name: '坎', direction: '北', wuxing: '水', star: [4, 5, 6, 7, 8, 9, 1, 2, 3] },
    { position: 2, name: '坤', direction: '西南', wuxing: '土', star: [5, 6, 7, 8, 9, 1, 2, 3, 4] },
    { position: 3, name: '震', direction: '东', wuxing: '木', star: [6, 7, 8, 9, 1, 2, 3, 4, 5] },
    { position: 4, name: '巽', direction: '东南', wuxing: '木', star: [7, 8, 9, 1, 2, 3, 4, 5, 6] },
    { position: 5, name: '中', direction: '中', wuxing: '土', star: [8, 9, 1, 2, 3, 4, 5, 6, 7] },
    { position: 6, name: '乾', direction: '西北', wuxing: '金', star: [9, 1, 2, 3, 4, 5, 6, 7, 8] },
    { position: 7, name: '兑', direction: '西', wuxing: '金', star: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
    { position: 8, name: '艮', direction: '东北', wuxing: '土', star: [2, 3, 4, 5, 6, 7, 8, 9, 1] },
    { position: 9, name: '离', direction: '南', wuxing: '火', star: [3, 4, 5, 6, 7, 8, 9, 1, 2] },
  ];

  const starNames: Record<number, { name: string; type: string }> = {
    1: { name: '贪狼', type: '大吉' }, 2: { name: '巨门', type: '中性' }, 3: { name: '禄存', type: '凶' },
    4: { name: '文曲', type: '中性' }, 5: { name: '廉贞', type: '凶' }, 6: { name: '武曲', type: '吉' },
    7: { name: '破军', type: '大凶' }, 8: { name: '左辅', type: '吉' }, 9: { name: '右弼', type: '中性' },
  };

  const yearStar = ((ny - 1984) % 9 + 7) % 9 + 1;
  const monthStar = ((nm + 5) % 9) + 1;
  
  const palaces = palaceInfo.map((p, i) => {
    const starNum = p.star[(yearStar - 1) % 9];
    const info = starNames[starNum] || { name: '未知', type: '中性' };
    return {
      position: p.position,
      name: p.name,
      direction: p.direction,
      star: { number: starNum, name: info.name, type: info.type, wuxing: p.wuxing },
      energy: starNum >= 8 ? 90 : starNum >= 6 ? 70 : starNum <= 2 ? 30 : 50,
      rating: starNum >= 8 ? '大吉' : starNum >= 6 ? '吉' : starNum <= 2 ? '凶' : '平',
      suitable: [],
      avoid: [],
    };
  });

  const sorted = [...palaces].sort((a, b) => b.energy - a.energy);

  res.json({
    palaces,
    summary: {
      bestDirection: `${sorted[0].direction}（${sorted[0].name}宫）`,
      worstDirection: `${sorted[sorted.length - 1].direction}（${sorted[sorted.length - 1].name}宫）`,
      auspiciousStars: palaces.filter(p => p.star.type === '吉' || p.star.type === '大吉').map(p => p.star.name),
      inauspiciousStars: palaces.filter(p => p.star.type === '凶' || p.star.type === '大凶').map(p => p.star.name),
    },
    conflicts: [
      { type: '五黄', palaces: ['中宫'], severity: '严重', description: '流年五黄入中，宜静不宜动', remedy: '宜用金属化煞' },
    ],
  });
});

// ===== POST /api/v1/ai/generate =====
app.post('/api/v1/ai/generate', (req, res) => {
  const { type, prompt, systemPrompt, baziData } = req.body;
  
  const dm = baziData?.dayMaster || '己';
  const ys = baziData?.usefulGod?.yongShen?.join('/') || '火/土';
  const js = baziData?.usefulGod?.jiShen?.join('/') || '水';
  const st = baziData?.strength?.bodyStrength || '中和';
  const pct = baziData?.elementBalance?.percentage || {};

  const output = `【${type === 'daily' ? '今日运势' : '命理分析'}报告】

日主${dm}${st}

今日整体运势：★★★☆☆
五行分布：木${pct.木 || 15}% 火${pct.火 || 25}% 土${pct.土 || 22}% 金${pct.金 || 20}% 水${pct.水 || 18}%

✦ 最佳时辰：午时（11:00-13:00）
✦ 最佳方位：西方
✦ 用神：${ys}
✦ 忌神：${js}

【改命建议】
① 宜穿${ys}色系衣物增强用神能量
② 午时面向西方进行重要决策
③ 避免${js}色系物品
④ 可在办公桌${st === '身弱' ? '西' : '东'}侧放置金属摆件

—— 道之自然AI命理系统 生成`;

  res.json({
    output,
    validation: { passed: true, errors: [], warnings: [] },
    tokenUsage: { prompt: 1250, completion: 380, total: 1630 },
    riskCheck: { passed: true, warnings: [] },
  });
});

// ===== POST /api/v1/cv/analyze =====
app.post('/api/v1/cv/analyze', (req, res) => {
  res.json({
    elements: [
      { type: '床', x: 0.1, y: 0.3, width: 0.35, height: 0.2, confidence: 0.95, wuxing: '木' },
      { type: '门', x: 0.7, y: 0.2, width: 0.12, height: 0.25, confidence: 0.92, wuxing: '火' },
      { type: '镜子', x: 0.6, y: 0.5, width: 0.15, height: 0.18, confidence: 0.88, wuxing: '水' },
    ],
    palaceMapping: {
      '坎（北）': [{ type: '床', x: 0.5, y: 0.6 }],
      '坤（西南）': [{ type: '镜子', x: 0.7, y: 0.7 }],
    },
    conflicts: [
      { type: '镜中火煞', description: '镜子正对床尾，反射形成火煞冲击', severity: '中等' },
    ],
    advice: [
      { type: '布局调整', content: '建议将镜子移至东墙或衣柜内侧' },
    ],
  });
});

// ===== GET /api/v1/validation/status =====
app.get('/api/v1/validation/status', (req, res) => {
  res.json({
    passed: true,
    errors: 0,
    warnings: 0,
    lastCheck: new Date().toISOString(),
  });
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
app.listen(port, '0.0.0.0', () => {
  console.log(`🪷 DZS-OS API Server :${port}/api/v1`);
  console.log(`  验证: curl http://localhost:${port}/api/v1/validation/status`);
  console.log(`  前端: http://172.31.138.38:3333`);
});
