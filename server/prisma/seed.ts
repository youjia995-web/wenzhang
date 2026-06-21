// 种子数据 — 本地开发时初始化
import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'node:crypto';

const prisma = new PrismaClient();

async function main() {
  // 创建一个示例收款码（占位 1x1 透明 PNG）
  // 真实使用时在后台 /#/admin/qrs 上传你的微信收款码替换
  const placeholderQr =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

  const existingQr = await prisma.paymentQR.findFirst();
  if (!existingQr) {
    await prisma.paymentQR.create({
      data: {
        label: '示例收款码（请在后台替换为你的微信收款码）',
        imageBase64: placeholderQr,
        isActive: true,
      },
    });
  }

  const slug = 'hello-paid-article';
  const exists = await prisma.post.findUnique({ where: { slug } });
  if (!exists) {
    await prisma.post.create({
      data: {
        slug,
        title: '示例：付费阅读解锁',
        summary: '这是一篇示例文章，演示扫码付款 + 作者确认 → 自动解锁的完整流程。',
        preview:
          '## 公开预览\n\n这是文章开头 30% 的内容，读者可以看到这一段。\n\n' +
          '如果觉得有价值，扫码 ¥9.9 即可解锁完整内容。',
        content:
          '## 完整内容\n\n这是付费后的完整正文。\n\n' +
          '可以放完整数据、深度分析、独家观点。\n\n' +
          '感谢支持！',
        priceCents: 990,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });
  }

  console.log('Seed done.');
  console.log('作者后台密码：', process.env.ADMIN_PASSWORD || 'admin123456 (default)');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
