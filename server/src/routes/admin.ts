// 作者后台 API — 单作者场景
// 1. POST /api/admin/login                登录（单密码）
// 2. GET  /api/admin/me                    当前信息
// 3. GET  /api/admin/qrs                   收款码列表
// 4. POST /api/admin/qrs                   上传收款码（base64 图片 + label）
// 5. PATCH /api/admin/qrs/:id              启用/停用
// 6. DELETE /api/admin/qrs/:id             删除
// 7. GET  /api/admin/orders                订单列表（支持 ?status=AWAITING_CONFIRM）
// 8. POST /api/admin/orders/:id/confirm    确认收款 → 生成 unlock
// 9. POST /api/admin/orders/:id/reject     拒绝（标记 REJECTED）
// 10. 文章 CRUD（GET/POST/PUT/DELETE）

import type { FastifyInstance } from 'fastify';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { signAdminJwt, verifyAdminJwt, genUnlockToken } from '../lib/crypto.js';
import { env } from '../config.js';

declare module 'fastify' {
  interface FastifyRequest {
    admin?: { id: string };
  }
}

async function requireAdmin(req: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'unauthorized' });
  }
  const payload = verifyAdminJwt(auth.slice(7));
  if (!payload) {
    return reply.code(401).send({ error: 'invalid_token' });
  }
  req.admin = { id: 'admin' };
}

function slugify(input: string): string {
  const ascii = input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return ascii || `post-${Date.now().toString(36)}`;
}

