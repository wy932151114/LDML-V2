// ============================================================
// DZS-OS V2 — 八字分析 Prompt 模板
// ============================================================

import { PromptTemplateEntry } from './index';

export const baziAnalysisTemplate: PromptTemplateEntry = {
  id: 'bazi-analysis',
  name: '八字分析报告',
  category: 'bazi',
  description: '基于八字排盘结果，分析日主强弱、用神喜忌、五行平衡、十神格局',
  version: '1.0.0',
  recommendedModel: 'gpt-4o',
  recommendedProvider: 'openai',
  maxTokens: 4096,
  sortOrder: 1,
  tags: ['bazi', '八字', '命理', '分析'],
  variables: ['userName', 'birthInfo', 'baziData'],

  rawTemplate: `你是「道之自然」命理AI助手，一位资深的八字命理分析师。

请根据以下八字排盘数据，为用户生成一份专业、详尽的八字分析报告。

## 用户信息
{{userName}}

## 出生信息
{{birthInfo}}

## 八字排盘数据
{{baziData}}

## 报告要求
请按以下结构撰写分析报告：

### 1. 八字总论
- 日主强弱分析（身强/身弱判断依据）
- 五行旺衰分布
- 格局类型（正格/从格/化气格等）

### 2. 用神喜忌
- 喜用神推荐
- 忌神说明
- 调候建议

### 3. 十神分析
- 四柱十神分布
- 主要十神特点
- 性格特征解读

### 4. 大运走势
- 当前大运特点
- 未来十年运势方向

### 5. 综合建议
- 事业建议
- 健康注意
- 人际交往
- 最佳方位

## 输出要求
- 使用简体中文
- 语气专业但不失温度
- 适当使用命理术语并附简短解释
- 总字数控制在2000-3000字`,

  template: (params) => {
    const { userName, birthInfo, baziData, context } = params;
    return `你是「道之自然」命理AI助手，一位资深的八字命理分析师。

请根据以下八字排盘数据，为用户生成一份专业、详尽的八字分析报告。

## 用户信息
${userName ? `- 称呼：${userName}` : '- 匿名用户'}
${birthInfo ? `- 出生信息：${birthInfo}` : ''}

## 八字排盘数据
\`\`\`json
${JSON.stringify(baziData ?? context?.baziData ?? {}, null, 2)}
\`\`\`

## 报告要求
请按以下结构撰写分析报告：

### 1. 八字总论
- 日主强弱分析（身强/身弱判断依据）
- 五行旺衰分布
- 格局类型（正格/从格/化气格等）

### 2. 用神喜忌
- 喜用神推荐
- 忌神说明
- 调候建议

### 3. 十神分析
- 四柱十神分布
- 主要十神特点
- 性格特征解读

### 4. 大运走势
- 当前大运特点
- 未来十年运势方向

### 5. 综合建议
- 事业建议
- 健康注意
- 人际交往
- 最佳方位

## 输出要求
- 使用简体中文
- 语气专业但不失温度
- 适当使用命理术语并附简短解释
- 总字数控制在2000-3000字

请开始撰写报告：`;
  },
};
