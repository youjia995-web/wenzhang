# 付费阅读服务

> 你一个人写文章 + 微信收款码收款 + 单日 < 50 元收入 → 不需要商户号、不需要营业执照。

## 🚀 一键部署到 Zeabur

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com)

**5 分钟上线步骤**：

1. 点击上方按钮（或访问 https://zeabur.com 注册）
2. **Sign in with GitHub** → 授权 Zeabur 访问 `youjia995-web/wenzhang`
3. **Create New Project** → 命名 `wenzhang-prod`
4. **Add Service** → **Marketplace** → 选 **PostgreSQL** → Add（等 30 秒启动）
5. **Add Service** → **GitHub** → 选 `youjia995-web/wenzhang` → **关键配置**：
   - **Root Directory**: `server` ⚠️ 必须填
   - Build Command / Start Command 留空（用 `server/zbpack.json`）
6. 等首次部署完成（约 2-3 分钟，会自动跑 `prisma migrate deploy` 建表）
7. 进 PostgreSQL 服务 → **Connection Info** → 复制 **Connection URL**（Zeabur 会自动注入到主服务 `DATABASE_URL`，但先复制备用）
8. 主服务 → **Variables** 标签 → 添加以下环境变量（缺一不可）：

| 变量 | 值 | 说明 |
|------|----|------|
| `ADMIN_USERNAME` | `admin` | 后台登录用户名 |
| `ADMIN_PASSWORD` | **你的强密码**（≥12 位）| 后台登录密码 |
| `ADMIN_DISPLAY_NAME` | 你的笔名 | 显示名 |
| `ADMIN_JWT_SECRET` | `openssl rand -hex 32` | 作者后台 JWT 密钥 |
| `READER_TOKEN_SECRET` | `openssl rand -hex 32` | 读者 token 密钥 |
| `PUBLIC_BASE_URL` | Zeabur 生成的域名（先填 `http://placeholder.zeabur.app`，拿到正式域名再回来改） | 用于生成绝对 URL |

9. 主服务 → **Settings** → **Domains** → **Generate Domain**（拿到 `xxx.zeabur.app`）
10. 把域名填回 `PUBLIC_BASE_URL` → 服务自动重启生效
11. 浏览器打开 `https://你的域名/#/admin` → 用 `ADMIN_PASSWORD` 登录 → 上传收款码 + 发文章

> **DATABASE_URL 不用手动配** — Zeabur 自动从同项目下的 PostgreSQL 服务注入。

---

## 本地开发

```bash
cd server
cp .env.example .env       # 填 ADMIN_PASSWORD 和 2 个随机密钥
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres --name pg-paid postgres:16
npm install
npm run db:migrate -- --name init
npm run db:seed
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

## 首次使用

1. 打开 `http://localhost:3000/#/admin`，用 `ADMIN_PASSWORD` 登录
2. 进 `#/admin/qrs` **上传你的真实微信收款码**（替换占位图）
3. 进 `#/admin/posts` 改示例文章或新建

## 项目结构

```
有偿文章阅读/
├── server/    Node.js + Fastify + Prisma 后端（含 zbpack.json 一键部署配置）
├── web/       读者 + 作者前端（原生 JS SPA）
└── docs/
    └── 实施方案.md   从这里读架构和业务流程
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
- 一个 Zeabur 账号（$5/月起，免费 Hobby 也够）
- 你的微信收款码图片

## Zeabur 部署的配置文件

- `server/zbpack.json` — Zeabur 构建/启动/健康检查配置（已配好）
- `server/package.json` 的 `postbuild` — 把 `web/` 复制到 `dist/web/`（因为 Zeabur Root Directory=server，web/ 不会被 checkout 进来）
- `server/scripts/copy-web.js` — 跨平台复制脚本