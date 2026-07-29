import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  User, UserSchema,
  Session, SessionSchema,
  EmailVerification, EmailVerificationSchema,
  AuditLog, AuditLogSchema,
  OperationLog, OperationLogSchema,
  AIModelConfig, AIModelConfigSchema,
  AITokenLog, AITokenLogSchema,
  AILog, AILogSchema,
  Prompt, PromptSchema,
  PromptVersion, PromptVersionSchema,
  Workflow, WorkflowSchema,
  WorkflowExecution, WorkflowExecutionSchema,
  WorkflowTemplate, WorkflowTemplateSchema,
} from './mongoose/schemas';

const featureModules = [
  MongooseModule.forFeature([
    { name: User.name, schema: UserSchema },
    { name: Session.name, schema: SessionSchema },
    { name: EmailVerification.name, schema: EmailVerificationSchema },
    { name: AuditLog.name, schema: AuditLogSchema },
    { name: OperationLog.name, schema: OperationLogSchema },
    { name: AIModelConfig.name, schema: AIModelConfigSchema },
    { name: AITokenLog.name, schema: AITokenLogSchema },
    { name: AILog.name, schema: AILogSchema },
    { name: Prompt.name, schema: PromptSchema },
    { name: PromptVersion.name, schema: PromptVersionSchema },
    { name: Workflow.name, schema: WorkflowSchema },
    { name: WorkflowExecution.name, schema: WorkflowExecutionSchema },
    { name: WorkflowTemplate.name, schema: WorkflowTemplateSchema },
  ]),
];

@Global()
@Module({
  imports: [
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/dzs-v2'),
      }),
    }),
    ...featureModules,
  ],
  exports: [MongooseModule, ...featureModules],
})
export class DatabaseModule {}
