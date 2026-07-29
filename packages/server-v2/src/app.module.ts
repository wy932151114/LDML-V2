import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';

// Database
import { DatabaseModule } from '@/database/database.module';
import { RedisModule } from '@/database/redis/redis.module';

// Modules
import { AuthModule } from '@/modules/auth/auth.module';
import { UserModule } from '@/modules/user/user.module';
import { ReportModule } from '@/modules/report/report.module';
import { AIRuntimeModule } from '@/modules/ai-runtime/ai-runtime.module';
import { PromptCenterModule } from '@/modules/prompt-center/prompt-center.module';
import { WorkflowModule } from '@/modules/workflow/workflow.module';
import { ProviderConfigModule } from '@/modules/provider-config/provider-config.module';

// Guards
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import { AllExceptionsFilter } from '@/common/filters/all-exceptions.filter';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),

    // Database
    DatabaseModule,
    RedisModule,

    // Feature modules
    AuthModule,
    UserModule,
    ReportModule,
    AIRuntimeModule,
    PromptCenterModule,
    WorkflowModule,
    ProviderConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
