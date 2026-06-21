// 哈希指纹（未登录场景下关联订单和解锁）
import { createHash } from 'node:crypto';

export function hashFingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex');
}
