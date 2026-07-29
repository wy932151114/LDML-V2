-- ============================================================
-- 道之自然·命理系统 — 数据库设计
-- MongoDB + PostgreSQL 混合架构
-- 核心数据用 PostgreSQL（关系一致性强）
-- 排盘缓存/日志/AI会话用 MongoDB（灵活）
-- ============================================================

-- ============================================================
-- 1. 用户系统
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nickname        VARCHAR(50) NOT NULL,
    phone           VARCHAR(20) UNIQUE,
    wechat_openid   VARCHAR(100) UNIQUE,
    avatar_url      VARCHAR(500),
    membership_level VARCHAR(20) DEFAULT 'free' 
                    CHECK (membership_level IN ('free', 'basic', 'premium', 'vip')),
    points          INTEGER DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at   TIMESTAMP,
    is_active       BOOLEAN DEFAULT true
);

-- ============================================================
-- 2. 用户出生信息（核心敏感数据）
-- ============================================================

CREATE TABLE birth_info (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    real_name       VARCHAR(50),                    -- 可选
    gender          VARCHAR(2) CHECK (gender IN ('男', '女')),
    birth_year      INTEGER NOT NULL,
    birth_month     INTEGER NOT NULL CHECK (birth_month BETWEEN 1 AND 12),
    birth_day       INTEGER NOT NULL CHECK (birth_day BETWEEN 1 AND 31),
    birth_hour      INTEGER CHECK (birth_hour BETWEEN 0 AND 23),
    birth_minute    INTEGER CHECK (birth_minute BETWEEN 0 AND 59),
    birth_place     VARCHAR(100),                   -- 出生地
    longitude       DECIMAL(10, 6),                 -- 经度（用于真太阳时）
    latitude        DECIMAL(10, 6),                 -- 纬度
    timezone        VARCHAR(10) DEFAULT 'Asia/Shanghai',
    use_true_solar  BOOLEAN DEFAULT false,          -- 是否启用真太阳时
    is_primary      BOOLEAN DEFAULT true,           -- 是否为主档案
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, is_primary)  -- 每个用户只能有一个主档案
);

-- ============================================================
-- 3. 八字排盘结果（缓存 + 历史）
-- ============================================================

CREATE TABLE bazi_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    birth_info_id   UUID REFERENCES birth_info(id) ON DELETE SET NULL,
    
    -- 四柱八字
    year_stem       VARCHAR(2) NOT NULL,
    year_branch     VARCHAR(2) NOT NULL,
    year_nayin      VARCHAR(20),
    month_stem      VARCHAR(2) NOT NULL,
    month_branch    VARCHAR(2) NOT NULL,
    month_nayin     VARCHAR(20),
    day_stem        VARCHAR(2) NOT NULL,
    day_branch      VARCHAR(2) NOT NULL,
    day_nayin       VARCHAR(20),
    hour_stem       VARCHAR(2) NOT NULL,
    hour_branch     VARCHAR(2) NOT NULL,
    hour_nayin      VARCHAR(20),
    
    -- 日主信息
    day_master      VARCHAR(2) NOT NULL,
    day_master_wuxing VARCHAR(2) NOT NULL,
    
    -- 五行分析（JSON存储）
    wuxing_scores   JSONB,       -- {"木": 120, "火": 80, ...}
    wuxing_pct      JSONB,       -- {"木": 35, "火": 20, ...}
    
    -- 用神/喜神/忌神
    yong_shen       VARCHAR(10)[],
    xi_shen         VARCHAR(10)[],
    ji_shen         VARCHAR(10)[],
    
    -- 身强弱
    body_strength   VARCHAR(10) CHECK (body_strength IN ('身强', '身弱', '中和')),
    balance_state   VARCHAR(10),
    
    -- 大运
    da_yun_start_age INTEGER,
    da_yun_data     JSONB,       -- [{"ganzhi": "甲子", "startAge": 4, "endAge": 13, ...}]
    
    -- 神煞（JSON存储）
    shensha         JSONB,
    
    -- 元信息
    version         VARCHAR(10) DEFAULT '1.0',      -- 算法版本
    is_true_solar   BOOLEAN DEFAULT false,          -- 是否使用真太阳时
    calculation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at DESC)
);

