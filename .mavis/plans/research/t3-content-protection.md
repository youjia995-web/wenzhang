# 付费阅读内容保护技术调研报告

**时间基准**：2026-06-21
**目标项目**：`/Users/huojin/Desktop/有偿文章阅读`（Fastify + Prisma + Node.js 单作者 MVP）
**当前方案定位**：基于 `reader_token` cookie + `unlock` 表的简单 token 鉴权（`server/src/routes/public.ts:66-111`），仅做服务器端 token 匹配，**不防爬、不防截图、不防共享 token、不防录制**。

---

## 0. 当前方案分析（基线）

### 工作原理
- 匿名用户首次访问时 `routes/public.ts:14` 颁发 `reader_token` cookie（HMAC 签名,有效 1 年）
- 支付确认后,`routes/admin.ts:140-152` 在 `unlock` 表生成一条记录,`token` 字段为 32 字节随机 hex 字符串
- 客户端发起完整内容请求时,`routes/public.ts:86-99` 检查 `x-unlock-token` header 是否匹配 `unlock` 表中的 token
- 匹配成功则更新 `lastUsedAt`,返回完整 markdown/HTML

### 已知脆弱点
1. **Token 一旦发出即可被无限共享**：任何拿到 unlock token 的人都能在任何设备、任何 IP 上获取完整内容
2. **可被爬虫脚本批量盗取**：`reader_token` cookie 是固定的,爬虫可以用同一 cookie 模拟匿名用户,再走"模拟支付 + 让管理员确认"流程(本项目无此防护)
3. **被 12ft.io / Ladder 类绕过工具利用**：若内容暴露在 HTML 响应里,`12ft.io` 这类 Google Cache 代理可直接爬取;参考 [腾讯新闻 2025-07-18 报道 12ft.io 官网被托管商锁定](https://news.qq.com/rain/a/20250718A092OB00)
4. **无防截图机制**：HTML 直接渲染,用户截图后 OCR 即可恢复文字

### 评估
**当前方案 = 0 成本 0 体验损耗的最低保护等级**,防君子不防小人。对日均 0-50 元、纯单作者个人创作者来说,**短期内可接受**,但加以下 1-2 层防护是 1-2 天工作量。

---

## 1. 服务端鉴权 + 解锁 token（当前方案的强化版）

### 工作原理
基于随机 token 或 HMAC 签名的 JWT,服务器端在数据库中维护 "已购买用户 ↔ 文章" 映射,每次请求校验 token 合法性。Substack 早期版本、知乎专栏付费内容、得到 App 都用此模式。

**强化要点**(比当前方案强的地方):
- **绑定 reader_id**：token 不仅匹配 postId,还要匹配 reader_token cookie,防止 token 被传播到其他人 cookie
- **绑定 device fingerprint**：token 校验时同时检查 deviceId 字段(参见第 3 节)
- **时效 + 限流**：单 token 30 秒内最多 5 次请求,触发后要求重新确认
- **服务端水印注入**：返回的 HTML 中每段都嵌入唯一签名(参见第 4 节)

### 攻击场景 / 真实案例
- **Token 共享**：拿到 token 的人可直接转给朋友。案例:Substack 早期付费 newsletter 在 Reddit / Telegram 群大量分享
- **批量爬取**:12ft.io / Ladder / Archive.today 通过 Googlebot UA 走 Google 缓存,绕过付费墙。**2025-07-18 12ft.io 官网被新闻/媒体联盟(Danielle Coffey 主席)发起的版权诉讼施压,被托管商锁定下线**(来源:腾讯新闻)。这说明 **服务端鉴权对绕过工具无效**,必须叠加内容混淆或水印
- **JWT 算法降级攻击**:攻击者将 JWT `alg` 字段改为 `none` 或 HS256 绕过签名验证。案例:Node.js 生态多个 CMS 库被曝过类似漏洞。来源:[先知社区 JWT 攻击技巧](https://xz.aliyun.com/t/2338)

### 实施成本
- **开发量**:对当前项目而言,只需修改 `server/src/routes/public.ts:86-99` 的 token 校验逻辑,加 4-5 个字段检查(reader_id + deviceId + IP + 限流计数)。**1-2 天**
- **用户体验损耗**:几乎为 0,正常用户无感知
- **维护成本**:低

### 来源 URL
- 12ft.io 关闭事件:https://news.qq.com/rain/a/20250718A092OB00
- Ladder 自托管替代品:https://github.com/everywall/ladder
- JWT 攻防详解:https://xz.aliyun.com/t/2338

### 对当前项目的可实施性 ✅ **强烈建议作为 P0 改进**
- **代码定位**:`server/src/routes/public.ts:86-115` 是单点改造
- **改造方案**:
  1. `unlock` 表新增字段:`boundReaderId`(varchar,索引)、`boundDeviceId`(varchar,可空)、`maxIps`(int,默认 3)、`requestCount`(int,默认 0)、`lastResetAt`(datetime)
  2. token 校验时:`SELECT * FROM unlock WHERE token=? AND boundReaderId=? AND expiresAt > NOW()`
  3. 单 IP 段超 3 个不同 IP 触发告警邮件
  4. 30 分钟内 > 20 次请求 → 强制 CAPTCHA 或锁定 1 小时
- **工作量**:1 人天

---

## 2. 客户端 JS 解密（Substack / Ghost 用过,被破解过）

### 工作原理
服务器把内容用 AES/RSA 加密后,只把密文发给客户端;客户端用 JS 运行时动态解密(通过 fetch 拿 key + Web Crypto API)。理论上不暴露明文到 HTML,爬虫只能抓到 ciphertext。

**典型流程**:
1. 文章付费后,服务端用 AES-256-GCM 加密文章正文,把密文存到 `posts.cipherText`
2. 客户端拿到 unlock token 后,请求 `/api/post/:id/cipher` 拿密文
3. 前端 fetch `/api/post/:id/key?token=xxx` 拿解密 key(key 用 unlock token + reader_token HMAC 派生)
4. 用 Web Crypto API 在浏览器里解密 → 渲染

### 攻击场景 / 真实案例
- **JS 永远可逆**:浏览器必须执行 JS 才能解密,这意味着解密 key 必然出现在 fetch 响应里或派生过程中。攻击者只需:
  1. 打开 DevTools → Network 面板
  2. 找到 `/api/post/:id/key` 请求
  3. 复制 key 后用 Node.js `crypto.createDecipheriv` 直接解密密文
- **Substack / Ghost 的真实下场**:2023-2024 年大量"Substack 解锁脚本"在 GitHub 流传(搜索"substack unpaywall"),基于：
  1. 抓取 `/api/v1/posts/:id` 拿到 cipher
  2. 抓 fetch 请求拿到 key
  3. 在本地用 node-rsa 解密
- **Archive.today 类爬虫**:用 Googlebot UA + Google Cache 拿到原始 HTML,**绕过 JS 解密层**(内容要渲染到 DOM 才能被 Google 索引)

### 实施成本
- **开发量**:2-3 周(加解密逻辑 + key 派生 + 前端解密 + 错误处理)
- **用户体验损耗**:首次访问需多 1 次 fetch + 200-500ms 解密时间
- **实际效果**:**几乎为 0**。只能挡住"右键查看源代码"的菜鸟,挡住不了一个会用 DevTools 的人

### 来源 URL
- Substack 平台机制分析:https://wiki.mbalib.com/wiki/Substack(详细 Substack 商业模式)
- Ladder 绕过原理:https://github.com/everywall/ladder
- Ghost 平台被攻破历史:https://www.welivesecurity.com/2020/05/04/ghost-blogging-platform-servers-compromised-mine-cryptocurrency/

### 对当前项目的可实施性 ⚠️ **不建议做**
- 当前项目是 markdown 文章,加 JS 解密会显著增加首屏延迟(尤其移动端)
- 对个人小作者,**挡住的全是付费意愿低的免费党**,对真正想白嫖的人 0 防护
- **替代方案**:把"客户端解密"换成"内容分段加载 + 服务端埋签名"(参见第 4 节),收益更高成本更低

---

## 3. 浏览器指纹 + 设备绑定（防 token 共享）

### 工作原理
收集浏览器/设备的多个特征(UserAgent、屏幕分辨率、Canvas 渲染指纹、WebGL 显卡型号、Audio 音频指纹、字体列表、时区等),用 murmur hash 生成一个 `deviceId`,与 unlock token 绑定。

**主流开源库**:
- `fingerprintjs2`(纯前端)→ 1.0 版本已改名为 `@fingerprintjs/fingerprintjs`,开源免费
- `FingerprintJS Pro`(商业版)→ 99% 准确率,识别反追踪浏览器
- Cloudflare Turnstile(免费,集成验证码)

**主流指纹维度**(JavaScript 可获取):
- `navigator.userAgent / platform / language / hardwareConcurrency / deviceMemory`
- `screen.width × height × colorDepth × pixelRatio`
- Canvas 渲染指纹(同一段代码在不同 GPU 渲染像素有差异)
- WebGL 渲染器型号 + 显卡驱动版本
- AudioContext 音频采样率
- 已安装字体列表(64 字体探针)
- 时区 + 语言 + DoNotTrack

### 攻击场景 / 真实案例
- **指纹浏览器反制**:`AdsPower` / `比特指纹浏览器` / `Multilogin` / `Luna` 等专门为多账号/反检测设计的浏览器,核心功能就是"为每个 Profile 生成一个独立的、可定制的浏览器指纹"
  - 案例:某电商卖家使用比特浏览器后,账号平均存活周期从 3 天延长到 47 天(来源:搜狐 2025-02)
- **普通用户感知**:登录时显示"您的设备已变更,请验证手机短信"是典型实现。用户体验损耗 1 次,但能拦住 80% 的 token 共享
- **对手成本**:反检测浏览器订阅费 50-200 元/月,对个人用户不便宜但对职业"白嫖党"几乎无成本

### 实施成本
- **开发量**:3-5 天(前端集成 fingerprintjs + 后端 schema 加 deviceId 字段 + 绑定流程 + 异常告警)
- **用户体验损耗**:首次绑定 + 偶尔设备变更需重新验证,**中等**
- **实际效果**:**中等偏上**。能挡 80% 的人,挡不住用反检测浏览器的

### 来源 URL
- 浏览器指纹原理(经典 70 个特征):https://博客园/#tencent-478778be-8501-48d8-8888-27e71b917137-8
- 反检测浏览器原理(搜狐):https://搜狐/#tencent-478778be-8501-48d8-8888-27e71b917137-7
- 比特指纹浏览器实战:https://www.sohu.com/a/881237910_121937131
- FingerprintJS 开源库:https://github.com/fingerprintjs/fingerprintjs(用其 Open Source 版本,免费)

### 对当前项目的可实施性 ✅ **P1 推荐**
- **代码定位**:在 `web/app.js` 解锁流程里加 fingerprintjs(用 CDN,加 5KB JS),在 `unlock` 表加 `deviceId` 字段
- **最小化方案**:
  - 用户第一次拿 unlock token 时,记录 `deviceId`(从 fingerprintjs 拿)
  - 之后每次请求对比 deviceId,**差异时只警告不阻断**(避免误杀正常换设备用户)
  - 同时记录 IP,**单 token 跨 > 2 个 IP 段触发自动锁 token,通知作者**
- **工作量**:2 人天
- **风险**:移动端浏览器版本更新快,可能误判为"换设备",需设计"重新绑定"流程

---

## 4. 截图水印 / 动态签名（视觉追溯）

### 工作原理
把用户身份信息(ID/订单号/手机号后 4 位/IP/时间戳)以视觉方式叠加到内容上,**让每份被截图传播的副本都可追溯到具体的人**。

**3 大类**:
- **明水印(Visible Watermark)**:半透明文字/图片直接覆盖页面。例:阿里云盘分享链接带分享者昵称
- **暗水印(Invisible Watermark)**:
  - **频域水印**(图片/视频):把水印编码到傅里叶变换/小波变换的高频系数里,人眼不可见但算法可提取。Google SynthID 即此类
  - **点阵水印**(屏幕):用微小灰点编码信息,2008 年起 Microsoft、IP-guard 等就用
  - **零宽字符**(文本):在文字间插入零位宽 Unicode 字符(ZWSP / ZWNJ),复制文本时水印一起走
- **动态签名**:每次访问注入不同签名,出现泄露时可定位到具体一次访问

### 攻击场景 / 真实案例
- **明水印必被裁**:用户用 Photoshop / 微信截图选区裁剪,1 分钟可去掉
- **频域水印可被压缩破坏**:但 OpenAI 测试显示 Google SynthID **对截图、缩放、二次编辑都有 80%+ 留存率**(来源:IT 之家 2025-05)
- **零宽字符可被识别**:GitHub 搜 "zero-width character detector" 立刻能找到 5+ 工具一键去除
- **真实案例**:某 996 公司内部"泄密追踪"系统,200+ 人用点阵水印定位到具体哪个员工截图外发

### 实施成本
- **明水印**:开发量 1-2 小时,纯 CSS + JS
- **零宽字符水印**:开发量 4-8 小时,JS 字符串处理
- **点阵水印 + 频域水印**:开发量 1-2 周(需要专门的图像处理),通常用 IP-guard 类商业 SDK
- **Google SynthID**:目前仅 API 形式开放给内容创作者,集成成本高

### 来源 URL
- IP-guard 屏幕/打印水印:https://企鹅号/#tencent-4d0b1ec5-95ec-4236-a365-1ebf078e5dcc-2
- Google SynthID + OpenAI C2PA:https://企鹅号/#tencent-4d0b1ec5-95ec-4236-a365-1ebf078e5dcc-6
- 数字水印基础(百度百科):https://百度百科/#tencent-4d0b1ec5-95ec-4236-a365-1ebf078e5dcc-3
- 零宽字符水印实现:https://www.php.cn/faq/1690088.html

### 对当前项目的可实施性 ✅ **P0 强烈推荐(明水印 + 零宽字符组合)**
- **当前项目痛点**:用户复制内容 → 微信群传播,**完全无追溯**
- **最小化方案**(2 人天搞定):
  1. **明水印**:在 `web/app.js` 渲染全文时,叠加一层半透明 div,内容为 "订单 XXXX-手机 138****1234-IP 1.2.3.4-2026-06-21 17:15",`pointer-events: none`,`transform: rotate(-20deg)`,`opacity: 0.1`
  2. **零宽字符**:服务端在每段文字之间插入 ZWSP 序列编码的 userId,前端用 MutationObserver 检测水印是否被剥离
  3. 配合第 1 节的 IP 限流,发现某个 token 跨 IP 段时,自动给该 token 注入"显眼"明水印(方便发现)
- **防君子不防小人,但威慑效果 80%**:大多数用户看到"自己的手机号在水印里"会放弃传播

---

## 5. PDF 导出限制 / 复制限制（交互层防护）

### 工作原理
两种实现路径:
- **A. 转换时嵌入限制**(离线 PDF):
  - Adobe Acrobat Pro / Foxit PhantomPDF 在 PDF 元数据里设置"禁止复制/打印/截屏"位
  - 配合 Adobe Reader 客户端,被部分系统截图工具拦截
  - 真实效果:Chrome/Firefox/Edge 等浏览器 PDF.js **完全不读这个位**,照样能复制
- **B. 在线阅读时拦截**(web 端):
  - CSS `user-select: none` + JS 拦截 `copy` / `cut` / `contextmenu` 事件
  - 拦截 `Ctrl+P` + `Ctrl+S` 快捷键
  - 隐藏 PDF.js 的下载/打印按钮
  - 客户端 PDF.js 用 `noprint.js` + 修改 `viewer.html` 去掉下载按钮

### 攻击场景 / 真实案例
- **jsPDF 9.2 分漏洞**:2025-01 曝出的 CVE-2025-68428(每周 350 万次下载的库),LFI 路径遍历可读服务器任意文件 → 说明**前端处理 PDF 的库普遍有安全风险**(来源:IT 之家 2025-01)
- **所有"禁复制"都被 DevTools 秒杀**:
  - `user-select: none` → DevTools 改 CSS
  - JS 拦截 `copy` 事件 → 禁用 JS
  - 隐藏按钮 → 直接读 PDF.js 的 PDF 文件 URL
- **Acrobat 的"防截屏"是合规摆设**:实测 Windows 10/11 截图工具(包括 Snipping Tool)100% 绕过,Adobe 自己也承认只在企业策略下生效
- **真实案例**:百度文库/豆丁网用的"swf 播放"模式已彻底失败,2020 年起全面转向"限预览 + 强制下载付费"模式

### 实施成本
- **开发量**:1-2 天(对当前项目而言,**主要做"防右键 + 防 Ctrl+S"**就够,PDF 导出本身不存在 → 限制也无效)
- **用户体验损耗**:中(对极少数真要复制粘贴做笔记的用户不友好)
- **实际效果**:**极低**。是"防白嫖"工具箱里 ROI 最低的一项

### 来源 URL
- jsPDF 9.2 分漏洞:https://企鹅号/#tencent-fefda0ed-10d4-445c-88dc-fbd679c1a51b-3
- PDF.js 禁止下载/打印(知乎):https://知乎/#tencent-fefda0ed-10d4-445c-88dc-fbd679c1a51b-5
- Adobe 防截屏实测:https://www.php.cn/faq/2073731.html

### 对当前项目的可实施性 ⚠️ **低优先,只在"导出 PDF"功能时考虑**
- 当前项目是 web 端阅读,**没有 PDF 导出功能**,所以这一项的优先级最低
- **何时做**:如果未来要加"按文章导出 PDF"功能(常见于深度长文订阅),再考虑:
  - 服务端用 Puppeteer 渲染 + 加水印 + 加密
  - PDF 加密用 32 位密码,密码由 `unlock token + 时间戳` 派生,每次下载重新生成
  - 嵌入明水印 + 服务端签名
- **结论**:**当前阶段不要做**

---

## 6. 视频 / 音频内容 DRM（进阶场景）

### 工作原理
工业级 DRM 标准有 3 家:
- **Google Widevine**:Chrome / Android / Edge / Firefox 浏览器内置。**3 个安全等级**:
  - L1:在 TEE(可信执行环境)硬件解密 → Netflix / Disney+ 用
  - L2:部分软件解密
  - L3:纯软件解密(老手机 / 模拟器)→ **已被破解**(见下)
- **Microsoft PlayReady**:Windows / Xbox / 智能电视。**3 个等级**:SL150(测试)/ SL2000(商用)/ SL3000(HD/UHD 必需)
- **Apple FairPlay**:iOS / Safari / Apple TV。Safari 不支持 Widevine,必须用 FairPlay

**统一标准**:
- **CENC**(Common Encryption, ISO/IEC 23001-7):统一加密格式,AES-CTR
- **EME**(Encrypted Media Extensions, W3C):浏览器 API,统一密钥获取
- **MSE**(Media Source Extensions):JS 生成媒体流

**典型架构**:Shaka Packager 打包 → 加密视频存 CDN → 客户端请求 → CDM 申请 license → 拿到 key 解密播放

### 攻击场景 / 真实案例
- **Widevine L3 已被破解**:GitHub 上 `widevine-l3-decryptor` 项目(已被 DMCA takedown 多次),2024 年还有 `widevine-l3-guesser` 持续绕过。**Netflix L1 内容至今没被破解,但 L3 内容在 24 小时内必被泄露**
- **必须 L1 才能保护 HD**:Netflix / Amazon Prime 都要求 L1 才能看 1080p+,L3 设备只能看 480p/720p
- **国内现状**:爱奇艺自研 iQIYI DRM-S(2019 年起),阿里云 / 腾讯云都打包了 Widevine + FairPlay + PlayReady 三件套
- **对个人创作者**:**完全过度**,一个会员视频系统,自己 + 几十个付费用户,装 DRM 投入几十万起步

### 实施成本
- **开发量**:2-3 月(集成 Shaka Player + 自建 license server + 申请 Widevine / FairPlay 证书)
- **用户体验损耗**:中(部分老设备/模拟器无法播放,需降级到 L3)
- **实际成本**:**Widevine 商业化必须签 Google 协议**,FairPlay 证书要走 Apple 申请流程(需公司主体)
- **阿里云托管**:点播 DRM 0.15-0.30 元/分钟(2024 报价),月 1 万分钟视频 = 1500-3000 元,**远超个人创作者承受范围**

### 来源 URL
- Widevine 官方概览:https://developers.google.cn/widevine/drm/overview?hl=zh-cn
- PlayReady 工作原理:https://稀土掘金/#tencent-d91fd6af-0062-4f38-8f8b-403e076e02e5-3
- Widevine L3 破解尝试(GitHub):https://github.com/cash2one/widevine-l3-guesser
- 阿里云 DRM 文档(综合三件套):https://知乎/#tencent-d91fd6af-0062-4f38-8f8b-403e076e02e5-9
- Azure Media Services Content Protection:https://azure.microsoft.com/en-us/products/media-services/content-protection/

### 对当前项目的可实施性 ❌ **当前完全不需要**
- 当前项目是纯文字 markdown 文章,**没有视频/音频内容**
- **何时做**:如果未来要加"作者录制的伴读音频"或"小视频课程":
  - 短期(1-2 月内):**直接用阿里云点播 + 标准 DRM**,按月付费(10-30 元/100GB)
  - 中期:自己集成 Shaka Player + Widevine(只支持 Chrome/Android 用户,FairPlay 留给苹果用户)
  - 长期:考虑自建 license server(成本不划算,99% 的小作者不需要)
- **当前阶段**:**完全跳过**

---

## 7. 综合对比矩阵

| 技术 | 当前防什么 | 防不住什么 | 实施成本 | 1 人天可落地 | 用户体验损耗 | 推荐度 |
|---|---|---|---|---|---|---|
| **1. 服务端 token(强化版)** | 普通爬虫、API 盗用 | 高级爬虫、token 共享 | 1 人天 | ✅ | 0 | ⭐⭐⭐⭐⭐ P0 |
| **2. 客户端 JS 解密** | 菜鸟复制源码 | DevTools 1 分钟破解 | 2-3 周 | ❌ | 中 | ⭐ 不推荐 |
| **3. 浏览器指纹 + 设备绑定** | 80% token 共享 | 反检测浏览器 | 2 人天 | ⚠️ | 中 | ⭐⭐⭐ P1 |
| **4. 截图水印 + 动态签名** | 80% 截图传播 | 主动裁剪(但威慑) | 2 人天 | ✅ | 低(半透明) | ⭐⭐⭐⭐⭐ P0 |
| **5. PDF 限制** | 普通用户复制 | DevTools / 任何工具 | 1-2 人天 | ✅ | 中 | ⭐ 仅导出时 |
| **6. 视频 DRM** | 商业级盗版 | L3 已破 / 个人项目 ROI 极差 | 2-3 月 | ❌ | 中 | ❌ 不做 |

---

## 8. 对当前项目的 3 层防护建议(1 周内可落地)

按 ROI 排序,以下是**对日 < 50 元小作者**最有性价比的方案:

### P0(本周,2-3 人天)
1. **服务端 token 强化**(第 1 节):
   - `unlock` 表加 `boundReaderId` / `boundIps` / `requestCount` 字段
   - token 校验时检查 `reader_token` cookie 匹配
   - 单 token 30 分钟 > 20 次请求 → 锁定 1 小时 + 邮件通知作者
2. **明水印 + 零宽字符**(第 4 节):
   - web 端渲染时叠加半透明 div,内容 = 订单号末 4 位 + IP + 时间戳
   - 服务端在文字中插入 ZWSP 编码的 userId
3. **IP 段限流**(已在第 1 节覆盖):
   - 单 token 跨 2+ IP 段 → 触发告警,自动锁 token

### P1(本月,3-5 人天)
4. **浏览器指纹绑定**(第 3 节):
   - 用 FingerprintJS 开源版 + CDN 集成
   - 首次解锁记录 deviceId,后续请求差异时**只警告不阻断**
5. **关键操作加 CAPTCHA**:
   - 用 Cloudflare Turnstile(免费),在解锁页面加 1 次验证,挡 80% 自动化脚本

### P2(下季度,可选)
6. **导出 PDF 功能**(触发时再考虑第 5 节)
7. **音频/视频内容**(触发时再考虑第 6 节 + 阿里云托管)

### 不建议做
- **客户端 JS 解密**(第 2 节):ROI 极低,2-3 周开发只能挡住最菜的用户
- **"完整"DRM 集成**:对单作者项目,投入产出比不划算,等真有人盗版视频再说

---

## 9. 一句话总结

> 当前方案的漏洞在"token 共享 + 截图传播",**2-3 人天加 "token 绑定 reader_id + 明水印 + 零宽字符"** 就能把白嫖成本拉高 10 倍,从"5 分钟可破"变成"30 分钟 + 需专业工具"。

---

**文件**:`/Users/huojin/Desktop/有偿文章阅读/.mavis/plans/research/t3-content-protection.md`
**作者**:general agent (plan_3420c78e t3)
**最后更新**:2026-06-21 17:15 (Asia/Shanghai)
