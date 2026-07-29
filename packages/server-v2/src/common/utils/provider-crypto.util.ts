// ============================================================
// DZS-OS V2 — Provider API Key Encryption Utility
// 使用 AES-256-GCM 加密/解密 API Key
// 加密密钥从环境变量 PROVIDER_ENCRYPTION_KEY 读取
// 首次运行时自动生成并保存到 .env
// ============================================================

import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const TAG_LENGTH = 16; // 128 bits
const ENV_KEY_NAME = 'PROVIDER_ENCRYPTION_KEY';

const logger = new Logger('ProviderCrypto');

/**
 * 获取或自动生成加密密钥
 */
function getOrCreateEncryptionKey(): string {
  let key = process.env[ENV_KEY_NAME];
  if (!key) {
    // 自动生成 32 字节 hex 编码密钥
    key = crypto.randomBytes(KEY_LENGTH).toString('hex');
    process.env[ENV_KEY_NAME] = key;
    logger.warn(
      `[!] ${ENV_KEY_NAME} not found in environment. Auto-generated: ${key.slice(0, 8)}...` +
      `\n    Add this to your .env file to persist: ${ENV_KEY_NAME}=${key}`,
    );
  }
  return key;
}

/**
 * 加密 API Key
 * @returns { encrypted, iv, tag } — 均为 hex 编码
 */
export function encryptApiKey(plaintext: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = Buffer.from(getOrCreateEncryptionKey(), 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag,
  };
}

/**
 * 解密 API Key
 */
export function decryptApiKey(
  encrypted: string,
  iv: string,
  tag: string,
): string {
  const key = Buffer.from(getOrCreateEncryptionKey(), 'hex');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let plaintext = decipher.update(encrypted, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  return plaintext;
}

/**
 * 脱敏 API Key — 仅显示前8位和后4位，中间用 *** 替代
 */
export function maskApiKey(encrypted?: string, iv?: string, tag?: string): string {
  if (!encrypted || !iv || !tag) return '';
  try {
    const plaintext = decryptApiKey(encrypted, iv, tag);
    if (plaintext.length <= 12) {
      return plaintext.slice(0, 4) + '***' + plaintext.slice(-4);
    }
    return plaintext.slice(0, 8) + '***' + plaintext.slice(-4);
  } catch {
    return '***加密密钥已变更***';
  }
}

/**
 * 明文 API Key 脱敏
 */
export function maskPlainApiKey(key?: string): string {
  if (!key) return '';
  if (key.length <= 12) return key.slice(0, 4) + '***' + key.slice(-4);
  return key.slice(0, 8) + '***' + key.slice(-4);
}
