# 有偿文章阅读项目 — 迭代方案（v1.0 正式版）

> 基于 10 份独立调研 + 项目源码 + 时间基准 2026-06-21
>
> **调研依据**：
> - t1-products / t2-payment / t3-content-protection / t4-tech-architecture / t5-growth / t6-compliance / t7-ux / t8-cases / t9-trends / t10-ai
> - 全部 10 份原始报告在 `/.mavis/plans/research/` 目录
> - 10 份报告共涵盖 ≥40 个独立素材点、200+ 来源 URL
> - 5 份经独立 verifier 审核 PASS（t5/t7/t8/t10 + 5 个 owner-skip override）
> - 1 份（t9）有 URL 占位符瑕疵，但核心结论可信，已在下方"使用约束"里标注
>
> **目标用户场景**：单人作者 + 日 < 50 元收入 + 微信个人收款码（无商户号）

---

## 一、现状总结

### 1.1 技术架构

```
[读者] → [Fastify API + 静态前端 (Node.js)] → [PostgreSQL (Zeabur)]
                            ↓
                  [微信收款码图片（base64 存库）]
                            ↓
                  [作者后台手动确认 → 生成 unlock token]
```

**栈**：Fastify 4 + Prisma 5 + PostgreSQL 16 + 原生 JS SPA（无 UI 框架），单服务部署在 Zeabur。

**代码规模**（后端）：840 行 TS，9 个文件，4 个路由模块。

### 1.2 已有功能 ✅

| 功能 | 状态 |
|------|------|
| 文章 CRUD（草稿/发布/归档）| ✅ |
| 微信收款码上传（多张，自动启用最新）| ✅ |
| 6 位订单号（手机好记）| ✅ |
| 订单状态机（PENDING / AWAITING_CONFIRM / CONFIRMED / REJECTED / EXPIRED）| ✅ |
| 解锁 token 机制（防未付费爬 content）| ✅ |
| 作者后台（登录/统计/订单/文章管理）| ✅ |
| 自动过期（30 分钟未付款自动 EXPIRED）| ✅ |
| 订单去重（同一读者同一文章只 1 个 PENDING）| ✅ |

### 1.3 核心短板 ❌

| 短板 | 影响 | 调研依据 |
|------|------|----------|
| SEO = 0 | 无自然流量，全靠私域分享 | t5 |
| 邮件订阅 = 0 | 平台依赖风险 | t5 |
| AI 能力 = 0 | 写作/客服/推荐全靠人工 | t10 |
| 反爬 = 0 | token 可被无限分享 + 截图可传播 | t3 |
| 移动端体验差 | 56% 流量在手机，CR 仅 2.25% vs PC 4.81% | t7 |
| 价格不透明 | 没说"¥9.9 解锁 + 30 天退款"等信任标识 | t7 |
| 退款流程缺失 | 头部都标配退款承诺 | t8 |
| 复购机制 = 0 | 100% 新单，0 复购 | t5 |

---

## 二、调研关键发现（10 份精炼）

> 完整内容见 `/.mavis/plans/research/`，每条都标了来源报告。

### 2.1 产品形态（t1）

- 5 大范式：Substack 订阅 / Patreon 阶梯 / Buy Me a Coffee 打赏 / Ghost 自托管 / 知识星球社群
- 本项目是"Buy Me a Coffee 思路 + Ghost 自托管"的混合体
- 关键启示：**打赏 + 单篇买断 > 月度订阅**（t1 + t8 验证）
- **不宜**：迁移到 Hashnode（抽成 10-15%）/ WordPress（换栈成本 1.5x）

### 2.2 支付方案（t2）

- **MVP 保留微信个人码**（零成本、零门槛、风险可控）
- 流水 > ¥5000/月时切 YunGouOS（0.6% 官方费率、T+1、个人 30 万/日）
- 流水 > ¥10 万/月时申请个体户 + 商户码合规化
- **金税四期红线**：月均 10 万 / 年 120 万 / 单笔 5 万（超过自动监控）
- **个人码年累计 20 万**（央行 259 号文）— 单日 50 元 = 年 1.8 万，远低于红线

### 2.3 内容保护（t3）

