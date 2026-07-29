// ============================================================
// 道之自然·命理AI系统 — 应用配置
// ============================================================

export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/daozhiguang',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'daozhiguang-secret-key',
    expiresIn: '7d',
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'openai',
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
    maxTokens: 2048,
    temperature: 0.7,
  },
  throttle: {
    ttl: 60,
    limit: 60,
  },
  membership: {
    free: {
      dailyFortune: true,
      baziBasic: true,
      aiQueriesPerDay: 3,
    },
    basic: {
      dailyFortune: true,
      baziDetailed: true,
      jiugong: true,
      aiQueriesPerDay: 10,
    },
    premium: {
      dailyFortune: true,
      baziDetailed: true,
      jiugong: true,
      dayun: true,
      shensha: true,
      aiQueriesPerDay: 50,
      pdfExport: true,
    },
    vip: {
      allFeatures: true,
      aiQueriesPerDay: -1, // 无限
      prioritySupport: true,
      customRitual: true,
    },
  },
});
