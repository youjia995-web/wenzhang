// JWT + 简易加密 — 单作者场景
import { createHmac, randomBytes } from 'node:crypto';
import { env } from '../config.js';

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

function hmac(payload: string): string {
  return createHmac('sha256', env.ADMIN_JWT_SECRET).update(payload).digest('base64url');
}

export interface AdminJwtPayload {
  sub: string; // "admin"
  exp: number; // 秒级时间戳
}

export function signAdminJwt(ttlSec = 60 * 60 * 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const full: AdminJwtPayload = { sub: 'admin', exp };
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(full));
  return `${header}.${body}.${hmac(`${header}.${body}`)}`;
}

export function verifyAdminJwt(token: string): AdminJwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  if (hmac(`${header}.${body}`) !== sig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as AdminJwtPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function genReaderToken(): string {
  return randomBytes(32).toString('base64url');
}

export function genUnlockToken(): string {
  return randomBytes(32).toString('hex');
}

/// 6 位订单号，便于作者在手机微信通知里对照
export function genOrderNo(): string {
  // 取 0-999999 的随机数，保证 6 位
  return Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
}