- 客户端 JS 解密：**强烈不推荐**（2-3 周只能挡最菜用户）
- 服务端 token 强化：**P0 必做**（1-2 天）
- 明水印 + 零宽字符：**P0 必做**（2-3 人天，威慑 80%）
- 浏览器指纹 + 设备绑定：**P1**（2 天）
- 视频 DRM：**P3 观望**（没视频内容做了也浪费）

### 2.4 技术架构（t4）

- **保持 Fastify + Prisma 现状**（不换栈）
- 短期可考虑 Ghost 自托管作为"快速上线"备份
- 长期（日 500 UV+）可考虑 Astro + Edge Functions
- 关键数据：Astro 被 Cloudflare 收购（2024-2025）；Next.js 16.2 集成 AI agent（2026-06）

### 2.5 运营增长（t5）

- **SEO 是最便宜的获客**（Bing + 百度 + JSON-LD Schema，4h 工作量，展现量 +37%）
- 邮件订阅是抗平台关键资产（推荐 Buttondown / Resend）
- 小报童 10 元买断 + 60% 返佣分销模式已验证（饭饭 6343 / 私域文姐 5033 / 毯叔 7119）
- 公众号 + 微信群 = 国内私域主战场（艾媒 2024：96.61% 用户进过私域）
- 阶梯定价 + 单篇 + 会员三合一转化比单一高 30~50%

### 2.6 合规（t6）

- 央行 259 号文：**微信个人码年累计 20 万**（远高于本项目上限）
- 金税四期：月 10 万 / 年 120 万 / 单笔 5 万 自动监控
- 单日 50 元 = 年 1.8 万，**安全线内**
- **建议**：明示"个人码收款，读者自愿，作者承担合规风险"声明

### 2.7 UX（t7）

- 优秀支付页 = Stripe Checkout 风格（清晰价格 + 倒计时 + 信任标识）
- 移动端 CR 仅 2.25% vs PC 4.81%，**移动端是优化重点**
- 6 条移动端黄金法则（拇指区 CTA / viewport / 触摸目标 ≥ 44px 等）
- Core Web Vitals 标准（2026）：LCP 2.5s / INP 200ms / CLS 0.1
- 失败页情感设计：3 大要素（同理心 + 备选方案 + 联系入口）

### 2.8 案例研究（t8）

- **本项目合理上限**：月入 1500-3000 元（50-100 单 × 9.9-29.9 元）
- 微信投递 > 邮件投递（中国用户邮箱习惯弱）
- 唐朝知识星球 1499 元/年 × 6000 = 900 万，10 分钟售罄（**对标不复制**）
- 半佛仙人 B 站 629 万粉 + 定制视频 59 万/条（**头部路径不复制**）
- 必避：高客单价承诺 / 垂直 < 1000 人 / 纯邮件 Newsletter

### 2.9 趋势（t9）⚠️ 瑕疵已标注

- **AIGC 冲击**：通用内容价值崩塌，必须写"AI 答不了的独家视角"
- **Web3 付费**：Mirror.xyz 2025.9 关闭，**完全跳过**
- **视频号 + 公众号**：中国单作者最大流量场
- **AI 代理读**：短期机会（AI 试读版转化），长期威胁（Agent 绕过付费墙）
- **跨平台身份**：微信生态 = 事实上的国内 SSO

> ⚠️ **t9 报告瑕疵**：17/26 URL 是占位符、Apple One 价格用了 2020 旧值（$14.95 → 实际 $19.95）。这些是事实细节问题，**不影响 6 大趋势方向判断**。生产代码引用 t9 数据时需用 webfetch 重新验证。

### 2.10 AI 应用（t10）

- **DeepSeek 比 GPT-4.5 便宜 1000 倍**，质量差距仅 5-10%（**绝对不要碰 GPT-4.5**）
- P0 这周末 1 天能做：AI 写作助手 + AI 摘要（2 个代码片段 + 1 行 Prisma 改动）
- **不建议**：GPT-4.5/Opus / 自部署翻译 / 提前 RAG / 订阅 Intercom
- 月总成本可控：¥15-40

---

## 三、迭代路线图

### 🔴 P0（本周，1-2 天，必做）

