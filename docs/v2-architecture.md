# DZS Operating System V2 — Architecture Blueprint

## Overview
V2 is a commercial-grade rebuild of DZS-OS. All V1 features preserved, no API contract changes, full backward compatibility.

## Architecture Principles
1. **Module Monolith** with clear domain boundaries (future microservice-ready)
2. **DDD Layers**: Presentation → Application → Domain → Infrastructure
3. **Event Bus**: Decoupled async communication between domains
4. **Plugin System**: Pluggable engines (bazi, wuxing, jiugong, cv, report, payment)
5. **Repository Pattern**: Database-agnostic via interfaces

## Directory Structure
```
packages/server-v2/src/
├── main.ts                    # Entry point
├── app.module.ts              # Root module
├── common/                    # Shared kernel
│   ├── guards/               # Auth guards
│   ├── interceptors/         # Logging, audit
│   ├── pipes/                # Validation
│   ├── filters/              # Exception filters
│   ├── decorators/           # Custom decorators
│   └── utils/                # Shared utilities
├── modules/                   # Domain modules (DDD)
│   ├── user/                 # Phase 1
│   ├── auth/                 # Phase 1
│   ├── email/                # Phase 1
│   ├── sms/                  # Phase 1
│   ├── upload/               # Phase 1
│   ├── report/               # Phase 3
│   ├── payment/              # Phase 4
│   ├── order/                # Phase 4
│   ├── membership/           # Phase 4
│   ├── prompt/               # Phase 5
│   ├── agent/                # Phase 5
│   ├── cv/                   # Phase 6
│   ├── admin/                # Phase 7
│   └── openapi/              # Phase 8
├── database/                  # Data layer
│   ├── mongoose/             # MongoDB schemas
│   └── redis/                # Redis client
├── events/                    # Event Bus
└── engines/                   # V1 engines (reused)
    ├── bazi-engine/
    ├── wuxing-engine/
    ├── jiugong-engine/
    ├── dayun-engine/
    ├── shensha-engine/
    └── solution-engine/
```

## Phase Plan
1. **User System** — Auth, JWT, RBAC, profile, avatar
2. **Database** — MongoDB, Redis, Repository, Audit, History
3. **AI Report Center** — HTML/PDF/MD/Word reports
4. **Payment Center** — Orders, membership, WeChat/Stripe
5. **AI Agent** — Prompt registry, workflow, memory, knowledge base, risk engine
6. **CV AI** — YOLO, SAM2, OCR, room/furniture detection
7. **Operations Backend** — Admin dashboard, analytics
8. **Open Platform** — REST API, Webhook, SDK, Swagger
