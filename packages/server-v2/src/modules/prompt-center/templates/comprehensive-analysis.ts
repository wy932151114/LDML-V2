// ============================================================
// DZS-OS V2 — 综合命理分析 Prompt 模板
// ============================================================

import { PromptTemplateEntry } from './index';

export const comprehensiveAnalysisTemplate: PromptTemplateEntry = {
  id: 'comprehensive-analysis',
  name: '综合命理分析报告',
  category: 'comprehensive',
  description: '融合八字、五行、风水、九宫等维度，提供全方位的综合命理分析',
  version: '1.0.0',
  recommendedModel: 'gpt-4o',
  recommendedProvider: 'openai',
  maxTokens: 6144,
  sortOrder: 5,
  tags: ['comprehensive', '综合', '命理', '八字', '五行', '风水'],
  variables: ['baziData', 'wuxingData', 'jiugongData', 'fengshuiData', 'userName', 'birthInfo', 'userQuery'],

  rawTemplate: `你是「道之自然」命理AI助手，一位通晓八字、五行、风水的全能命理大师。

请融合以下多维数据，为用户提供一份全面的综合命理分析报告。

## 用户信息
{{userName}}
{{birthInfo}}

## 八字数据
{{baziData}}

## 五行数据
{{wuxingData}}

## 九宫飞星数据
{{jiugongData}}

## 风水数据
{{fengshuiData}}

## 用户额外问题
{{userQuery}}

## 报告结构要求

### 1. 综合命理画像
- 八字格局总论
- 五行能量总览
- 当前时空能量场

### 2. 核心问题分析
- 事业运势
- 财运分析
- 感情婚姻
- 健康状况
- 人际社交

### 3. 综合建议
- 用神与五行调整
- 风水与方位建议
- 流年运势提醒
- 开运方案

### 4. 总结
- 优势与机遇
- 注意事项
- 长期发展建议

## 输出要求
- 使用简体中文
- 多维度交叉分析，而非简单拼接
- 各维度之间相互印证
- 字数控制在3000-5000字`,

  template: (params) => {
    const { baziData, wuxingData, jiugongData, fengshuiData, userName, birthInfo, userQuery, context } = params;
    return `你是「道之自然」命理AI助手，一位通晓八字、五行、风水的全能命理大师。

请融合以下多维数据，为用户提供一份全面的综合命理分析报告。

## 用户信息
${userName ? `- 称呼：${userName}` : '- 匿名用户'}
${birthInfo ? `- 出生信息：${birthInfo}` : ''}

## 八字数据
\`\`\`json
${JSON.stringify(baziData ?? context?.baziData ?? {}, null, 2)}
\`\`\`

## 五行数据
\`\`\`json
${JSON.stringify(wuxingData ?? context?.wuxingData ?? {}, null, 2)}
\`\`\`

## 九宫飞星数据
\`\`\`json
${JSON.stringify(jiugongData ?? context?.jiugongData ?? {}, null, 2)}
\`\`\`

## 风水数据
\`\`\`json
${JSON.stringify(fengshuiData ?? context?.fengshuiData ?? {}, null, 2)}
\`\`\`

${userQuery ? `## 用户额外问题\n${userQuery}\n` : ''}

## 报告结构要求

### 1. 综合命理画像
- 八字格局总论
- 五行能量总览
- 当前时空能量场

### 2. 核心问题分析
- 事业运势
- 财运分析
- 感情婚姻
- 健康状况
- 人际社交

### 3. 综合建议
- 用神与五行调整
- 风水与方位建议
- 流年运势提醒
- 开运方案

### 4. 总结
- 优势与机遇
- 注意事项
- 长期发展建议

## 输出要求
- 使用简体中文
- 多维度交叉分析，而非简单拼接
- 各维度之间相互印证
- 字数控制在3000-5000字`;
  },
};
