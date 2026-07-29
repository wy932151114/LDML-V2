// ============================================================
// 道之自然·命理AI系统 — User模块
// ============================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User, UserSchema, BirthInfo, BirthInfoSchema, BaziResult, BaziResultSchema } from '../../database/schemas';
import { BaziEngine, WuxingEngine } from '../../engines';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: BirthInfo.name, schema: BirthInfoSchema },
      { name: BaziResult.name, schema: BaziResultSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, BaziEngine, WuxingEngine],
  exports: [UserService],
})
export class UserModule {}
