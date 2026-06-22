#!/usr/bin/env node
// 把 web/ 静态文件复制到 dist/web/，让生产环境一份代码就能跑
// Zeabur 部署时 Root Directory=server，web/ 不会被 checkout 进来，必须打包进 dist
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const srcWeb = join(projectRoot, '..', 'web');
const dstWeb = join(projectRoot, 'dist', 'web');

try {
  await access(srcWeb, constants.R_OK);
} catch {
  console.error(`[copy-web] web 目录不存在: ${srcWeb}`);
  console.error('[copy-web] 跳过（前端可能通过其他方式部署）');
  process.exit(0);
}

await mkdir(dirname(dstWeb), { recursive: true });
await cp(srcWeb, dstWeb, { recursive: true });
console.log(`[copy-web] 已复制 ${srcWeb} → ${dstWeb}`);