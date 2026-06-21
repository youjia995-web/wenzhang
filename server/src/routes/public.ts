// 公开 API — 读者侧
// 1. 列出已发布文章
// 2. 查看文章（返回摘要 + preview，未付费不返回 content）
// 3. 取完整内容（需 unlock token header）

import type { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { genReaderToken } from '../lib/crypto.js';

const READER_TOKEN_COOKIE = 'reader_token';
const UNLOCK_TOKEN_HEADER = 'x-unlock-token';

export async function publicRoutes(app: FastifyInstance) {
  // 确保 reader_token cookie 存在
  app.addHook('preHandler', async (req, reply) => {
    if (!req.cookies[READER_TOKEN_COOKIE]) {
      reply.setCookie(READER_TOKEN_COOKIE, genReaderToken(), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
        secure: process.env.NODE_ENV === 'production',
      });
    }
  });

  // 列出已发布文章
  app.get('/api/posts', async () => {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { publishedAt: 'desc' },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        coverUrl: true,
        priceCents: true,
        publishedAt: true,
      },
    });
    return { posts };
  });

  // 文章详情 — 只返回 preview，不返回 content
  app.get('/api/posts/:slug', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const post = await prisma.post.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        preview: true,
        coverUrl: true,
        priceCents: true,
        status: true,
        publishedAt: true,
      },
    });
    if (!post || post.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: 'not_found' });
    }

    const unlockToken = req.headers[UNLOCK_TOKEN_HEADER] as string | undefined;
    let unlocked = false;
    if (unlockToken) {
      const unlock = await prisma.unlock.findUnique({
        where: { token: unlockToken },
        select: { postId: true, expiresAt: true },
      });
      if (unlock && unlock.postId === post.id) {
        if (!unlock.expiresAt || unlock.expiresAt > new Date()) {
          unlocked = true;
        }
      }
    }

    return { post: { ...post, unlocked } };
  });

  // 取完整内容（必须带 unlock token）
  app.get('/api/posts/:slug/content', async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const unlockToken = req.headers[UNLOCK_TOKEN_HEADER] as string | undefined;
    if (!unlockToken) {
      return reply.code(402).send({ error: 'payment_required' });
    }

    const post = await prisma.post.findUnique({
      where: { slug },
      select: { id: true, content: true, status: true },
    });
    if (!post || post.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: 'not_found' });
    }

    const unlock = await prisma.unlock.findUnique({
      where: { token: unlockToken },
      select: { postId: true, expiresAt: true, accessCount: true },
    });

    if (!unlock || unlock.postId !== post.id) {
      return reply.code(403).send({ error: 'invalid_unlock_token' });
    }
    if (unlock.expiresAt && unlock.expiresAt < new Date()) {
      return reply.code(403).send({ error: 'unlock_expired' });
    }

    await prisma.unlock.update({
      where: { token: unlockToken },
      data: { accessCount: { increment: 1 }, lastAccessAt: new Date() },
    });

    return { content: post.content };
  });
}
