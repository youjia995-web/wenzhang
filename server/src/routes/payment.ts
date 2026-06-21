// 支付订单 API — 个人付款码场景
// 1. POST /api/orders            创建订单 → 返回收款码图片
// 2. POST /api/orders/:no/paid   读者点"我已支付" → 进入待作者确认
// 3. GET  /api/orders/:no        轮询订单状态（作者确认后立刻返回 unlockToken）
//
// 没有微信支付 API，没有回调，所有"支付完成"靠：
//   - 读者主动点 [我已支付]
//   - 作者在后台手动点 [确认收款]
// 单日 < 50 元 + 单作者，这个流程完全够用

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { genOrderNo } from '../lib/crypto.js';
import { hashFingerprint } from '../lib/fingerprint.js';

const READER_TOKEN_COOKIE = 'reader_token';
const ORDER_TTL_MIN = 30;

export async function paymentRoutes(app: FastifyInstance) {
  // ---------- 创建订单 ----------
  const createSchema = z.object({ postSlug: z.string() });
  app.post('/api/orders', async (req, reply) => {
    const { postSlug } = createSchema.parse(req.body);
    const readerToken = req.cookies[READER_TOKEN_COOKIE];
    if (!readerToken) return reply.code(400).send({ error: 'reader_token_missing' });

    const post = await prisma.post.findUnique({
      where: { slug: postSlug },
      select: { id: true, title: true, priceCents: true, status: true },
    });
    if (!post || post.status !== 'PUBLISHED') {
      return reply.code(404).send({ error: 'post_not_found' });
    }

    // 选一张可用的收款码（取最新一张）
    const qr = await prisma.paymentQR.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!qr) {
      return reply.code(500).send({ error: 'no_payment_qr_configured' });
    }

    // 同一读者同一文章已有 PENDING 订单 → 复用
    const fingerprint = hashFingerprint([readerToken]);
    const existing = await prisma.order.findFirst({
      where: {
        postId: post.id,
        payerFingerprint: fingerprint,
        status: { in: ['PENDING', 'AWAITING_CONFIRM'] },
        expiredAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return {
        orderNo: existing.orderNo,
        amountCents: existing.amountCents,
        qrImage: qr.imageBase64,
        qrLabel: qr.label,
        expiredAt: existing.expiredAt,
        status: existing.status,
        reused: true,
      };
    }

    const order = await prisma.order.create({
      data: {
        orderNo: genOrderNo(),
        amountCents: post.priceCents,
        postId: post.id,
        payerFingerprint: fingerprint,
        paymentQrId: qr.id,
        expiredAt: new Date(Date.now() + ORDER_TTL_MIN * 60_000),
      },
    });

    return {
      orderNo: order.orderNo,
      amountCents: order.amountCents,
      qrImage: qr.imageBase64,
      qrLabel: qr.label,
      expiredAt: order.expiredAt,
      status: order.status,
      reused: false,
    };
  });

  // ---------- 读者点"我已支付" → AWAITING_CONFIRM ----------
  app.post('/api/orders/:orderNo/paid', async (req, reply) => {
    const { orderNo } = req.params as { orderNo: string };
    const readerToken = req.cookies[READER_TOKEN_COOKIE];
    if (!readerToken) return reply.code(400).send({ error: 'reader_token_missing' });

    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (!order) return reply.code(404).send({ error: 'order_not_found' });

    // 校验归属 + 状态
    if (order.payerFingerprint !== hashFingerprint([readerToken])) {
      return reply.code(403).send({ error: 'forbidden' });
    }
    if (order.status !== 'PENDING') {
      return reply.code(409).send({ error: 'invalid_state', currentStatus: order.status });
    }
    if (order.expiredAt < new Date()) {
      return reply.code(410).send({ error: 'order_expired' });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'AWAITING_CONFIRM', awaitingConfirmAt: new Date() },
    });

    return {
      orderNo: updated.orderNo,
      status: updated.status,
      message: '已通知作者，请等待确认（通常几分钟内）',
    };
  });

  // ---------- 轮询订单状态（作者确认后返回 unlockToken） ----------
  app.get('/api/orders/:orderNo', async (req, reply) => {
    const { orderNo } = req.params as { orderNo: string };
    const readerToken = req.cookies[READER_TOKEN_COOKIE];
    if (!readerToken) return reply.code(400).send({ error: 'reader_token_missing' });

    const order = await prisma.order.findUnique({
      where: { orderNo },
      include: { unlock: { select: { token: true } } },
    });
    if (!order) return reply.code(404).send({ error: 'order_not_found' });
    if (order.payerFingerprint !== hashFingerprint([readerToken])) {
      return reply.code(403).send({ error: 'forbidden' });
    }

    // 兜底：超过 expiredAt 自动标 EXPIRED
    let status = order.status;
    if (status === 'PENDING' && order.expiredAt < new Date()) {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'EXPIRED' },
      });
      status = 'EXPIRED';
    }

    return {
      orderNo: order.orderNo,
      status,
      unlockToken: status === 'CONFIRMED' ? order.unlock?.token : undefined,
      expiredAt: order.expiredAt,
    };
  });
}
