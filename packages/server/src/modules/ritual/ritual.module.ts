// ============================================================
// 道之自然·命理AI系统 — Ritual模块
// ============================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RitualTemplate, RitualTemplateSchema } from '../../database/schemas';
import { SolutionEngine } from '../../engines';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RitualTemplate.name, schema: RitualTemplateSchema },
    ]),
  ],
  providers: [SolutionEngine],
  exports: [SolutionEngine],
})
export class RitualModule {}
