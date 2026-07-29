// ============================================================
// 道之自然·命理AI系统 — DailyFortune模块：服务
// 自动生成每日运势（结合八字+五行+九宫）
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JiugongEngine, WuxingEngine, BaziEngine, SolutionEngine } from '../../engines';
import { DailyFortune, BaziResult } from '../../database/schemas';
import { AiService } from '../ai/ai.service';

@Injectable()
export class DailyFortuneService {
  private readonly logger = new Logger(DailyFortuneService.name);

  constructor(
    private readonly jiugongEngine: JiugongEngine,
    private readonly wuxingEngine: WuxingEngine,
    private readonly baziEngine: BaziEngine,
    private readonly solutionEngine: SolutionEngine,
    private readonly aiService: AiService,
    @InjectModel(DailyFortune.name) private fortuneModel: Model<DailyFortune>,
    @InjectModel(BaziResult.name) private baziModel: Model<BaziResult>,
  ) {}

  /**
   * 获取用户今日运势
   * @param userId 用户ID（可选，没有则返回通用运势）
   * @param baziResultId 命盘ID（可选，自动取最新）
   */
  async getTodayFortune(userId?: string, baziResultId?: string) {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    // 如果已缓存，直接返回
    if (userId) {
      const cached = await this.fortuneModel.findOne({ userId, fortuneDate: dateStr }).exec();
      if (cached) return cached;
    }

    let baziResult: any = null;
    let wuxingData: any = null;
    let solution: any = null;

    // 如果有用户八字数据，做个性化运势
    if (baziResultId) {
      const baziDoc = await this.baziModel.findById(baziResultId).exec();
      if (baziDoc) {
        baziResult = baziDoc;
        // 用算法引擎计算五行
        // 这里从已存储的数据中提取
        wuxingData = {
          scores: baziDoc.wuxingScores,
          percentage: baziDoc.wuxingPercentage,
          bodyStrength: baziDoc.bodyStrength,
          yongShen: baziDoc.yongShen,
          jiShen: baziDoc.jiShen,
        };

        // 生成今日改命策略
        solution = this.solutionEngine.generate({
          bodyStrength: (baziDoc.bodyStrength || '中和') as any,
          yongShen: baziDoc.yongShen || [],
          xiShen: baziDoc.xiShen || [],
          jiShen: baziDoc.jiShen || [],
          missing: [],
          excess: [],
          dayMasterWx: baziDoc.dayMasterWuxing || '土',
          balanceState: baziDoc.balanceState || '平衡',
        });
      }
    }

    // 今日九宫
    const jiugong = this.jiugongEngine.getToday();

    // 生成运势文本（规则引擎部分）
    const fortune = {
      date: dateStr,
      overall: this.generateOverallRating(jiugong),
      luckyDirection: jiugong.summary.bestDirection,
      unluckyDirection: jiugong.summary.worstDirection,
      luckyColors: this.getLuckyColors(wuxingData),
      luckyNumbers: this.getLuckyNumbers(wuxingData),
      yi: this.getYi(jiugong, wuxingData),
      ji: this.getJi(jiugong, wuxingData),
      categories: this.generateCategories(jiugong, wuxingData),
      dailyAction: solution?.daily?.action || '今天找一个安静角落静坐5分钟',
      strategies: solution?.strategies?.slice(0, 2) || [],
      tips: solution?.tips || [],
    };

    // 保存到数据库
    if (userId) {
      try {
        await this.fortuneModel.create({
          userId,
          fortuneDate: dateStr,
          overallRating: fortune.overall,
          luckyDirection: fortune.luckyDirection,
          unluckyDirection: fortune.unluckyDirection,
          luckyColors: fortune.luckyColors,
          luckyNumbers: fortune.luckyNumbers,
          yi: fortune.yi,
          ji: fortune.ji,
          jiugong: jiugong,
        });
      } catch (e) {
        // 已存在则跳过
      }
    }

    return fortune;
  }

  /** 生成综合运势评级 */
  private generateOverallRating(jiugong: any): string {
    const bestEnergy = Math.max(...jiugong.palaces.map(p => p.energy));
    if (bestEnergy >= 80) return '吉';
    if (bestEnergy >= 50) return '平';
    return '凶';
  }

  /** 根据五行获取幸运色 */
  private getLuckyColors(wuxing: any): string[] {
    if (!wuxing?.yongShen) return ['绿色', '蓝色'];
    const colorMap: Record<string, string[]> = {
      '木': ['绿色', '青色'],
      '火': ['红色', '紫色', '橙色'],
      '土': ['黄色', '棕色', '米色'],
      '金': ['白色', '金色', '银色'],
      '水': ['黑色', '蓝色', '深灰'],
    };
    const colors = wuxing.yongShen.flatMap(s => colorMap[s] || []);
    return colors.length > 0 ? colors : ['绿色', '蓝色'];
  }

  private getLuckyNumbers(wuxing: any): number[] {
    if (!wuxing?.yongShen) return [1, 6];
    const numMap: Record<string, number[]> = {
      '木': [3, 8], '火': [2, 7], '土': [5, 10], '金': [4, 9], '水': [1, 6],
    };
    return wuxing.yongShen.flatMap(s => numMap[s] || []);
  }

  private getYi(jiugong: any, wuxing?: any): string[] {
    const items: string[] = [];
    if (jiugong?.summary?.bestDirection) {
      items.push(`朝${jiugong.summary.bestDirection}方向活动或办公`);
    }
    items.push('保持积极心态');
    if (wuxing?.yongShen?.length) {
      items.push(`补${wuxing.yongShen.join('、')}元素`);
    }
    return items;
  }

  private getJi(jiugong: any, wuxing?: any): string[] {
    const items: string[] = [];
    if (jiugong?.summary?.worstDirection) {
      items.push(`避免在${jiugong.summary.worstDirection}久留`);
    }
    items.push('冲动决策');
    if (wuxing?.jiShen?.length) {
      items.push(`忌${wuxing.jiShen.join('、')}过盛`);
    }
    return items;
  }

  private generateCategories(jiugong: any, wuxing?: any) {
    const makeRating = (base: number) => {
      if (base >= 70) return '吉';
      if (base >= 40) return '平';
      return '凶';
    };

    const careerBase = jiugong?.palaces?.find(p => p.position === 6)?.energy || 50;
    const wealthBase = jiugong?.palaces?.find(p => p.position === 8)?.energy || 50;
    const loveBase = jiugong?.palaces?.find(p => p.position === 9)?.energy || 50;

    return {
      career: {
        rating: makeRating(careerBase),
        advice: careerBase >= 60 ? '适合推进重要工作' : '宜守不宜攻',
      },
      wealth: {
        rating: makeRating(wealthBase),
        advice: wealthBase >= 60 ? '正财运佳' : '谨慎理财',
      },
      love: {
        rating: makeRating(loveBase),
        advice: loveBase >= 60 ? '人际和谐' : '注意沟通方式',
      },
      health: {
        rating: '平',
        advice: '注意作息规律',
      },
    };
  }
}
