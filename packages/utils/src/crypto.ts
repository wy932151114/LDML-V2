import * as crypto from 'crypto';

export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}

export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let code = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    code += digits[bytes[i] % 10];
  }
  return code;
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function simpleHash(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}
