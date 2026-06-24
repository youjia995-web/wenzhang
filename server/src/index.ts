// Fastify 入口 — 极简版
import Fastify from 'fastify';
import { z } from 'zod';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile } from 'node:fs/promises';
import { env } from './config.js';
import { publicRoutes } from './routes/public.js';
import { paymentRoutes } from './routes/payment.js';
import { adminRoutes } from './routes/admin.js';
import { shutdownPrisma } from './lib/prisma.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function buildApp() {
  const app = Fastify({
    logger: { level: env.NODE_ENV === 'production' ? 'info' : 'debug' },
    bodyLimit: 12 * 1024 * 1024, // 允许正文粘贴压缩后的图片 data URL
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, {
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(','),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.get('/health', async () => ({ ok: true, ts: Date.now() }));

  await app.register(publicRoutes, { prefix: '' });
  await app.register(paymentRoutes, { prefix: '' });
  await app.register(adminRoutes, { prefix: '' });

  // 静态前端 — dev 模式从 ../../web/ 读；prod 由 postbuild 复制到 dist/web/
  const webRoot = env.NODE_ENV === 'production'
    ? join(__dirname, 'web')
    : join(__dirname, '..', '..', 'web');
  await app.register(fastifyStatic, {
    root: webRoot,
    prefix: '/',
    decorateReply: false,
  });
  // SPA fallback
  app.setNotFoundHandler((req, reply) => {
    if (req.method === 'GET' && !req.url.startsWith('/api/')) {
      return readFile(join(webRoot, 'index.html'), 'utf8')
        .then((html) => reply.type('text/html; charset=utf-8').send(html))
        .catch(() => reply.code(404).send({ error: 'frontend_not_found' }));
    }
    return reply.code(404).send({ error: 'not_found' });
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled error');
    if (err instanceof z.ZodError || (err as { validation?: unknown }).validation) {
      return reply.code(400).send({ error: 'validation_error', details: err.message });
    }
    return reply.code(500).send({ error: 'internal_error' });
  });

  return app;
}

async function main() {
  const app = await buildApp();
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down`);
      await app.close();
      await shutdownPrisma();
      process.exit(0);
    });
  }
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  // macOS + 中文路径下，process.argv[1] 不做 URL 编码，import.meta.url 会做
  // 用文件名比较更稳
  const argFile = process.argv[1].split('/').pop();
  const thisFile = decodeURIComponent(import.meta.url).split('/').pop();
  return argFile === thisFile;
})();
if (isMain) main();
