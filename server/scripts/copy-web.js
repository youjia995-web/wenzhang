#!/usr/bin/env node
// 生产环境 build 后的产物打包脚本
// 把 web/ 复制到 dist/web/（Zeabur Root Directory=server 时 web/ 不会被 checkout 进来）
// 注：prisma/ 不需要复制 — Prisma CLI 默认从 cwd 找 ./prisma/，而 cwd 就是 server/
import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverRoot = resolve(__dirname, '..');
const projectRoot = resolve(serverRoot, '..');
const srcWeb = join(projectRoot, 'web');
const dstWeb = join(serverRoot, 'dist', 'web');

try {
  await access(srcWeb, constants.R_OK);
} catch {
  console.error(`[postbuild] web 目录不存在: ${srcWeb}`);
  console.error('[postbuild] 跳过（前端可能通过其他方式部署）');
  process.exit(0);
}

await mkdir(dirname(dstWeb), { recursive: true });
await cp(srcWeb, dstWeb, { recursive: true });
console.log(`[postbuild] web/       → ${dstWeb}`);