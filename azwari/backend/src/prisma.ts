import { PrismaClient } from '../prisma/client/index.js';
import dotenv from 'dotenv';

export * from '../prisma/client/index.js';

dotenv.config();

// Global singleton pattern to prevent multiple PrismaClient instances during development reload
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
