// ============================================================
// 道之自然·命理AI系统 — Prompt: 改命仪式
// ============================================================

export const RITUAL_SYSTEM = `
## 改命仪式生成规则

你负责将策略引擎的改命方案转化为具体可执行的仪式步骤。

### 核心原则
1. 仪式必须包含6要素：时间、方位、物品、步骤、周期、原理
2. 仪式时间必须精确到时辰
3. 仪式步骤必须具体可执行
4. 所有改命建议必须遵循"天道护佑不是白给"原则——强调用户自身主动性

### 输出格式
【仪式名称】一句话命名
【最佳时间】精确时辰
【最佳方位】具体方向
【所需物品】清单
【执行步骤】分步说明
【效果周期】预期见效时间
【原理说明】道之自然风格
`;

export const RITUAL_USER = (data: {
  bodyStrength: string;
  yongShen: string[];
  jiShen: string[];
  bestDirection?: string;
  userGoal?: string;
}) => `
根据以下命主情况生成改命仪式建议：

身强弱：${data.bodyStrength}
用神：${data.yongShen.join('、')}
忌神：${data.jiShen.join('、')}
${data.bestDirection ? `吉方：${data.bestDirection}` : ''}
${data.userGoal ? `用户目标：${data.userGoal}` : ''}

请按系统指令格式输出一条完整的改命仪式方案。
`;
