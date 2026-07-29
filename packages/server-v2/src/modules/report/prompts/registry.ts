// ============================================================
// DZS-OS V2 — 所有 Prompt 注册中心
// ============================================================

import { PromptEntry } from './index';
import { baziPrompt } from './bazi.prompt';
import { wuxingPrompt } from './wuxing.prompt';
import { dailyFortunePrompt } from './daily-fortune.prompt';
import { comprehensivePrompt } from './comprehensive.prompt';
import { jiugongPrompt } from './jiugong.prompt';
import { fengshuiPrompt } from './fengshui.prompt';

/** Prompt Registry — 所有 Prompt 在此注册 */
export class PromptRegistry {
  private static prompts: Map<string, PromptEntry> = new Map();

  static {
    this.register(baziPrompt);        // 八字分析
    this.register(wuxingPrompt);      // 五行分析
    this.register(dailyFortunePrompt); // 每日运势/周运
    this.register(comprehensivePrompt);// AI综合命理/月运/年运/大运流年/企业风水
    this.register(jiugongPrompt);     // 九宫飞星
    this.register(fengshuiPrompt);    // 风水扫描
  }

  private static register(entry: PromptEntry): void {
    this.prompts.set(entry.id, entry);
  }

  static get(id: string): PromptEntry | undefined {
    return this.prompts.get(id);
  }

  static getAll(): PromptEntry[] {
    return Array.from(this.prompts.values());
  }

  static getByType(reportType: string): PromptEntry | undefined {
    const id = `${reportType}-analysis`;
    return this.prompts.get(id);
  }

  static listByCategory(): Record<string, PromptEntry[]> {
    return {
      bazi: [baziPrompt],
      wuxing: [wuxingPrompt],
      daily: [dailyFortunePrompt],
      comprehensive: [comprehensivePrompt],
      jiugong: [jiugongPrompt],
      fengshui: [fengshuiPrompt],
    };
  }
}
