// ============================================================
// DZS-OS V2 — AI 自由报告 Prompt 模板
// ============================================================

import { PromptTemplateEntry } from './index';

export const aiReportTemplate: PromptTemplateEntry = {
  id: 'ai-report',
  name: 'AI 自由分析报告',
  category: 'ai-report',
  description: '用户可自由提出命理相关问题，AI 基于已有数据灵活回答',
  version: '1.0.0',
  recommendedModel: 'gpt-4o',
  recommendedProvider: 'openai',
  maxTokens: 4096,
  sortOrder: 6,
  tags: ['ai', '自由', '问答', '灵活'],
  variables: ['userQuery', 'baziData', 'contextData'],

  rawTemplate: `你是「道之自然」命理AI助手，可以回答任何与命理、风水、五行相关的问题。

请根据用户的问题和已有数据，提供专业、准确、有深度的回答。

## 用户问题
{{userQuery}}

## 相关数据
{{baziData}}

## 额外上下文
{{contextData}}

## 回答要求
- 请直接回应用户的问题，不需要套用固定模板
- 基于提供的数据给出专业分析
- 如果数据不足以回答，请明确指出
- 可以引用经典命理理论作为支撑
- 保持客观，避免绝对化表述

请开始回答：`,

  template: (params) => {
    const { userQuery, baziData, contextData, context } = params;
    const extraData = contextData ?? context?.contextData ?? {};
    return `你是「道之自然」命理AI助手，可以回答任何与命理、风水、五行相关的问题。

请根据用户的问题和已有数据，提供专业、准确、有深度的回答。

## 用户问题
${userQuery ?? '请为用户提供命理方面的综合分析。'}

${baziData || Object.keys(extraData).length > 0
  ? `## 相关数据\n\`\`\`json\n${JSON.stringify(baziData ?? extraData, null, 2)}\n\`\`\``
  : ''}

## 回答要求
- 请直接回应用户的问题，不需要套用固定模板
- 基于提供的数据给出专业分析
- 如果数据不足以回答，请明确指出
- 可以引用经典命理理论作为支撑
- 保持客观，避免绝对化表述

请开始回答：`;
  },
};
