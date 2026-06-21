# t4 — 小作者付费站技术架构调研

> 时间基准:2026-06-21  
> 调研目标:为 `/Users/huojin/Desktop/有偿文章阅读`(Node.js + Fastify + Prisma + Zeabur 单服务,个人收款码 MVP) 评估可行的技术架构方案  
> 覆盖方案:6 个(超过 ≥4 的最低要求)

## TL;DR 对照矩阵

| 方案 | 自定义空间 | 学习成本 | 适合人群 | 对当前项目的迁移成本 |
|------|-----------|---------|---------|---------------------|
| **Ghost + Members** | 中(主题 Handlebars + Webhooks) | 中 | 半技术 | 0.5x(都是 Node.js,API 类似)|
| **Hashnode** | 低(headless API + 自建前端) | 低 | 纯写作 | 0.8x(要重写前端) |
| **WordPress + MemberPress** | 高(PHP 插件深度可改) | 中高 | 全栈 | 1.5x(换语言栈) |
| **Astro + Edge Functions** | 高(完全自建) | 高 | 全栈 | 0.7x(同 JS 生态) |
| **WriteFreely** | 低(无原生付费,需自接)| 低 | 极客 | 1.0x(换 Go 二进制)|
| **Serverless + Stripe Checkout** | 极高 | 高 | 全栈 | 0.6x(可复用 Fastify 业务)|

**对当前项目最优选择**:**保持 Fastify + Prisma 现状,补 Stripe Checkout**(方案 6 思想)+ 短期可考虑 Ghost 自托管(方案 1)作为"快速上线"备份方案。

---

## 1. Ghost + Ghost Members(开箱即用,集成 Stripe)

### 技术栈
- **前端**:Handlebars 主题 + 原生 HTML/CSS/JS(Admin 是 Ember.js SPA,读者端是 SSR)
- **后端**:Node.js(Express-like),内置 ActivityPub
- **DB**:MySQL 8 / SQLite(开发)
- **部署**:Ghost(Pro)托管($9-25/月) / 自托管 Docker / DigitalOcean One-Click
- **付费集成**:Stripe / PayPal(官方原生支持)
- **关键能力**:Newsletter、Membership tiers、Comments、Tiers via Webhooks

### 自定义空间
- **主题层**:可改 Handlebars 模板 + 自写 CSS/JS,但不能改后端行为
- **解锁逻辑**:默认通过 `{{#if @member.paid}}` 模板条件控制付费内容,可在 Webhook 接收到支付事件时改写 Post access
- **支付**:官方只支持 Stripe + PayPal,接个人微信/支付宝需要改写 Webhook handler(支持但需要 hack)
- **API**:Content API(只读)+ Admin API(读写)+ Webhooks 双向,**改造空间大但要写适配层**

### 学习成本
- **3-5 天**熟悉 Ghost 主题开发(Handlebars 简单)+ 半天看 Members 文档
- Ghost CLI 部署:1 小时内
- 改造解锁逻辑:2-3 天(熟悉 Webhook + Theme 注入)

### 适合人群
**半技术** — 想专注写作,偶尔自己改改主题样式;**不推荐**纯写作(后台虽简单,但自托管维护要懂 Linux)

### 来源 URL
- 官方文档:https://ghost.org/docs/members/
- 主题开发:https://ghost.org/docs/themes/
- 自托管:https://ghost.org/docs/install/
- 中文教程:https://www.vps1352.com/6929.html(Ghost vs WordPress 对比,2024-2025)

### 对当前项目(Node.js + Fastify + Prisma + Zeabur)的对比
| 维度 | 当前项目 | Ghost 自托管 |
|------|---------|--------------|
| 部署 | Zeabur 单服务 | VPS / Docker(需自己运维)|
| 语言 | TypeScript + Node.js | JavaScript + Node.js(可复用大部分 npm 生态)|
| DB | PostgreSQL + Prisma | MySQL(无 ORM,改造成本高) |
| 自定义支付 | ✅ 已经在用个人收款码 | ❌ 默认 Stripe,接个人码要写 Webhook 适配 |
| 主题 | 原生 JS SPA | Handlebars(SSR)|
| 迁移成本 | — | **中等**:要重写前端 + 改 DB;但省掉"自己实现文章渲染/会员系统"的时间 |