-- ============================================================
-- 4. 每日运势表
-- ============================================================

CREATE TABLE daily_fortune (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fortune_date    DATE NOT NULL,
    
    -- 运势概况
    overall_rating  VARCHAR(10) CHECK (overall_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    overall_desc    TEXT,
    
    -- 各领域
    career_rating   VARCHAR(10) CHECK (career_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    career_desc     TEXT,
    wealth_rating   VARCHAR(10) CHECK (wealth_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    wealth_desc     TEXT,
    love_rating     VARCHAR(10) CHECK (love_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    love_desc       TEXT,
    health_rating   VARCHAR(10) CHECK (health_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    health_desc     TEXT,
    study_rating    VARCHAR(10) CHECK (study_rating IN ('大吉', '吉', '平', '凶', '大凶')),
    study_desc      TEXT,
    
    -- 吉凶信息
    lucky_direction     VARCHAR(20),
    unlucky_direction   VARCHAR(20),
    lucky_colors        VARCHAR(50)[],
    lucky_numbers       INTEGER[],
    
    -- AI建议
    ai_advice       TEXT,
    yi              TEXT[],      -- 今日宜
    ji              TEXT[],      -- 今日忌
    
    -- 九宫飞星数据
    jiugong_data    JSONB,
    
    -- 元信息
    version         VARCHAR(10) DEFAULT '1.0',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, fortune_date),
    INDEX idx_fortune_date (fortune_date DESC),
    INDEX idx_user_date (user_id, fortune_date DESC)
);

-- ============================================================
-- 5. 仪式模板库（经典方案）
-- ============================================================

CREATE TABLE ritual_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL,
    type            VARCHAR(20) NOT NULL 
                    CHECK (type IN ('方位调整', '时间选择', '物品摆放', '颜色搭配', 
                                    '职业方向', '人际策略', '修行方法', '饮食调理', '居住调整')),
    description     TEXT NOT NULL,
    procedures      TEXT[] NOT NULL,         -- 步骤列表
    items           VARCHAR(100)[],          -- 所需物品
    best_time       VARCHAR(50),             -- 最佳时间
    best_direction  VARCHAR(20),             -- 最佳方位
    
    -- 适用条件
    applicable_wuxing  VARCHAR(10)[],        -- 适用五行
    applicable_strength VARCHAR(10)[],       -- 适用身强弱
    
    duration_min    INTEGER,                 -- 仪式时长（分钟）
    effect_cycle    VARCHAR(20),             -- 效果周期
    priority        INTEGER DEFAULT 3,       -- 默认优先级
    
    principle       TEXT NOT NULL,           -- 原理说明
    source          VARCHAR(100),            -- 经典出处
    source_chapter  VARCHAR(100),            -- 出处章节
    
    tags            VARCHAR(50)[],
    is_active       BOOLEAN DEFAULT true,
    usage_count     INTEGER DEFAULT 0,
    success_rate    DECIMAL(3,2),            -- 用户反馈成功率（仅供参考）
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 6. 经典文献引用库
-- ============================================================

CREATE TABLE classical_sources (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    book_name       VARCHAR(100) NOT NULL,
    chapter         VARCHAR(100),
    content         TEXT NOT NULL,
    translation     TEXT,                    -- 白话翻译
    explanation     TEXT,                    -- 道之自然风格解读
    
    category        VARCHAR(20) CHECK (category IN ('八字', '风水', '择日', '五行', '命理', '综合')),
    wuxing_related  VARCHAR(10)[],          -- 相关五行
    
    verified        BOOLEAN DEFAULT false,  -- 是否经过核实
    source_ref      VARCHAR(200),           -- 出处原文
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_book (book_name)
);

-- ============================================================
-- 7. AI聊天历史（用于持续上下文）
-- ============================================================

CREATE TABLE ai_chat_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id      UUID NOT NULL,
    
    role            VARCHAR(10) CHECK (role IN ('user', 'assistant', 'system')),
    content         TEXT NOT NULL,
    
    -- 如果本次对话涉及了排盘数据
    bazi_result_id  UUID REFERENCES bazi_results(id) ON DELETE SET NULL,
    
    -- AI使用的提示词版本
    prompt_version  VARCHAR(10),
    model_used      VARCHAR(50),
    
    tokens_used     INTEGER,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_session (user_id, session_id),
    INDEX idx_user_time (user_id, created_at DESC)
);

-- ============================================================
-- 8. 用户反馈与效果追踪
-- ============================================================

CREATE TABLE fortune_feedback (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    related_type    VARCHAR(20) CHECK (related_type IN ('daily', 'bazi', 'strategy', 'ritual')),
    related_id      UUID,                    -- 对应的daily_fortune/bazi_results ID
    strategy_index  INTEGER,                 -- 如果是对某条策略的反馈
    
    rating          INTEGER CHECK (rating BETWEEN 1 AND 5),
    effectiveness   VARCHAR(20) CHECK (effectiveness IN ('noticed', 'slight', 'obvious', 'no_effect')),
    comment         TEXT,
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 9. 会员/订阅系统
-- ============================================================

CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level           VARCHAR(20) NOT NULL CHECK (level IN ('basic', 'premium', 'vip')),
    
    -- 权益
    daily_fortune_count   INTEGER DEFAULT 0,       -- 0=不限
    ai_query_count         INTEGER DEFAULT 0,
    bazi_analysis_count    INTEGER DEFAULT 0,
    has_jiugong            BOOLEAN DEFAULT false,
    has_da_yun             BOOLEAN DEFAULT false,
    has_true_solar         BOOLEAN DEFAULT false,
    has_pdf_export         BOOLEAN DEFAULT false,
    
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    auto_renew      BOOLEAN DEFAULT false,
    price_amount    DECIMAL(10,2),
    price_currency  VARCHAR(3) DEFAULT 'CNY',
    
    payment_method VARCHAR(50),
    status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'trial')),
    
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_active (user_id, status)
);

-- ============================================================
-- 10. 系统配置/算法版本管理
-- ============================================================

CREATE TABLE algorithm_versions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    algorithm_name  VARCHAR(50) NOT NULL,     -- bazi_core, wuxing, jiugong, dayun
    version         VARCHAR(20) NOT NULL,
    changelog       TEXT,
    parameters      JSONB,                    -- 当前版本的参数
    is_active       BOOLEAN DEFAULT false,
    
    deployed_by     VARCHAR(50),
    deployed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(algorithm_name, version)
);

