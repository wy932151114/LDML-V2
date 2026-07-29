// ============================================================
// 道之自然·命理AI系统 — Mock Mongoose Module
// 跳过数据库连接，只注册模型
// ============================================================

import { Module, DynamicModule, Global } from '@nestjs/common';

// 模拟模型Provider工厂
function createMockModel(name: string): any {
  const MockModelProvider = {
    provide: `get${name}Model`,
    useFactory: () => ({}),
  };

  // @nestjs/mongoose uses the model's name as the DI token
  const ModelProvider = {
    provide: name,
    useFactory: () => {
      const MockModel = function (this: any, doc: any) {
        if (doc) Object.assign(this, doc);
      } as any;
      MockModel.find = () => ({
        exec: async () => [],
        sort: () => ({ exec: async () => [] }),
        skip: () => ({ limit: () => ({ exec: async () => [] }) }),
      });
      MockModel.findOne = () => ({ exec: async () => null });
      MockModel.findById = () => ({ exec: async () => null });
      MockModel.create = async (doc: any) => doc;
      MockModel.prototype.save = async function () { return this; };
      MockModel.prototype.toObject = function () { return { ...this }; };
      return MockModel;
    },
  };

  return ModelProvider;
}

@Global()
@Module({})
export class MockMongooseModule {
  static forRoot(): DynamicModule {
    return {
      module: MockMongooseModule,
      providers: [],
      exports: [],
    };
  }

  static forFeature(models: { name: string; schema: any }[]): DynamicModule {
    const providers = models.map((m) => ({
      provide: m.name,
      useFactory: () => {
        const MockModel = function (this: any, doc?: any) {
          if (doc) Object.assign(this, doc);
        } as any;
        MockModel.find = () => ({ exec: async () => [], sort: () => ({ exec: async () => [] }), skip: () => ({ limit: () => ({ exec: async () => [] }) }) });
        MockModel.findOne = () => ({ exec: async () => null, sort: () => ({ exec: async () => null }) });
        MockModel.findById = () => ({ exec: async () => null });
        MockModel.create = async (doc: any) => doc;
        MockModel.findByIdAndUpdate = () => ({ exec: async () => null });
        MockModel.countDocuments = async () => 0;
        MockModel.prototype.save = async function () { return this; };
        return MockModel;
      },
    }));

    return {
      module: MockMongooseModule,
      providers,
      exports: providers,
    };
  }
}