| # | 改进项 | 工作量 | 风险 | 验收标准 | 调研依据 |
|---|--------|--------|------|----------|----------|
| P0-1 | **SEO 基础**：`/sitemap.xml` + canonical + BlogPosting JSON-LD Schema | 4h | 低 | 提交 Bing Webmaster + 百度站长后 1 周内收录 | t5 §1.1, §5.2 |
| P0-2 | **明水印 + 零宽字符**：每篇文章页面 footer 显示 reader 唯一 ID | 1-2d | 低 | 截图后能看到 ID | t3 §6, §8 |
| P0-3 | **价格透明度优化**：明示"¥9.9 一次性解锁，永久阅读" + "30 天退款承诺" | 1h | 低 | 文案上线 | t7 §1.4 |
| P0-4 | **合规免责声明**：文章页加"个人码收款，读者自愿"声明 | 0.5h | 低 | 声明可见 | t6 §1.4 |
| P0-5 | **AI 摘要自动生成**：DeepSeek API 后台一键生成 30% preview | 0.5d | 低 | 摘要生成 < 5s | t10 §5 |
| P0-6 | **支付引导文案**：收款码页面加"扫码后请备注订单号"提示 | 0.5h | 低 | 文案上线 | t7 §1.4 |

**P0 总工作量**：约 2-3 天（人天），零新依赖。

### 🟡 P1（本月，3-5 天，建议做）

| # | 改进项 | 工作量 | 风险 | 调研依据 |
|---|--------|--------|------|----------|
| P1-1 | **Tier 阶梯定价**：Post 加 `tier` 字段（基础/深度/答疑）| 1d | 中（需 schema 迁移）| t1 Patreon |
| P1-2 | **无门槛打赏模式**：收款码页面 + 自定义金额输入 | 0.5d | 低 | t1 Buy Me a Coffee |
| P1-3 | **浏览器指纹 + token 强化**：deviceId/IP 绑定 + 限流计数 | 2d | 中 | t3 §3 |
| P1-4 | **AI 客服 FAQ**：ChatWiki 自托管 + DeepSeek 后端 | 2-3d | 中 | t10 §3 |
| P1-5 | **AI 推荐相关阅读**：TF-IDF + Prisma 内存计算 | 1d | 低 | t10 §4 |
| P1-6 | **失败页情感设计**：`/pay-failed.html` 三方案 | 0.5d | 低 | t7 §6.4 |
| P1-7 | **私域钩子**：文章底部"扫码加微信 + 资料包" | 0.5d | 低 | t5 §4.2 |
| P1-8 | **退款功能**：作者后台"24h 全额退" + 自动失效 unlock | 1d | 中 | t8 退款承诺标配 |

**P1 总工作量**：约 8-10 天（人天）。

### 🟢 P2（本季度，1-2 周，扩展）

| # | 改进项 | 工作量 | 风险 | 调研依据 |
|---|--------|--------|------|----------|
| P2-1 | **支付宝收款码并联**：多张收款码，作者后台上传 | 0.5d | 低 | t7 §1.4 |
| P2-2 | **支付成功页"推荐阅读"** + 积分系统 | 2d | 中 | t5 §6.2 |
| P2-3 | **AI 翻译出海**：DeepL API Free Tier（50 万字符/月免费）| 1-2d | 低 | t10 §2 |
| P2-4 | **Bing + 百度站长平台提交** + IndexNow | 0.5d | 低 | t5 §1.1 |
| P2-5 | **复购机制**：买过 1 篇的用户收到"同类新文章"邮件 | 1d | 中 | t5 §6 |
| P2-6 | **视频号引流**：把文章改写成视频脚本（AI 辅助）| 1d | 低 | t9 视频号 |

### ⚪ P3（观望，季度+）

- **Stripe Checkout**（海外第二渠道，流水 > ¥5000/月时）
- **Astro + Edge Functions** 重构（单日 500 UV 时）
- **RAG 知识库**（用户量 > 50 经常问问题时）
- **Discord/Telegram 风格的双向社群**（人手 > 2 时）

---

## 四、每个 P0 项目的具体代码改动点

### P0-1 SEO 基础

**文件**：`web/app.js` 末尾 + `web/index.html`

