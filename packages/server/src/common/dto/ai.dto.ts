// ============================================================
// 道之自然·命理AI系统 — DTO: AI对话请求
// ============================================================

import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChatHistoryItem {
  @IsString()
  role: string;

  @IsString()
  content: string;
}

class AiContext {
  @IsOptional()
  @IsString()
  baziText?: string;

  @IsOptional()
  @IsString()
  wuxingText?: string;

  @IsOptional()
  @IsString()
  jiugongText?: string;

  @IsOptional()
  @IsString()
  dayunText?: string;

  @IsOptional()
  @IsString()
  shenshaText?: string;
}

export class AiChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AiContext)
  context?: AiContext;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatHistoryItem)
  history?: ChatHistoryItem[];
}

export class AiDailyFortuneDto {
  @IsString()
  date: string;

  @IsString()
  wuxingText: string;

  @IsString()
  jiugongText: string;

  @IsString()
  dayMaster: string;

  @IsArray()
  @IsString({ each: true })
  yongShen: string[];

  @IsArray()
  @IsString({ each: true })
  jiShen: string[];
}

export class AiStrategyDto {
  @IsString()
  baziText: string;

  @IsString()
  wuxingText: string;

  @IsOptional()
  @IsString()
  userGoal?: string;
}
