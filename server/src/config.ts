// 配置 — 极简版：没有微信支付环境变量
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),

  // SQLite 文件路径（不是 URL，但 zod.url() 不合适，改成 string）
  // 本地开发: file:./data/dev.db（相对 cwd/server）
  // Zeabur 生产: file:/data/prod.db（持久卷挂载点，重启不丢）
  DATABASE_URL: z.string().min(1),

  /// 作者后台密码（只有你一个人用，单密码即可）
  ADMIN_PASSWORD: z.string().min(6),
  /// 作者后台用户名（用于登录展示，可任意）
  ADMIN_USERNAME: z.string().default('admin'),
  /// 作者显示名
  ADMIN_DISPLAY_NAME: z.string().default('作者'),

  /// 作者后台 JWT 签名密钥
  ADMIN_JWT_SECRET: z.string().min(32),
  /// 读者匿名身份 token 签名密钥
  READER_TOKEN_SECRET: z.string().min(32),

  /// 站点公开 URL（用于生成绝对 URL）
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3000'),

  CORS_ORIGIN: z.string().default('*'),
});

export const env = envSchema.parse(process.env);
