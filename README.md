# 付费阅读服务

> 你一个人写文章 + 微信收款码收款 + 单日 < 50 元收入 → 不需要商户号、不需要营业执照。

## 立即开始

1. **阅读 [docs/实施方案.md](docs/实施方案.md)** — 从架构到部署全流程
2. **本地跑通**：
   ```bash
   cd server
   cp .env.example .env       # 填 ADMIN_PASSWORD 和 2 个随机密钥
   docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name pg-paid postgres:16
   npm install
   npm run db:migrate -- --name init
   npm run db:seed
   npm run dev
   ```
3. **打开** [http://localhost:3000](http://localhost:3000)

## 首次使用

1. 打开 `http://localhost:3000/#/admin`，用 `ADMIN_PASSWORD` 登录
2. 进 `#/admin/qrs` **上传你的真实微信收款码**（替换占位图）
3. 进 `#/admin/posts` 改示例文章或新建

## 项目结构

```
有偿文章阅读/
├── server/    Node.js + Fastify + Prisma 后端
├── web/       读者 + 作者前端（原生 JS SPA）
└── docs/
    └── 实施方案.md   从这里开始读
```

## 核心流程

```
读者点 "解锁" → 看到你的收款码 → 微信扫码付款（备注订单号）
→ 读者点 "我已支付" → 你在后台点 "确认收款" → 自动解锁
```

详见 [docs/实施方案.md §3](docs/实施方案.md#3-关键流程详解)。

## 前置条件

**零**前置条件 — 不需要营业执照、不需要商户号、不需要公众号。
只要：
- 一个 Zeabur 账号（$5/月起）
- 你的微信收款码图片