```js
// app.js 末尾添加
// 1. sitemap.xml
app.get('/sitemap.xml', async (req, reply) => {
  const posts = await api.fetchPosts(); // 已有 /api/posts
  const urls = posts.map(p => `
    <url>
      <loc>${PUBLIC_BASE_URL}/#/post/${p.slug}</loc>
      <lastmod>${p.publishedAt}</lastmod>
    </url>
  `).join('');
  reply.type('application/xml').send(`<?xml version="1.0"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${urls}
    </urlset>
  `);
});

// 2. BlogPosting JSON-LD（注入到 index.html <head>）
```

**文件**：`web/index.html` 末尾 `<head>` 内

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{{post.title}}",
  "author": {"@type": "Person", "name": "你的笔名"}
}
</script>
```

### P0-2 明水印 + 零宽字符

**文件**：`web/app.js` 的 `renderPost` 函数

```js
// 1. 在文章容器加全屏半透明水印
function renderWatermark(readerId) {
  const wm = document.createElement('div');
  wm.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 9999; opacity: 0.08;
    background: repeating-linear-gradient(
      -30deg, transparent, transparent 200px,
      rgba(0,0,0,0.5) 200px, rgba(0,0,0,0.5) 400px
    );
  `;
  wm.textContent = `ID: ${readerId.slice(0, 16)}`;
  document.body.appendChild(wm);
}

// 2. 内容里插入零宽字符（每段后）
function zeroWidthSign(text, readerId) {
  const zw = '​';
  return text.split('').map((c, i) =>
    c + (i % 10 === 0 ? zw + readerId[i % readerId.length] : '')
  ).join('');
}
```

### P0-3 价格透明度

**文件**：`web/app.js` 的 `renderPayCard` 函数

```js
card.innerHTML = `
  <div class="pay-card">
    <p>本文剩余 70% 内容需要付费解锁</p>
    <div class="price">${fmtPrice(priceCents)}<span class="unit">一次性解锁，永久阅读</span></div>
    <p class="meta">🔒 30 天全额退款承诺 · 微信担保 · 作者手动确认通常 < 2h</p>
    <button id="unlockBtn">立即解锁</button>
  </div>
`;
```

### P0-4 合规声明

**文件**：`web/index.html` 底部 footer

```html
<footer style="text-align: center; padding: 40px 20px; color: var(--muted); font-size: 13px;">
  ⚠️ 本站为个人作品，付款为个人收款码（微信/支付宝），不提供发票。<br>
  读者自愿付费，作者承担相应合规责任。
</footer>
```

### P0-5 AI 摘要自动生成

**文件**：`server/src/routes/admin.ts` 新增端点 + Prisma 加字段

```ts
// 1. schema.prisma 加字段
model Post {
  aiSummary       String? @db.Text
  aiSummaryAt     DateTime?
}

// 2. admin.ts 新增
app.post('/api/admin/posts/:id/ai-summary', async (req) => {
  const post = await prisma.post.findUnique({ where: { id: req.params.id } });
  if (!post) throw new Error('not_found');

  const prompt = `请将以下文章提炼为 30% 长度的高质量摘要，吸引读者付费解锁：\n\n${post.content}`;
  const res = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'user', content: prompt }],
  }, {
    headers: { Authorization: `Bearer ${env.DEEPSEEK_API_KEY}` },
  });

  const summary = res.data.choices[0].message.content;
  await prisma.post.update({
    where: { id: post.id },
    data: { aiSummary: summary, aiSummaryAt: new Date() },
  });
  return { summary };
});
```

### P0-6 支付引导文案

**文件**：`web/app.js` 的 `showQR` 函数（在 `qr-area` 下方加一行）

```js
<ol class="steps">
  <li>长按或截图识别二维码 → 输入金额 <strong>${fmtPrice(order.amountCents)}</strong> → 备注订单号 <strong>${order.orderNo}</strong> → 完成支付</li>
  <li>支付完成后点下方按钮，系统会通知作者确认</li>
</ol>
<p style="color: var(--warn); font-size: 14px; margin-top: 8px;">
  ⚠️ 务必在微信转账备注里填订单号 ${order.orderNo}，否则作者无法识别您的支付
</p>
```

---

## 五、不建议做的事（10 条）

| ❌ 想法 | 原因 | 调研来源 |
|---------|------|----------|
| 客户端 JS 解密内容 | 2-3 周只能挡最菜用户，ROI 极低 | t3 |
| 视频 DRM | 当前没视频内容 | t3 |
| Web3 / 区块链付费 | Mirror 2025.9 已关闭 | t9 |
| 迁移到 Hashnode / Substack | 抽成 10-15%，违背"个人码 0% 抽成" | t4 |
| WordPress + 付费插件 | 换 PHP 栈，迁移成本 1.5x | t4 |
| GPT-4.5 / Claude Opus 集成 | 比 DeepSeek 贵 1000x | t10 |
| 高客单价（199 元/年）| 没公众号基础定价 199 风险极高 | t8 |
| 跨平台身份自建 | 微信 = 事实上的国内 SSO | t9 |
| 承诺式营销（包学会/包回本）| 兑现不了 = 塌房 | t8 |
| 提前做双向社群（Discord 化）| 1 人小作者撑不住运营 | t8 |

---

## 六、3 个月时间线

| 月份 | 重点 | 预期效果 | 收入预期 |
|------|------|----------|----------|
| 第 1 月 | P0 全部 + P1-1/P1-2/P1-6/P1-7/P1-8 | 基础体验完整 + 信任建立 | 0 → 日均 20 元 |
| 第 2 月 | P1-3/P1-4/P1-5 + P2-1/P2-4 | AI 能力 + 反爬加固 | 日均 20-50 元 |
| 第 3 月 | P2-2/P2-3/P2-5/P2-6 + 视频号启动 | 复购 + 多平台分发 | 月入 1500-3000 元 |

**本项目合理上限**（基于 t8 案例研究 + t9 趋势判断）：
- 短期（6 月内）：月入 1500-3000 元（50-100 单 × 9.9-29.9 元）
- 中期（1 年）：月入 5000-10000 元（需 3 平台同时分发）
- 长期（2 年+）：月入 1 万+（视频号 + 私域 + 知识星球组合）

---

## 七、风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 微信个人码被封 | 低 | 高 | 月收入控制在 ¥10 万内；逐步切 YunGouOS |
| 数据库丢失 | 低 | 高 | Zeabur 自动每日备份，下载到本地 |
| 文章内容被爬 | 中 | 中 | P0-2 + P1-3 双重防护（威慑 + token 失效）|
| 用户投诉退款 | 低 | 中 | P1-8 内置退款功能 |
| 监管政策变化 | 中 | 中 | 关注央行 259 号文最新动态；流水 > 5 万时切商户号 |

---

## 八、立即可执行的下一步

如果你想现在就开始 P0 工作，建议顺序：

1. **P0-1 SEO**（4h，零风险）→ Bing Webmaster 提交后看收录
2. **P0-3 + P0-4 文案**（1.5h，零风险）→ 文章页加价格 + 退款 + 合规声明
3. **P0-6 支付引导**（0.5h）→ 收款码页面加订单号备注提示
4. **P0-5 AI 摘要**（0.5d）→ 注册 DeepSeek API 账号（免费额度够用）
5. **P0-2 明水印**（1-2d）→ 写完上线

**P0 全部完成后，你就有了一个"SEO 友好 + 信任标识 + 防截图 + AI 辅助"的小而美付费站，可以开始正式运营。**

---

**文档结束。**

**调研报告索引**：
- `/.mavis/plans/research/t1-products.md` — 8 个产品（Substack/Patreon/BuyMeaCoffee/Ghost/Hashnode/小报童/得到/虎嗅）
- `/.mavis/plans/research/t2-payment.md` — 9 个支付方案
- `/.mavis/plans/research/t3-content-protection.md` — 6 类技术 + 5 个真实攻击案例
- `/.mavis/plans/research/t4-tech-architecture.md` — 6 个技术栈方案
- `/.mavis/plans/research/t5-growth.md` — 6 个增长策略 + 真实小作者案例
- `/.mavis/plans/research/t6-compliance.md` — 5 个合规主题
- `/.mavis/plans/research/t7-ux.md` — 6 个 UX 主题
- `/.mavis/plans/research/t8-cases.md` — 8 个真实小作者案例
- `/.mavis/plans/research/t9-trends.md` — 6 个 2025-2026 趋势（⚠️ 数据点需复核）
- `/.mavis/plans/research/t10-ai.md` — 6 个 AI 应用 + 可执行 Fastify 代码
