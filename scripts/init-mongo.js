// MongoDB 初始化脚本
db = db.getSiblingDB('dzs_os');

// 创建管理用户
db.createUser({
  user: 'admin',
  pwd: 'dzs_dev_pass',
  roles: [
    { role: 'readWrite', db: 'dzs_os' },
    { role: 'dbAdmin', db: 'dzs_os' },
  ],
});

// 创建集合
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('email_verifications');
db.createCollection('audit_logs');
db.createCollection('operation_logs');

// 创建索引
db.users.createIndex({ email: 1 }, { unique: true, sparse: true });
db.users.createIndex({ phone: 1 }, { unique: true, sparse: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ createdAt: -1 });

db.sessions.createIndex({ refreshToken: 1 }, { unique: true });
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

db.email_verifications.createIndex({ email: 1, code: 1 });
db.email_verifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });

db.audit_logs.createIndex({ userId: 1 });
db.audit_logs.createIndex({ action: 1 });
db.audit_logs.createIndex({ createdAt: -1 });

db.operation_logs.createIndex({ userId: 1 });
db.operation_logs.createIndex({ module: 1 });
db.operation_logs.createIndex({ createdAt: -1 });

print('✅ dzs_os database initialized successfully');