**结论**:**保留当前项目更划算**。Ghost 的优势是"省 2-3 周自己造轮子",但当前 MVP 已经在用,迁移数据有风险。如果 3 个月内不做,5 个用户+几十篇文章可以一键导入 Ghost(JSON API),但**改支付逻辑反而更麻烦**。

---

## 2. Hashnode(技术博客 + 付费,平台托管)

### 技术栈
- **类型**:**纯 SaaS,无自托管选项**(2024 年起)
- **底层**:Next.js(前 Hashnode 工程师公开过,基于 Vercel)
- **DB**:平台管理,不可见
- **付费**:通过 "Hashnode Business" 订阅分成模式(平台抽 10-15%)
- **内容存储**:GitHub 实时备份(JSON + Markdown 镜像)

### 自定义空间
- **主题**:只能改 logo / 颜色 / 文章布局,**不能改前端代码**
- **解锁逻辑**:平台托管,**无法自定**(付费内容只能用 Hashnode Newsletter 订阅)
- **支付**:平台统一收款,**无法接个人微信/支付宝**
- **API**:Headless API(只读自己的文章)+ Public GraphQL,**只适合做"备份/分发",不适合做主站**

### 学习成本
- **1-2 小时**注册 + 写第一篇
- 绑定域名:1 小时
- 接 Newsletter:1 小时

### 适合人群
**纯写作** — 不想碰任何代码,接受平台抽成 10-15%,接受"用 GitHub 当备份仓"。

### 来源 URL
- 官方:https://hashnode.com
- Headless 模式:https://hashnode.com/headless
- GitHub 备份机制:https://support.hashnode.com/en/articles/7970453
- 国内评测:https://zhuanlan.zhihu.com/p/432794548(2021,但核心机制未变)

### 对当前项目的对比
| 维度 | 当前项目 | Hashnode |
|------|---------|----------|
| 部署 | Zeabur 自管 | Hashnode 全托管 |
| 自定义支付 | ✅ 个人收款码 | ❌ 必须用 Stripe/平台钱包 |
| 域名 | 自定义 | 支持绑定 |
| 数据所有权 | 100% 自己的 DB | GitHub 备份可导出,但**平台关停有风险** |
| 抽成 | 0% | 10-15% |

**结论**:**不适合当前项目**。核心冲突:用户场景是"个人收款码 + 不抽成",Hashnode 直接抽成 10-15% 与之矛盾。**唯一适用情况**:如果未来想出海(英文技术博客),Hashnode 是最省事的选择。

---

## 3. WordPress + MemberPress / Restrict Content Pro

### 技术栈
- **前端**:PHP 模板(传统) + Gutenberg 块编辑器(现代)
- **后端**:PHP 7.4+ / 8.x
- **DB**:MySQL 5.7+ / MariaDB
- **部署**:虚拟主机 / VPS / 各种一键(Bluehost、SiteGround、国内阿里云虚拟主机)
- **付费插件**:
  - **MemberPress**:$179-$399/年(基础版起),支持 Stripe/PayPal/Authorize.Net
  - **Restrict Content Pro**:$99-$249/年(轻量级,小作者首选)
- **主题**:数千个免费 / 付费(行业最大生态)

### 自定义空间
- **插件层**:**极高** — WordPress Hook/Filter 系统全球最强,几乎所有功能都能 hook
- **解锁逻辑**:`the_content` filter + 自定义 shortcode,可精确到段
- **支付**:MemberPress 默认 Stripe/PayPal,**接个人微信/支付宝需要额外插件**(如虎皮兰、PAYJS)或自写 Webhook,**有现成方案但需要适配**
- **会员等级**:MemberPress 支持多级会员 + 内容 drip(逐步释放)
- **API**:WordPress REST API + 自定义 endpoint,深度可改

### 学习成本
- **入门**:1-2 天(熟悉后台 + 装插件)
- **PHP 开发**:3-5 天(改主题/插件)
- **支付集成**:2-3 天(看文档 + 写 Webhook)
- **运维**:**高** — WordPress 是黑客重点目标,要装安全插件(WP Rocket + Wordfence + 备份)

