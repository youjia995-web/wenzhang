# 付费阅读服务 — 服务器

## 本地开发

```bash
# 1. 配环境变量
cp .env.example .env
# 编辑 .env：填 ADMIN_PASSWORD（强密码）和 2 个随机密钥

# 2. 安装 + 初始化 SQLite
npm install
npm run db:migrate -- --name init
npm run db:seed

# 3. 启动
npm run dev
# → http://localhost:3000
```

打开 `/#/admin` → 用 `ADMIN_PASSWORD` 登录 → 进 `#/admin/qrs` 上传真实收款码。

## Zeabur 部署

1. 推到 GitHub
2. Zeabur → New Service → 选仓库 → **Root Directory 留空，使用仓库根目录**
3. Build / Start Command 留空，让 Zeabur 使用根目录 `zbpack.json`
4. 添加持久卷：Mount Path = `/data`，Size = `1 GiB`
5. 填环境变量（同 `.env.example`），其中 `DATABASE_URL=file:/data/prod.db`
6. 绑定域名 → 打开 `/#/admin` 上传收款码

更新部署时不要删除 Zeabur 的 `/data` Volume，也不要修改 `DATABASE_URL`。文章、收款码和订单都在 `/data/prod.db`，代码更新只会执行增量 migration，不会主动清库。

## 关键 API

| 路径 | 方法 | 说明 |
|------|------|------|
| `GET /api/posts` | GET | 文章列表 |
| `GET /api/posts/:slug` | GET | 文章详情（仅 preview） |
| `GET /api/posts/:slug/content` | GET | 完整内容（需 `X-Unlock-Token`） |
| `POST /api/orders` | POST | 创建订单 → 返回收款码图片 |
| `POST /api/orders/:orderNo/paid` | POST | 读者点"我已支付" |
| `GET /api/orders/:orderNo` | GET | 轮询订单状态 |
| `POST /api/admin/login` | POST | 作者登录 |
| `GET/POST /api/admin/qrs` | - | 收款码管理 |
| `GET/POST /api/admin/orders/.../confirm` | - | 确认/拒绝订单 |
| `GET/POST/PUT/DELETE /api/admin/posts` | - | 文章 CRUD |

## 安全要点

- `content` 字段永远不返回给未解锁用户
- 订单 30 分钟过期自动 EXPIRED
- 同一读者同一文章最多 1 个 PENDING 订单（cookie 指纹去重）
- `unlock token` 是 32 字节随机 hex
- `reader_token` cookie HttpOnly + sameSite=lax
- `ADMIN_PASSWORD` 时序安全比较（防通过响应时间猜密码）