-- ============================================================
-- MongoDB Collections（灵活数据结构）
-- ============================================================

-- 以下是MongoDB集合设计（用注释表示）

/*
// 1. 排盘缓存集合
db.createCollection("bazi_cache", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "birth_hash", "data"],
            properties: {
                user_id: { bsonType: "string" },
                birth_hash: { bsonType: "string" },  // 出生信息的哈希值
                data: { bsonType: "object" },         // 完整的排盘数据
                created_at: { bsonType: "date" },
                ttl: { bsonType: "date" }             // TTL索引，7天过期
            }
        }
    }
})
db.bazi_cache.createIndex({"birth_hash": 1}, {unique: true})
db.bazi_cache.createIndex({"created_at": 1}, {expireAfterSeconds: 604800})

// 2. 用户AI会话集合
db.createCollection("ai_sessions", {
    validator: {
        $jsonSchema: {
            bsonType: "object",
            required: ["user_id", "messages"],
            properties: {
                user_id: { bsonType: "string" },
                session_id: { bsonType: "string" },
                messages: { bsonType: "array" },
                context: {
                    bsonType: "object",
                    properties: {
                        current_bazi_id: { bsonType: "string" },
                        current_jiugong: { bsonType: "object" },
                        last_strategies: { bsonType: "array" }
                    }
                },
                created_at: { bsonType: "date" },
                updated_at: { bsonType: "date" }
            }
        }
    }
})
db.ai_sessions.createIndex({"user_id": 1, "session_id": 1}, {unique: true})

// 3. 日志/分析集合
db.createCollection("analytics_logs", {
    timeseries: {
        timeField: "timestamp",
        metaField: "metadata",
        granularity: "hours"
    }
})
*/