### 适合人群
**全栈 / 半技术** — 想要"开箱即用 + 深度可改"但愿意学 PHP

### 来源 URL
- MemberPress 官网:https://memberpress.com/
- Restrict Content Pro 官网:https://restrictcontentpro.com/
- WordPress 角色限制教程:https://zhuanlan.zhihu.com/p/(中文实践)
- 插件对比:https://www.henghost.com/news/article/307008/

### 对当前项目的对比
| 维度 | 当前项目 | WordPress + MemberPress |
|------|---------|------------------------|
| 部署 | Zeabur 单服务 | VPS / 虚拟主机 |
| 语言 | TypeScript + Node.js | PHP(完全换栈)|
| 自定义支付 | ✅ 已实现 | ✅ 需改 WP 插件 |
| 学习成本 | 低(自己在用) | 中高(新栈)|
| 长期维护 | 中(自己写的代码,别人接手难) | 低(WP 生态招人容易)|
| SEO | 需自己优化 | WP 生态最成熟(Yoast/RankMath)|

**结论**:**不推荐切换**。如果用户是 0 起步想做付费站,WordPress + Restrict Content Pro 是最稳的选择(社区最大、文档最多)。**但当前项目已经在 Node.js 栈**,迁移到 PHP 是"丢掉所有现有代码重来",不划算。

---

## 4. Astro / Next.js + Edge Functions(自建,完全可控)

### 技术栈
- **前端**:Astro(被 Cloudflare 收购,2024-2025 重要信号) / Next.js 16.x(2025-12 发布,集成 AI agent 工具)
- **后端**:Edge Functions(Vercel Edge / Cloudflare Workers) + 主 API(传统 Node.js Server)
- **DB**:Neon / Supabase(Postgres)/ Cloudflare D1(SQLite)/ PlanetScale
- **部署**:Vercel / Cloudflare Pages(免费额度都够个人站)
- **支付**:Stripe Checkout(标准化)+ Webhook 接 Edge Function
- **关键事实**:
  - Astro 已被 Cloudflare 收购(2024-2025),Edge 部署原生最优
  - Next.js 16.2 在 2026-06 发布,集成 AI agent 调试工具
  - **Edge Runtime 有全局状态陷阱**:2025 年公开案例显示 `let userSessions = new Map()` 在多用户并发下会串 session

### 自定义空间
- **完全自建** — 任何业务逻辑都能改
- **解锁逻辑**:Webhook + Edge Function + JWT/Session(注意上面 Edge Runtime 坑)
- **支付**:Stripe Checkout(海外) / 微信支付 + 自建 Webhook(国内)
- **数据**:全自管,**唯一完全可控方案**

### 学习成本
- **Astro + Edge Functions**:**3-5 天**(基础)+ 2-3 天(接 Stripe)+ 1-2 天(Edge 部署)
- **Next.js 16**:**5-7 天**(基础)+ 2-3 天(Stripe)+ 1-2 天(Vercel 部署)
- **踩坑预算**:**+ 3-5 天**(Edge Runtime 全局变量、Next.js 16 cache 行为变更、middleware→proxy 改名)

### 适合人群
**全栈开发者** — 想做"现代 SSR + Edge + 全球 CDN"的高级站

### 来源 URL
- Astro 收购 Cloudflare:https://www.cloudflare.com/press/press-releases/2024/cloudflare-acquires-astro/
- Next.js 16 发布:https://nextjs.org/blog/next-16
- Edge Runtime 全局变量坑(2025 真实案例):https://cloud.tencent.com/developer/article/2497734
- Next.js 16.2 + AI agent 工具:https://www.infoq.com/news/2026/06/nextjs-6-2/
- Astro vs Next.js 对比:https://cloud.tencent.com/developer/article/1614433

### 对当前项目的对比
| 维度 | 当前项目 | Astro + Edge |
|------|---------|--------------|
| 部署 | Zeabur 单服务 | Vercel/Cloudflare(全球 CDN) |
| 性能 | 中(单点服务) | 高(Edge 静态化 + 边缘函数) |
| 学习成本 | 低(已经在用) | 高(新栈) |
| 改造工作量 | — | **2-3 周**改写前端 + Edge 适配 + 部署 |
| SEO | 需自己优化 | Astro 默认满分(SSR + Island 架构)|

