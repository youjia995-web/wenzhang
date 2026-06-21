// Prisma client 单例
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
});

export async function shutdownPrisma() {
  await prisma.$disconnect();
}
