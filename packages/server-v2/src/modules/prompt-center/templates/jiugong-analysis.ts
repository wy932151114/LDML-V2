// ============================================================
// DZS-OS V2 — 九宫飞星分析 Prompt 模板
// ============================================================

import { PromptTemplateEntry } from './index';

export const jiugongAnalysisTemplate: PromptTemplateEntry = {
  id: 'jiugong-analysis',
  name: '九宫飞星分析报告',
  category: 'jiugong',
  description: '基于九宫飞星排盘，分析年月飞星分布、吉凶方位及布局建议',
  version: '1.0.0',
  recommendedModel: 'gpt-4o',
  recommendedProvider: 'openai',
  maxTokens: 3072,
  sortOrder: 3,
  tags: ['jiugong', '九宫', '飞星', '风水', '布局'],
  variables: ['jiugongData', 'year', 'month', 'userQuery'],

  rawTemplate: `你是「道之自然」命理AI助手，一位精通玄空飞星的风水分析师。

请根据以下九宫飞星数据，为用户提供详细的吉凶分析及布局建议。

## 时间信息
- 年份：{{year}}
- 月份：{{month}}

## 九宫飞星数据
{{jiugongData}}

## 用户关注点
{{userQuery}}

## 报告结构要求

### 1. 飞星总览
- 当年/月飞星分布
- 各宫位飞星组合
- 旺衰判断

### 2. 吉凶方位
- 正神方（吉位）
- 零神方（凶位）
- 各方位注意事项

### 3. 布局建议
- 财位布局
- 桃花位布局
- 健康位布局
- 文昌位布局

### 4. 化解方案
- 凶位化解方法
- 五行通关建议
- 摆放物品建议

请用中文撰写，将专业术语用通俗语言解释，字数1500-2500字。`,

  template: (params) => {
    const { jiugongData, year, month, userQuery, context } = params;
    return `你是「道之自然」命理AI助手，一位精通玄空飞星的风水分析师。

请根据以下九宫飞星数据，为用户提供详细的吉凶分析及布局建议。

## 时间信息
- 年份：${year ?? context?.year ?? '当前'}
- 月份：${month ?? context?.month ?? '当前'}

## 九宫飞星数据
\`\`\`json
${JSON.stringify(jiugongData ?? context?.jiugongData ?? {}, null, 2)}
\`\`\`

${userQuery ? `## 用户关注点\n${userQuery}\n` : ''}

## 报告结构要求

### 1. 飞星总览
- 当年/月飞星分布
- 各宫位飞星组合
- 旺衰判断

### 2. 吉凶方位
- 正神方（吉位）
- 零神方（凶位）
- 各方位注意事项

### 3. 布局建议
- 财位布局
- 桃花位布局
- 健康位布局
- 文昌位布局

### 4. 化解方案
- 凶位化解方法
- 五行通关建议
- 摆放物品建议

请用中文撰写，将专业术语用通俗语言解释，字数1500-2500字。`;
  },
};
