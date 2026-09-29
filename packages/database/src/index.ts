import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function parseDbName(rawUrl?: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  try {
    const url = new URL(rawUrl);
    return url.pathname.replace(/^\//, '').split('?')[0];
  } catch {
    const match = rawUrl.match(/^(?:[a-zA-Z0-9_+.-]+:\/\/)?(?:[^:@]+(?::[^@]*)?@)?([^:/]+)(?::(\d+))?\/([^?]+)/);
    return match ? match[3] : '';
  }
}

/**
 * Resolves or constructs a PrismaClient.
 * In test mode (NODE_ENV=test), this fails closed:
 * It requires an explicit TEST_DATABASE_URL and strictly forbids connecting
 * to or falling back to the application database (DATABASE_URL).
 */
export function createPrismaClient(): PrismaClient {
  const isTestEnv = process.env.NODE_ENV === 'test';

  if (isTestEnv) {
    const testUrl = process.env.TEST_DATABASE_URL;
    if (!testUrl || testUrl.trim() === '') {
      throw new Error(
        'TEST ISOLATION VIOLATION: NODE_ENV is set to "test" but TEST_DATABASE_URL is missing or empty. Refusing to construct Prisma client to prevent application database connection.'
      );
    }

    const testDbName = parseDbName(testUrl);
    const appDbName = parseDbName(process.env.DATABASE_URL);
    if (appDbName && testDbName.toLowerCase() === appDbName.toLowerCase()) {
      throw new Error(
        `TEST ISOLATION VIOLATION: TEST_DATABASE_URL target "${testDbName}" matches application database target "${appDbName}". Refusing to connect.`
      );
    }

    if (!testDbName || (!testDbName.endsWith('_test') && testDbName !== 'ai_schedule_optimizer_test')) {
      throw new Error(
        `TEST ISOLATION VIOLATION: TEST_DATABASE_URL target "${testDbName || 'unknown'}" is invalid (must end in "_test").`
      );
    }

    return new PrismaClient({
      datasources: { db: { url: testUrl } },
    });
  }

  // Non-test environment (development / production)
  const dbUrl = process.env.DATABASE_URL;
  return new PrismaClient(
    dbUrl ? { datasources: { db: { url: dbUrl } } } : undefined
  );
}

// In test environment, construct a dedicated client; do not reuse global in non-test cache
export const prisma = (process.env.NODE_ENV === 'test')
  ? createPrismaClient()
  : (globalForPrisma.prisma || createPrismaClient());

if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  globalForPrisma.prisma = prisma;
}
