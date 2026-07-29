// ============================================================
// 道之自然·命理AI系统 — DTO: 八字排盘请求
// AI系统最怕脏数据，必须强校验
// ============================================================

import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max, IsIn, IsDateString } from 'class-validator';

export class BirthDto {
  /** 姓名（可选） */
  @IsOptional()
  @IsString()
  name?: string;

  /** 性别 */
  @IsString()
  @IsIn(['男', '女'])
  gender: string;

  /** 出生年份 (1900-2100) */
  @IsNumber()
  @Min(1900)
  @Max(2100)
  birthYear: number;

  /** 出生月份 (1-12) */
  @IsNumber()
  @Min(1)
  @Max(12)
  birthMonth: number;

  /** 出生日期 (1-31) */
  @IsNumber()
  @Min(1)
  @Max(31)
  birthDay: number;

  /** 出生小时 (0-23) */
  @IsNumber()
  @Min(0)
  @Max(23)
  birthHour: number;

  /** 出生分钟 (0-59) */
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(59)
  birthMinute?: number;

  /** 出生地 */
  @IsOptional()
  @IsString()
  birthPlace?: string;

  /** 出生地经度（用于真太阳时） */
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  /** 出生地纬度 */
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  /** 是否启用真太阳时 */
  @IsOptional()
  @IsBoolean()
  useTrueSolar?: boolean;

  /** 用户当前困扰/问题（AI会用这个做针对性分析） */
  @IsOptional()
  @IsString()
  currentProblem?: string;
}

export class BaziQueryDto {
  @IsString()
  baziId: string;
}
