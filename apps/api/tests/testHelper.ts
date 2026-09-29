import { prisma } from '@ai-schedule-optimizer/database';

export interface ParsedDatabaseTarget {
  host: string;
  port: string;
  databaseName: string;
}

/**
 * Parses a database connection URL and extracts host, port, and database name.
 * Never exposes credentials (username/password).
 */
export function parseDatabaseTarget(rawUrl?: string): ParsedDatabaseTarget {
  if (!rawUrl || typeof rawUrl !== 'string' || rawUrl.trim() === '') {
    throw new Error('Database URL is required for target parsing.');
  }

  try {
    const url = new URL(rawUrl);
    const dbName = url.pathname.replace(/^\//, '').split('?')[0];
    if (!dbName) {
      throw new Error('Database target name is missing in connection URL.');
    }
    return {
      host: url.hostname || 'localhost',
      port: url.port || '3306',
      databaseName: dbName,
    };
  } catch {
    // Regex fallback for database connection strings: e.g. mysql://user:pass@host:port/dbname
    const match = rawUrl.match(/^(?:[a-zA-Z0-9_+.-]+:\/\/)?(?:[^:@]+(?::[^@]*)?@)?([^:/]+)(?::(\d+))?\/([^?]+)/);
    if (match && match[3]) {
      return {
        host: match[1] || 'localhost',
        port: match[2] || '3306',
        databaseName: match[3],
      };
    }
    throw new Error('Failed to parse database target from provided connection URL.');
  }
}

/**
 * Validates that the provided test URL points to a legitimate isolated test database,
 * and does NOT target the primary application database.
 * Rejects substring false-positives (e.g. "test" in username or password).
 */
export function validateTestDatabaseTarget(
  testUrl?: string,
  appUrl?: string
): ParsedDatabaseTarget {
  const resolvedTestUrl = arguments.length > 0 ? testUrl : process.env.TEST_DATABASE_URL;
  const resolvedAppUrl = arguments.length > 1 ? appUrl : process.env.DATABASE_URL;

  if (!resolvedTestUrl || resolvedTestUrl.trim() === '') {
    throw new Error(
      'TEST ISOLATION FAILURE: TEST_DATABASE_URL is not set. An explicit test database is required.'
    );
  }

  const testTarget = parseDatabaseTarget(resolvedTestUrl);

  // Validate application database target if available
  if (resolvedAppUrl && resolvedAppUrl.trim() !== '') {
    try {
      const appTarget = parseDatabaseTarget(resolvedAppUrl);
      if (
        testTarget.databaseName.toLowerCase() === appTarget.databaseName.toLowerCase() &&
        testTarget.host.toLowerCase() === appTarget.host.toLowerCase()
      ) {
        throw new Error(
          `TEST ISOLATION FAILURE: Test database target ("${testTarget.databaseName}") matches the application database on host "${testTarget.host}". Writes to application database are strictly refused.`
        );
      }
    } catch (err: any) {
      if (err.message.includes('TEST ISOLATION FAILURE')) throw err;
    }
  }

  // Ensure test database target explicitly signifies an isolated test database
  const dbNameLower = testTarget.databaseName.toLowerCase();
  const isDedicatedTestDb = dbNameLower.endsWith('_test') || dbNameLower.includes('_test_') || dbNameLower === 'ai_schedule_optimizer_test';
  
  if (!isDedicatedTestDb) {
    throw new Error(
      `TEST ISOLATION FAILURE: Database target "${testTarget.databaseName}" does not have a dedicated test database name (must end in "_test"). Execution aborted to protect application data.`
    );
  }

  return testTarget;
}

/**
 * Asserts that the test suite is running against an isolated test database.
 * Checks both the environment configuration and the actual connected MySQL database.
 */
export async function assertTestDatabaseIsolation(): Promise<void> {
  const target = validateTestDatabaseTarget();

  // Verify actual database used by the active Prisma client before any writes
  try {
    const result = await prisma.$queryRaw<Array<{ current_db: string }>>`SELECT DATABASE() as current_db`;
    const actualDb = result?.[0]?.current_db;
    if (actualDb && actualDb.toLowerCase() !== target.databaseName.toLowerCase()) {
      throw new Error(
        `TEST ISOLATION FAILURE: Prisma client is actively connected to "${actualDb}" instead of target test database "${target.databaseName}". Aborting all test operations.`
      );
    }
  } catch (err: any) {
    if (err.message.includes('TEST ISOLATION FAILURE')) {
      throw err;
    }
    throw new Error(`TEST ISOLATION FAILURE: Could not verify active database connection: ${err.message}`, { cause: err });
  }
}

/**
 * Synchronous guard for immediate checks in beforeAll/afterAll setup.
 */
export function assertTestDatabaseIsolationSync(): void {
  validateTestDatabaseTarget();
}

/**
 * Tracks created entity IDs during a test run and cleans up only those exact IDs.
 * Prevents broad or wildcard deletions like "contains: sched_test_".
 */
export class TestTracker {
  private userIds = new Set<string>();

  trackUserId(id: string): void {
    if (id) this.userIds.add(id);
  }

  async cleanup(): Promise<void> {
    if (this.userIds.size === 0) return;
    await assertTestDatabaseIsolation();
    
    const ids = Array.from(this.userIds);
    await prisma.user.deleteMany({
      where: { id: { in: ids } }
    });
    this.userIds.clear();
  }
}