export async function adminRoutes(app: FastifyInstance) {
  // ---------- 登录 ----------
  app.post('/api/admin/login', async (req, reply) => {
    const { password } = z.object({ password: z.string() }).parse(req.body);
    // 时序安全：无论密码对不对都做一次比较，避免通过响应时间猜密码
    const expected = env.ADMIN_PASSWORD;
    let ok = password.length === expected.length;
    for (let i = 0; i < Math.max(password.length, expected.length); i++) {
      ok = ok && (password[i] ?? '') === (expected[i] ?? '');
    }
    if (!ok) {
      return reply.code(401).send({ error: 'invalid_password' });
    }
    const token = signAdminJwt();
    return {
      token,
      admin: { username: env.ADMIN_USERNAME, displayName: env.ADMIN_DISPLAY_NAME },
    };
  });

  // ---------- 鉴权后的接口 ----------
  app.register(async (instance) => {
    instance.addHook('preHandler', requireAdmin);

    // 当前信息
    instance.get('/api/admin/me', async () => ({
      admin: { username: env.ADMIN_USERNAME, displayName: env.ADMIN_DISPLAY_NAME },
    }));

    // ---------- 收款码管理 ----------
    instance.get('/api/admin/qrs', async () => {
      const qrs = await prisma.paymentQR.findMany({
        orderBy: { createdAt: 'desc' },
        select: { id: true, label: true, isActive: true, createdAt: true, updatedAt: true },
      });
      return { qrs };
    });

    const qrCreateSchema = z.object({
      label: z.string().min(1).max(50),
      /// 完整 dataURL：data:image/png;base64,xxxx
      /// 服务端只存 base64 主体（去掉前缀），但允许前端传带前缀的
      imageBase64: z.string().min(100).max(2_800_000), // roughly <= 2MB image file
    });

    instance.post('/api/admin/qrs', async (req, reply) => {
      const data = qrCreateSchema.parse(req.body);
      // 简单校验：必须是合法 base64 图片
      const base64 = data.imageBase64.replace(/^data:image\/\w+;base64,/, '');
      if (!/^[A-Za-z0-9+/=]+$/.test(base64)) {
        return reply.code(400).send({ error: 'invalid_base64' });
      }
      // 上传一张新码时，把其他码停用（保证只有一张激活）
      const qr = await prisma.$transaction(async (tx) => {
        await tx.paymentQR.updateMany({
          where: { isActive: true },
          data: { isActive: false },
        });
        return tx.paymentQR.create({
          data: { label: data.label, imageBase64: base64, isActive: true },
        });
      });
      return { qr: { id: qr.id, label: qr.label, isActive: qr.isActive } };
    });

    instance.patch('/api/admin/qrs/:id', async (req) => {
      const { id } = req.params as { id: string };
      const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body);
      if (isActive) {
        // 启用这一张时，停用其他
        await prisma.$transaction([
          prisma.paymentQR.updateMany({ where: { isActive: true, NOT: { id } }, data: { isActive: false } }),
          prisma.paymentQR.update({ where: { id }, data: { isActive: true } }),
        ]);
      } else {
        await prisma.paymentQR.update({ where: { id }, data: { isActive: false } });
      }
      return { ok: true };
    });

    instance.delete('/api/admin/qrs/:id', async (req) => {
      const { id } = req.params as { id: string };
      await prisma.paymentQR.delete({ where: { id } });
      return { ok: true };
    });

    // ---------- 订单管理 ----------
    instance.get('/api/admin/orders', async (req) => {
      const q = z.object({ status: z.string().optional() }).parse(req.query);
      const where = q.status ? { status: q.status as 'PENDING' | 'AWAITING_CONFIRM' | 'CONFIRMED' | 'REJECTED' | 'EXPIRED' } : {};
      const orders = await prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { post: { select: { title: true, slug: true } } },
      });
      return { orders };
    });

    // 确认订单 → 生成 unlock
    instance.post('/api/admin/orders/:id/confirm', async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        await prisma.$transaction(async (tx) => {
          const order = await tx.order.findUnique({
            where: { id },
            include: { unlock: { select: { id: true } } },
          });
          if (!order) throw new Error('order_not_found');
          if (order.status === 'CONFIRMED' && order.unlock) return;
          await tx.order.update({
            where: { id },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
          await tx.unlock.upsert({
            where: { orderId: order.id },
            update: {},
            create: {
              token: genUnlockToken(),
              orderId: order.id,
              postId: order.postId,
              payerFingerprint: order.payerFingerprint,
            },
          });
        });
        return { ok: true };
      } catch (e) {
        if (e instanceof Error && e.message === 'order_not_found') {
          return reply.code(404).send({ error: 'order_not_found' });
        }
        req.log.error({ err: e }, 'failed to confirm order');
        return reply.code(500).send({ error: 'order_confirm_failed' });
      }
    });

    instance.post('/api/admin/orders/:id/reject', async (req) => {
      const { id } = req.params as { id: string };
      const { reason } = z.object({ reason: z.string().max(200).optional() }).parse(req.body ?? {});
      await prisma.order.update({
        where: { id },
        data: { status: 'REJECTED', rejectReason: reason, confirmedAt: new Date() },
      });
      return { ok: true };
    });

    // ---------- 文章 CRUD ----------
    const postSchema = z.object({
      slug: z.string().max(120).optional(),
      title: z.string().min(1).max(200),
      summary: z.string().max(500),
      preview: z.string().min(1),
      content: z.string().min(1),
      coverUrl: z.string().url().optional().nullable(),
      priceCents: z.number().int().min(1).max(1_000_000),
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
    });

    instance.post('/api/admin/posts', async (req, reply) => {
      const data = postSchema.parse(req.body);
      const slug = slugify(data.slug || data.title);
      try {
        const post = await prisma.post.create({
          data: {
            ...data,
            slug,
            publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
          },
        });
        return { post };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          return reply.code(409).send({ error: 'slug_taken' });
        }
        req.log.error({ err: e }, 'failed to create post');
        return reply.code(500).send({ error: 'post_create_failed' });
      }
    });

    instance.put('/api/admin/posts/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const data = postSchema.partial().parse(req.body);
      const slug = data.slug !== undefined ? slugify(data.slug || data.title || '') : undefined;
      try {
        const post = await prisma.post.update({
          where: { id },
          data: {
            ...data,
            slug,
            publishedAt:
              data.status === 'PUBLISHED'
                ? new Date()
                : data.status === 'DRAFT' || data.status === 'ARCHIVED'
                  ? null
                  : undefined,
          },
        });
        return { post };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === 'P2002') return reply.code(409).send({ error: 'slug_taken' });
          if (e.code === 'P2025') return reply.code(404).send({ error: 'post_not_found' });
        }
        req.log.error({ err: e }, 'failed to update post');
        return reply.code(500).send({ error: 'post_update_failed' });
      }
    });

    instance.get('/api/admin/posts', async () => {
      const posts = await prisma.post.findMany({
        where: { status: { not: 'ARCHIVED' } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true, slug: true, title: true, status: true, priceCents: true,
          publishedAt: true, createdAt: true, updatedAt: true,
        },
      });
      return { posts };
    });

    instance.get('/api/admin/posts/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      const post = await prisma.post.findUnique({ where: { id } });
      if (!post) return reply.code(404).send({ error: 'not_found' });
      return { post };
    });

    instance.delete('/api/admin/posts/:id', async (req, reply) => {
      const { id } = req.params as { id: string };
      try {
        const [orders, unlocks] = await Promise.all([
          prisma.order.count({ where: { postId: id } }),
          prisma.unlock.count({ where: { postId: id } }),
        ]);
        if (orders > 0 || unlocks > 0) {
          await prisma.post.update({
            where: { id },
            data: { status: 'ARCHIVED', publishedAt: null },
          });
          return { ok: true, mode: 'archived' };
        }
        await prisma.post.delete({ where: { id } });
        return { ok: true, mode: 'deleted' };
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
          return reply.code(404).send({ error: 'post_not_found' });
        }
        req.log.error({ err: e }, 'failed to delete post');
        return reply.code(500).send({ error: 'post_delete_failed' });
      }
    });

    // ---------- 统计 ----------
    instance.get('/api/admin/stats', async () => {
      const [pending, awaiting, confirmed, totalCents] = await Promise.all([
        prisma.order.count({ where: { status: 'PENDING' } }),
        prisma.order.count({ where: { status: 'AWAITING_CONFIRM' } }),
        prisma.order.count({ where: { status: 'CONFIRMED' } }),
        prisma.order.aggregate({ where: { status: 'CONFIRMED' }, _sum: { amountCents: true } }),
      ]);
      return {
        pending,
        awaitingConfirm: awaiting,
        confirmed,
        totalCents: totalCents._sum.amountCents ?? 0,
      };
    });
  });
}
