// ============================================================
// 道之自然·命理AI系统 — User模块：服务
// 用户信息管理 + 出生信息管理
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, BirthInfo, BaziResult } from '../../database/schemas';
import { BaziEngine, WuxingEngine } from '../../engines';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(BirthInfo.name) private birthInfoModel: Model<BirthInfo>,
    @InjectModel(BaziResult.name) private baziModel: Model<BaziResult>,
    private baziEngine: BaziEngine,
    private wuxingEngine: WuxingEngine,
  ) {}

  /**
   * 获取用户信息
   */
  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-__v').exec();
    if (!user) throw new NotFoundException('用户不存在');

    // 统计信息
    const birthCount = await this.birthInfoModel.countDocuments({ userId }).exec();
    const baziCount = await this.baziModel.countDocuments({ userId }).exec();

    return {
      ...user.toObject(),
      stats: {
        birthCount,
        baziCount,
      },
    };
  }

  /**
   * 更新用户信息
   */
  async updateProfile(userId: string, data: { nickname?: string; avatarUrl?: string }) {
    const user = await this.userModel.findByIdAndUpdate(userId, data, { new: true }).exec();
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /**
   * 添加出生信息
   */
  async addBirthInfo(userId: string, data: {
    realName?: string;
    gender: string;
    birthYear: number;
    birthMonth: number;
    birthDay: number;
    birthHour: number;
    birthMinute: number;
    birthPlace?: string;
    longitude?: number;
    useTrueSolar?: boolean;
  }) {
    // 如果设置为主档案，先取消其他主档案
    const info = await this.birthInfoModel.create({
      userId,
      ...data,
      isPrimary: true,
    });

    // 排盘并保存
    const bazi = this.baziEngine.calculate({
      year: data.birthYear,
      month: data.birthMonth,
      day: data.birthDay,
      hour: data.birthHour,
      minute: data.birthMinute,
      gender: data.gender as any,
      longitude: data.longitude,
      useTrueSolar: data.useTrueSolar,
    });

    // 构造扁平八字数据（给五行引擎使用）
    const baziFlat = {
      year: bazi.pillars.year,
      month: bazi.pillars.month,
      day: bazi.pillars.day,
      hour: bazi.pillars.hour,
      dayMaster: bazi.dayMaster,
      gender: bazi.gender as '男' | '女',
      birthTime: new Date().toISOString(),
    };

    const wx = this.wuxingEngine.analyze(baziFlat);

    await this.baziModel.create({
      userId,
      birthInfoId: info._id,
      yearStem: bazi.pillars.year.heavenlyStem,
      yearBranch: bazi.pillars.year.earthlyBranch,
      yearNayin: bazi.pillars.year.nayin,
      monthStem: bazi.pillars.month.heavenlyStem,
      monthBranch: bazi.pillars.month.earthlyBranch,
      monthNayin: bazi.pillars.month.nayin,
      dayStem: bazi.pillars.day.heavenlyStem,
      dayBranch: bazi.pillars.day.earthlyBranch,
      dayNayin: bazi.pillars.day.nayin,
      hourStem: bazi.pillars.hour.heavenlyStem,
      hourBranch: bazi.pillars.hour.earthlyBranch,
      hourNayin: bazi.pillars.hour.nayin,
      dayMaster: bazi.dayMaster,
      dayMasterWuxing: wx.dayMasterWx,
      wuxingScores: wx.scores,
      wuxingPercentage: wx.percentage,
      yongShen: wx.yongShen,
      xiShen: wx.xiShen,
      jiShen: wx.jiShen,
      bodyStrength: wx.bodyStrength,
      balanceState: wx.balanceState,
      isTrueSolar: data.useTrueSolar || false,
      calculationTime: new Date(),
    });

    return {
      birthInfo: info,
      bazi: {
        year: bazi.pillars.year.full,
        month: bazi.pillars.month.full,
        day: bazi.pillars.day.full,
        hour: bazi.pillars.hour.full,
        dayMaster: bazi.dayMaster,
        gender: bazi.gender,
      },
      wuxing: wx,
    };
  }

  /**
   * 获取用户的出生信息列表
   */
  async getBirthInfos(userId: string) {
    return this.birthInfoModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  /**
   * 删除出生信息
   */
  async deleteBirthInfo(userId: string, infoId: string) {
    const result = await this.birthInfoModel.deleteOne({ _id: infoId, userId }).exec();
    if (result.deletedCount === 0) throw new NotFoundException('出生信息不存在');
    return { deleted: true };
  }
}
