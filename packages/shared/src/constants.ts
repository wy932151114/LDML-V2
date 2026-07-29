/** 应用名称 */
export const APP_NAME = '道之自然';
export const APP_NAME_EN = 'DaoZhiNatural';

/** 版本 */
export const APP_VERSION = '2.0.0';

/** 令牌过期时间（秒） */
export const ACCESS_TOKEN_EXPIRY_SEC = 900;
export const REFRESH_TOKEN_EXPIRY_SEC = 604800;

/** 验证码有效期（秒） */
export const EMAIL_CODE_EXPIRY_SEC = 300;
export const SMS_CODE_EXPIRY_SEC = 300;

/** 限流 */
export const RATE_LIMIT_TTL = 60000;
export const RATE_LIMIT_MAX = 60;
export const EMAIL_CODE_RATE_LIMIT = 3;

/** 分页默认值 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/** 密码规则 */
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 32;

/** 文件上传 */
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
export const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** 五行元素 */
export const WUXING_ELEMENTS = ['金', '木', '水', '火', '土'] as const;
export const TIANGAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
export const DIZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;