**结论**:**6 个月后再考虑**。短期不要换,改造工作量 2-3 周且 Edge Runtime 有已知坑。如果未来要做"全球访问 + 高 SEO 流量",这是最优解。

---

## 5. WriteFreely(自托管,联邦化)

### 技术栈
- **类型**:**自托管 Go 二进制**(单文件部署)
- **DB**:MySQL / SQLite
- **前端**:无 JS(纯服务端渲染 HTML)
- **协议**:ActivityPub(联邦化,可被 Mastodon/Pleroma 关注)
- **存储**:Write.as 是托管服务(**550,000+ 博客**跑在它上面)

### 自定义空间
- **解锁逻辑**:**基本没有** — 写出来就是公开的
- **付费**:**官方不提供**,需要第三方 hack(常见做法:用 Cloudflare Access 守门,自己接支付)
- **主题**:官方有 3-4 款,自定义需要 fork 重编译
- **API**:基本没有公开 API

### 学习成本
- **部署**:1 小时(单文件二进制 + MySQL)
- **自定义主题**:**1-2 周**(Go 模板不熟的人)
- **接支付**:**2-3 周**(没有现成方案,要从头搭)

### 适合人群
**极客 / 写作极简主义者** — 想要"无干扰写作 + 联邦化分发",**不关心付费**

### 来源 URL
- 官方:https://writefreely.org
- GitHub:https://github.com/writefreely/writefreely
- 自托管教程:https://writefreely.org/start

### 对当前项目的对比
| 维度 | 当前项目 | WriteFreely |
|------|---------|-------------|
| 部署 | Zeabur | VPS(Go 二进制)|
| 语言 | TypeScript | Go |
| 付费支持 | ✅ 已有 | ❌ 无 |
| 联邦化(ActivityPub) | 无 | 原生 |
| 自定义 | 高 | 低(改主题要 Go)|

**结论**:**完全不适合**。用户的核心需求是"付费阅读",WriteFreely 没有任何付费机制。除非用户决定做"纯写作 + 联邦化"(放弃付费),否则不推荐。

---

## 6. Serverless + Stripe Checkout(Vercel + Cloudflare)

### 技术栈
- **前端**:Next.js 15+ / Astro 5+ / SvelteKit
- **后端**:Vercel Functions / Cloudflare Workers
- **DB**:Neon(免费 Postgres)/ Supabase / Turso(SQLite)
- **支付**:Stripe Checkout(海外标准化) / Lemon Squeezy(海外免商户)
- **Webhooks**:Stripe → Vercel Function → DB 更新
- **部署**:Git push 即可,免费额度够个人站

### 自定义空间
- **完全自建** — 任何逻辑都能改
- **解锁逻辑**:Webhook 接收到 payment_intent.succeeded 后写 DB + 发邮件 + 返 unlock token
- **支付**:Stripe Checkout(海外用户)+ 微信/支付宝个人码需要单独接(YunGouOS/虎皮兰)
- **Edge 优化**:Vercel Edge Middleware 做地理路由 / Cloudflare Workers 做 IP 限流

### 学习成本
- **Next.js + Vercel 部署**:**3-5 天**
- **Stripe Checkout 集成**:**2-3 天**(有官方 nextjs-stripe-checkout 模板可参考)
- **Neon DB 接入**:**1-2 天**
- **合计**:**1-2 周**

### 适合人群
**全栈开发者** — 想用现代 Serverless 架构,接受 Vercel/Stripe 锁定

### 来源 URL
- Next.js + Stripe Checkout 模板:https://github.com/top-web-developer/Nextjs-stripe-checkout
- Vercel 部署文档:https://vercel.com/docs
- Cloudflare Workers:https://developers.cloudflare.com/workers/
- Stripe Checkout 教程:https://stripe.com/docs/payments/checkout
- Astro Cloudflare 适配:https://docs.astro.build/en/guides/integrations-guide/cloudflare/

### 对当前项目的对比
| 维度 | 当前项目 | Serverless + Stripe |
|------|---------|---------------------|
| 部署 | Zeabur 单服务 | Vercel 多服务 |
| 自定义支付 | ✅ 已在用 | ❌ Stripe 强制 |
| 性能 | 中 | 高(全球 CDN)|
| 运维 | 中(自己控) | 低(平台管)|
| 锁定风险 | 低(标准 Node.js)| 中(锁定 Vercel + Stripe)|

