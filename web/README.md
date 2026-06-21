# 读者端静态站点

把 `index.html` 和 `app.js` 部署到任意静态托管（Zeabur Static Service / Vercel / Netlify / 自己的 Nginx），
后端 API 地址默认同源。如果跨域部署，把 `app.js` 顶部的 `const API = ''` 改成后端地址。

## Zeabur Static 部署

最简单：把整个 `web/` 目录作为仓库根目录，Zeabur 自动识别为静态站点。

## 跟后端一起部署

后端 `server/` 用 Fastify 启动时挂载这两个文件即可：

```ts
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
await app.register(fastifyStatic, {
  root: join(__dirname, '../../web'),
  prefix: '/',
});
```
