# 付费阅读服务

> 你一个人写文章 + 微信收款码收款 + 单日 < 50 元收入 → 不需要商户号、不需要营业执照。

## 🚀 一键部署到 Zeabur

[![Deploy on Zeabur](https://zeabur.com/button.svg)](https://zeabur.com)

**5 分钟上线步骤**：

1. 点击上方按钮（或访问 https://zeabur.com 注册）
2. **Sign in with GitHub** → 授权 Zeabur 访问 `youjia995-web/wenzhang`
3. **Create New Project** → 命名 `wenzhang-prod`
4. **Add Service** → **GitHub** → 选 `youjia995-web/wenzhang`：
   - **Root Directory**: 留空 / 使用仓库根目录 ⚠️ 不要填 `server`
   - Build / Start Command 都留空（用根目录 `zbpack.json`，其中 `app_dir` 指向 `server`）
5. **关键步骤 — 挂载持久卷**（必须！否则 SQLite 数据容器重启就丢）：
   - 主服务 → **Settings** → **Volumes** → **Add Volume**
   - **Mount Path**: `/data`
   - **Size**: `1 GiB`（SQLite 单文件足够）
   - 后续每次更新部署都继续使用这个卷，**不要删除 Volume，不要改 Mount Path**
   - ⚠️ 不要在 zbpack.json 里声明 volume，必须在控制台手动添加
6. **添加环境变量**（主服务 → **Variables** 标签）：

| 变量 | 值 | 说明 |
|------|----|------|
| `DATABASE_URL` | `file:/data/prod.db` | SQLite 文件路径（持久卷挂载点）|
| `ADMIN_USERNAME` | `admin` | 后台登录用户名 |
| `ADMIN_PASSWORD` | **你的强密码**（≥12 位）| 后台登录密码 |
| `ADMIN_DISPLAY_NAME` | 你的笔名 | 显示名 |
| `ADMIN_JWT_SECRET` | `openssl rand -hex 32` 生成的 64 字符 | 作者后台 JWT 密钥 |
| `READER_TOKEN_SECRET` | `openssl rand -hex 32` 生成的 64 字符 | 读者 token 密钥 |
| `PUBLIC_BASE_URL` | 你的 Zeabur 域名（先填占位，拿到正式域名再回来改）| 用于生成绝对 URL |

> 数据保留规则：文章、收款二维码、订单都存放在 `/data/prod.db`。更新代码只会运行 `prisma migrate deploy` 做增量迁移，不会清空数据；如果部署后数据没了，优先检查 Zeabur 的 `/data` 持久卷是否仍挂在当前服务上，以及 `DATABASE_URL` 是否仍是 `file:/data/prod.db`。

7. 等首次部署完成（约 2-3 分钟，会自动跑 `prisma migrate deploy` 建表）
8. **Settings** → **Domains** → **Generate Domain**（拿到 `xxx.zeabur.app`）
9. 把域名填回 `PUBLIC_BASE_URL` → 服务自动重启生效
10. 浏览器打开 `https://你的域名/#/admin` → 用 `ADMIN_PASSWORD` 登录
11. 进 `#/admin/qrs` 上传你的微信收款码 → 进 `#/admin/posts` 发文章

---

## 本地开发

```bash
cd server
cp .env.example .env       # 填 ADMIN_PASSWORD 和 2 个随机密钥
npm install
npm run db:migrate -- --name init   # 生成 + 应用 migration
npm run db:seed                     # 创建示例收款码和示例文章
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)

> 本地 SQLite 文件存放在 `server/prisma/data/dev.db`（gitignored，Prisma 把相对路径解析到 schema 所在目录）

## 首次使用

1. 打开 `http://localhost:3000/#/admin`，用 `ADMIN_PASSWORD` 登录
2. 进 `#/admin/qrs` **上传你的真实微信收款码**（替换占位图）
3. 进 `#/admin/posts` 改示例文章或新建

## 项目结构

```
有偿文章阅读/
├── server/    Node.js + Fastify + Prisma + SQLite 后端
│   ├── prisma/        schema + migrations + seed + dev.db（gitignored）
│   ├── scripts/       postbuild 脚本（复制 web/ 到 dist/）
│   ├── zbpack.json    后端目录部署兜底配置
│   └── data/          （无，SQLite 文件落在 prisma/data/）
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

**零**前置条件 — 不需要营业执照、不需要商户号、不需要公众号、不需要单独的数据库服务。
只要：
- 一个 Zeabur 账号（免费 Hobby 也够）
- 你的微信收款码图片

## 为什么用 SQLite 而不是 PostgreSQL

- 数据量小（单作者、单读者、几十篇文章）→ SQLite 性能完全够用
- 单文件、零运维、随项目备份
- Zeabur 持久卷挂载 `/data` → 重启/重新部署数据不丢
- 部署架构少一个服务（不用加 PostgreSQL marketplace 服务）
- 启动时间比 PG 快 1-2 秒

## Zeabur 部署的配置文件

- `zbpack.json` — Zeabur 主配置：从仓库根目录部署，`app_dir` 指向 `server`
- `server/zbpack.json` — 后端目录部署兜底配置；如果 Zeabur 的 Root Directory 填成 `server`，构建会因为找不到根目录 `web/` 而失败，避免线上无前端文件
- `server/package.json` 的 `postbuild` — 把 `web/` 复制到 `dist/web/`
- `server/scripts/copy-web.js` — 跨平台复制脚本
