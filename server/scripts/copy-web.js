#!/usr/bin/env node
// 生产环境 build 后的产物打包脚本
// 把仓库根目录的 web/ 复制到 dist/web/，让 Fastify 在生产环境直接托管前端。
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
  console.error('[postbuild] 构建失败：请在 Zeabur 使用仓库根目录部署，并让 zbpack.json 的 app_dir 指向 server。');
  process.exit(1);
}

await mkdir(dirname(dstWeb), { recursive: true });
await cp(srcWeb, dstWeb, { recursive: true });
console.log(`[postbuild] web/       → ${dstWeb}`);
