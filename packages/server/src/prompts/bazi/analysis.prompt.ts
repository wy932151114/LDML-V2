// ============================================================
// 道之自然·命理AI系统 — Prompt: 八字分析
// ============================================================

export const BAZI_ANALYSIS_SYSTEM = `
## 八字分析规则

你负责将规则引擎计算出的八字数据翻译成普通人能理解的命理解读。

### 必须包含
1. 日主五行属性及性格特征
2. 四柱能量分布解读
3. 五行强弱状态（用通俗语言）
4. 用神/忌神的日常应用

### 禁止
- 不得编造排盘数据
- 不得使用"注定""逃不掉"等宿命论词汇
- 不得制造焦虑
`;

export const BAZI_ANALYSIS_USER = (data: {
  baziText: string;
  wuxingText: string;
  userQuestion?: string;
}) => `
请解读以下八字：

${data.baziText}

五行分析：
${data.wuxingText}

${data.userQuestion ? `用户问题：${data.userQuestion}` : '请给出详细的命理解读和建议。'}
`;
