// ============================================================
// DZS-OS V2 — Prompt Registry Unit Tests
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException } from '@nestjs/common';
import { Model } from 'mongoose';
import { PromptRegistryService } from '../services/prompt-registry.service';
import { Prompt, PromptDocument } from '@/database/mongoose/schemas/prompt.schema';

describe('PromptRegistryService', () => {
  let service: PromptRegistryService;
  let promptModel: Model<PromptDocument>;

  // Simplified mock: each test sets up its own chain via mockImplementation
  const mockFn = {
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findOneAndUpdate: jest.fn(),
    deleteOne: jest.fn(),
    countDocuments: jest.fn(),
  };

  // Chain builders — each returns proper { exec } shape
  function mockFindOne(val: any) {
    mockFn.findOne.mockReturnValue({ exec: jest.fn().mockResolvedValue(val) });
  }
  function mockFindAll(arr: any[]) {
    mockFn.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(arr) }) });
  }
  function mockFindSearch(arr: any[], total: number) {
    const execSort = jest.fn().mockResolvedValue(arr);
    const execCount = jest.fn().mockResolvedValue(total);
    mockFn.find.mockReturnValue({
      sort: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({ exec: execSort }),
        }),
      }),
    });
    mockFn.countDocuments.mockReturnValue({ exec: execCount });
  }
  function mockUpdate(val: any) {
    mockFn.findOneAndUpdate.mockReturnValue({ exec: jest.fn().mockResolvedValue(val) });
  }
  function mockDelete(deletedCount: number) {
    mockFn.deleteOne.mockReturnValue({ exec: jest.fn().mockResolvedValue({ deletedCount }) });
  }

  const sampleData = {
    promptId: 'test-analysis',
    name: '测试分析',
    category: 'custom' as const,
    template: '分析 {{input}}',
    provider: 'openai',
    model: 'gpt-4o',
    status: 'active' as const,
    isLatest: true,
    version: '1.0.0',
    createdBy: 'test',
    tags: [],
    variables: ['input'],
    description: '测试',
    maxTokens: 4096,
    sortOrder: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptRegistryService,
        { provide: getModelToken(Prompt.name), useValue: mockFn },
      ],
    }).compile();

    service = module.get<PromptRegistryService>(PromptRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new prompt', async () => {
      mockFindOne(null); // duplicate check → none
      mockFn.create.mockResolvedValue({ ...sampleData, _id: 'mock-id' });

      const result = await service.register(sampleData);
      expect(mockFn.create).toHaveBeenCalled();
      expect(result).toHaveProperty('promptId', 'test-analysis');
    });

    it('should throw ConflictException for duplicate promptId', async () => {
      mockFindOne({ promptId: 'dup' }); // duplicate exists
      await expect(service.register(sampleData)).rejects.toThrow(ConflictException);
    });
  });

  describe('get & getAll', () => {
    it('should get a prompt by ID', async () => {
      mockFindOne({ promptId: 'bazi-analysis', name: '八字分析' });
      const result = await service.get('bazi-analysis');
      expect(mockFn.findOne).toHaveBeenCalledWith({ promptId: 'bazi-analysis' });
      expect(result).toHaveProperty('promptId', 'bazi-analysis');
    });

    it('should return null if prompt not found', async () => {
      mockFindOne(null);
      const result = await service.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should list all prompts', async () => {
      mockFindAll([{ promptId: 'a' }, { promptId: 'b' }]);
      const result = await service.getAll();
      expect(result).toHaveLength(2);
    });

    it('should search prompts with keyword', async () => {
      mockFindSearch([{ promptId: 'test-analysis' }], 1);
      const result = await service.search('test', {});
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('update & remove', () => {
    it('should update prompt fields', async () => {
      mockUpdate({ promptId: 'test', name: 'Updated' });
      const result = await service.update('test', { name: 'Updated' });
      expect(mockFn.findOneAndUpdate).toHaveBeenCalled();
      expect(result).toHaveProperty('name', 'Updated');
    });

    it('should remove a prompt', async () => {
      mockDelete(1);
      const result = await service.remove('test');
      expect(result).toBe(true);
      expect(mockFn.deleteOne).toHaveBeenCalledWith({ promptId: 'test' });
    });

    it('should return false if prompt not found on remove', async () => {
      mockDelete(0);
      const result = await service.remove('test');
      expect(result).toBe(false);
    });
  });
});
