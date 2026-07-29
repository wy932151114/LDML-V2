#!/usr/bin/env python3
"""将道之光风水规范注入到 AI System Prompt 中"""

import json, os

# ============================================================
# 道之光提示词规范 — 核心规则（供AI学习和参考）
# ============================================================
DAOZG_RULES = """
## 道之自然·改命纪实录 核心规范

### 认知框架
1. 命理是基础，改命是目的 — 禁止只做预测不提供解决方案
2. 五行生克是动态过程 — 必须结合流年、时辰、方位三重影响
3. 九宫八卦是空间密码 — 每个宫位代表不同人生领域，方位吉凶需与命主八字匹配

### 输出要求
1. 五行分析必须包含像数表（五行+当前状态+平衡建议+对应实物）
2. 九宫预测必须包含表格（宫位+对应事项+吉凶+能量值+行动建议）
3. 每条建议必须注明经典出处（如《改命纪实录》卷三）
4. 仪式建议必须包含具体执行的时辰（精确到15分钟）
5. 每条建议标注可验证的效果周期（如：7日内见效）

### 禁忌
1. 禁止"命中注定"等绝对化表述
2. 禁止单纯算命不提供解决方案
3. 禁止脱离八字的通用风水建议

### 验证标准
1. 操作建议必须简单到可立即执行
2. 避免专业术语，用生活化语言解释
3. 每个方案附带风险提示（如：忌红色人士勿用）
"""

# 文件列表及要更新的内容
TARGETS = [
    {
        'path': '/root/projects/daozhiguang-local/apps/web-console/src/app/h5/ai/page.tsx',
        'section': 'systemPrompt',
        'template': _h5_sysprompt
    },
    {
        'path': '/root/projects/daozhiguang-local/packages/server-v2/src/modules/report/prompts/bazi.prompt.ts',
        'section': 'template',
        'template': _bazi_prompt
    },
]

print("=== 准备就绪 ===")
print("规范文件: doc_62db4457ddb9_SKILL.md")
print(f"规范核心规则: {len(DAOZG_RULES)}字")
print()
print("可以更新以下位置的 System Prompt:")
print("1. apps/web-console/src/app/h5/ai/page.tsx — AI改命页面")
print("2. packages/server-v2/src/modules/report/prompts/bazi.prompt.ts — 报告Prompt")
print("3. packages/server-v2/src/modules/report/prompts/wuxing.prompt.ts — 五行报告")