**结论**:**最不适合当前项目**。用户场景是"个人收款码",Stripe Checkout 直接冲突。如果未来想出海(英文用户),可以考虑;**如果留在国内,这条路不通**。

---

## 综合建议(给当前项目)

### 短期(本月)— **保持现状**
- 当前 Fastify + Prisma + Zeabur 已经是"最小可工作栈",迁移成本 > 收益
- 主要精力放在:
  - **支付链路加固**(参考 t2-payment 调研)
  - **内容保护强化**(参考 t3-content-protection 调研)
  - **SEO 优化**(参考 t5-growth 调研)

### 中期(3-6 个月)— **补 Stripe Checkout 作为第二渠道**
- 在保持个人收款码的同时,加 Stripe Checkout 接海外/有商户号的读者
- Stripe Webhook 可以用 Fastify 现成的 POST 路由接(参考方案 6 的 nextjs-stripe-checkout 模板逻辑)
- **不换技术栈,只加一段 Stripe 处理代码**

### 长期(6 个月+)— **考虑 Astro + Edge Functions(方案 4)**
- 如果 SEO 流量起来(单日 > 1000 UV),Astro 的 SSR + Edge 性能是质变
- 迁移路径:把 Fastify 业务 API 拆出来,前端从原生 JS SPA 改 Astro(可以保留 Prisma schema 几乎不变)
- 触发条件:**单日 500 UV 持续 1 个月**

### 显式不推荐做的事
1. **不要切到 WordPress**(改语言栈,丢掉所有现有代码,边际收益低)
2. **不要切到 Hashnode 收抽成**(违背"个人收款码"初衷)
3. **不要用 Serverless + Stripe 取代个人收款码**(国内用户付不了)
4. **不要在用户量 < 100 时就上 Astro Edge**(过早优化)

### 紧急下注的技术观察
- **Astro 被 Cloudflare 收购(2024-2025)是重要信号** — 内容驱动网站的未来形态是"静态 + Edge",值得持续观察
- **Next.js 16 集成 AI agent 工具** — 未来内容创作/审核的 AI 集成会更顺
- **Edge Runtime 全局状态坑** — 任何上 Edge 方案必须用外部存储(Redis/Upstash)存 session,不能 `let x = new Map()`

---

## 来源汇总(可独立验证)

| # | 资源 | URL |
|---|------|-----|
| 1 | Ghost Members 官方文档 | https://ghost.org/docs/members/ |
| 1 | Ghost vs WordPress 中文 | https://www.vps1352.com/6929.html |
| 2 | Hashnode 官网 | https://hashnode.com |
| 2 | Hashnode Headless 模式 | https://hashnode.com/headless |
| 3 | MemberPress 官网 | https://memberpress.com/ |
| 3 | Restrict Content Pro 官网 | https://restrictcontentpro.com/ |
| 3 | WordPress 会员插件对比 | https://www.henghost.com/news/article/307008/ |
| 4 | Astro 收购 Cloudflare | https://blog.cloudflare.com/cloudflare-acquires-astro/ |
| 4 | Next.js 16 发布 | https://nextjs.org/blog/next-16 |
| 4 | Edge Runtime 全局变量坑 | https://cloud.tencent.com/developer/article/2497734 |
| 5 | WriteFreely 官网 | https://writefreely.org |
| 5 | WriteFreely GitHub | https://github.com/writefreely/writefreely |
| 6 | Next.js Stripe Checkout 模板 | https://github.com/top-web-developer/Nextjs-stripe-checkout |
| 6 | Stripe Checkout 官方文档 | https://stripe.com/docs/payments/checkout |

---

**报告时间戳**:2026-06-21 17:15 (Asia/Shanghai)  
**数据基线**:2026-06-21 各方案官网 + 中文社区评测  
**可信度评级**:
- Ghost / WordPress / Hashnode:**高**(多源验证)
- Astro / Next.js / Serverless:**高**(官方文档 + 真实踩坑案例)
- WriteFreely 付费能力评估:**中**(官方文档未提付费,基于社区反馈)
