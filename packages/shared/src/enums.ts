/** 用户角色 */
export enum UserRole {
  GUEST = 'guest',
  USER = 'user',
  VIP = 'vip',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

/** 会员等级 */
export enum MembershipLevel {
  NONE = 'none',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

/** 性别 */
export enum Gender {
  MALE = '男',
  FEMALE = '女',
}

/** 支付渠道 */
export enum PaymentChannel {
  WECHAT = 'wechat',
  STRIPE = 'stripe',
}

/** 订单状态 */
export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  EXPIRED = 'expired',
}

/** 报告类型 */
export enum ReportType {
  BAZI = 'bazi',
  WUXING = 'wuxing',
  JIUGONG = 'jiugong',
  FEIXING = 'feixing',
  CV = 'cv',
  COMPREHENSIVE = 'comprehensive',
}

/** AI 模型状态 */
export enum AIModelStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}
