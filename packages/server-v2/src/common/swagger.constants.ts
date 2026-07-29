// ============================================================
// DZS-OS V2 Swagger 常量
// ============================================================

/** Swagger 标签 */
export const SWAGGER_TAGS = {
  AUTH: 'Auth',
  USERS: 'Users',
  HEALTH: 'Health',
  AI_RUNTIME: 'AI Runtime',
  PROMPT_CENTER: 'Prompt Center',
  WORKFLOW_ENGINE: 'Workflow Engine',
  PROVIDER_CONFIG: 'Provider Config',
} as const;

/** Swagger API 安全定义 */
export const SWAGGER_SECURITY = {
  JWT: 'JWT-auth',
  API_KEY: 'API-Key',
} as const;
