// ============================================================
// DZS-OS V2 — 自定义 Prompt 模板
// ============================================================

import { PromptTemplateEntry } from './index';

export const customTemplate: PromptTemplateEntry = {
  id: 'custom',
  name: '自定义提示词',
  category: 'custom',
  description: '用户自定义编写的 AI 提示词，可自由设定角色、内容和输出格式',
  version: '1.0.0',
  recommendedModel: 'gpt-4o',
  recommendedProvider: 'openai',
  maxTokens: 4096,
  sortOrder: 8,
  tags: ['custom', '自定义', '灵活'],
  variables: ['userPrompt', 'userName', 'baziData'],

  rawTemplate: `{{userPrompt}}

## 用户信息
{{userName}}

## 参考数据
{{baziData}}

## 注意事项
- 请严格按照用户设定的角色和语气进行回答
- 如有参考数据，请基于数据进行分析
- 如无相关数据，请据你所知回答
- 保持礼貌和专业`,

  template: (params) => {
    const { userPrompt, userName, baziData, context } = params;
    const customPrompt = userPrompt ?? context?.userPrompt ?? '';
    const name = userName ?? context?.userName;
    const data = baziData ?? context?.baziData;

    // 如果用户提供了自定义 prompt，优先使用
    if (customPrompt) {
      let result = customPrompt;

      // 仅在用户 prompt 没有明确拒绝附加数据时提供参考数据
      if (data && !customPrompt.toLowerCase().includes('no data')) {
        result += `\n\n## 参考数据\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``;
      }

      if (name) {
        result += `\n\n## 用户信息\n称呼：${name}`;
      }

      result += `\n\n## 注意事项\n- 请严格按照用户设定的角色和语气进行回答\n- 如有参考数据，请基于数据进行分析\n- 如无相关数据，请据你所知回答\n- 保持礼貌和专业`;

      return result;
    }

    // 默认回退：引导用户编写 prompt
    return `你是「道之自然」AI助手。

用户正在使用自定义提示词功能。请根据以下信息，以用户指定的角色和风格进行回答。

${name ? `- 用户称呼：${name}` : ''}
${data ? `\n## 参考数据\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`` : ''}

请以专业、友好的态度回应用户。由于用户未提供自定义提示词，请主动引导用户描述他们希望 AI 扮演的角色和回答风格。`;
  },
};
