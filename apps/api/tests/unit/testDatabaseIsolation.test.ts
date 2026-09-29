import { describe, it, expect } from 'vitest';
import {
  parseDatabaseTarget,
  validateTestDatabaseTarget,
} from '../testHelper';

describe('Test Database Isolation & Target Validation', () => {
  const applicationDbUrl = 'mysql://root:supersecret@localhost:3306/ai_schedule_optimizer';

  it('should parse database target safely without storing credentials', () => {
    const target = parseDatabaseTarget('mysql://admin:secretPass123@db-host:3307/my_custom_db?charset=utf8mb4');
    expect(target.host).toBe('db-host');
    expect(target.port).toBe('3307');
    expect(target.databaseName).toBe('my_custom_db');
    // Ensure credentials are not in target object
    expect((target as any).password).toBeUndefined();
    expect((target as any).user).toBeUndefined();
  });

  it('should reject a normal database URL with "test" in its username', () => {
    const dangerousUrlWithTestUser = 'mysql://test_user:db_password_123@localhost:3306/ai_schedule_optimizer';
    
    expect(() => {
      validateTestDatabaseTarget(dangerousUrlWithTestUser, applicationDbUrl);
    }).toThrow(/TEST ISOLATION FAILURE/);

    // Verify error message NEVER contains password or username
    try {
      validateTestDatabaseTarget(dangerousUrlWithTestUser, applicationDbUrl);
    } catch (err: any) {
      expect(err.message).not.toContain('db_password_123');
      expect(err.message).not.toContain('test_user');
      expect(err.message).toContain('ai_schedule_optimizer');
    }
  });

  it('should reject a normal database URL with "test" in its password', () => {
    const dangerousUrlWithTestPassword = 'mysql://app_user:testingpassword999@localhost:3306/ai_schedule_optimizer';
    
    expect(() => {
      validateTestDatabaseTarget(dangerousUrlWithTestPassword, applicationDbUrl);
    }).toThrow(/TEST ISOLATION FAILURE/);

    try {
      validateTestDatabaseTarget(dangerousUrlWithTestPassword, applicationDbUrl);
    } catch (err: any) {
      expect(err.message).not.toContain('testingpassword999');
      expect(err.message).not.toContain('app_user');
      expect(err.message).toContain('ai_schedule_optimizer');
    }
  });

  it('should reject when TEST_DATABASE_URL matches the application database name', () => {
    const identicalUrl = 'mysql://root:@localhost:3306/ai_schedule_optimizer';
    
    expect(() => {
      validateTestDatabaseTarget(identicalUrl, applicationDbUrl);
    }).toThrow(/matches the application database/);
  });

  it('should reject when TEST_DATABASE_URL is missing or empty', () => {
    expect(() => {
      validateTestDatabaseTarget('', applicationDbUrl);
    }).toThrow(/TEST_DATABASE_URL is not set/);

    expect(() => {
      validateTestDatabaseTarget(undefined, applicationDbUrl);
    }).toThrow(/TEST_DATABASE_URL is not set/);
  });

  it('should reject database targets that do not end in "_test"', () => {
    const nonTestDbUrl = 'mysql://root:@localhost:3306/student_scheduler_production';
    
    expect(() => {
      validateTestDatabaseTarget(nonTestDbUrl, applicationDbUrl);
    }).toThrow(/does not have a dedicated test database name/);
  });

  it('should successfully validate an explicit isolated test database target', () => {
    const validTestUrl = 'mysql://test_runner:pass@localhost:3306/ai_schedule_optimizer_test';
    
    const target = validateTestDatabaseTarget(validTestUrl, applicationDbUrl);
    expect(target.databaseName).toBe('ai_schedule_optimizer_test');
    expect(target.host).toBe('localhost');
  });

  it('should fail closed when NODE_ENV=test and TEST_DATABASE_URL is absent, even if DATABASE_URL is set', async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    const originalAppUrl = process.env.DATABASE_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'mysql://app_user:secret_app_pw@localhost:3306/ai_schedule_optimizer';
      delete process.env.TEST_DATABASE_URL;

      const { createPrismaClient } = await import('@ai-schedule-optimizer/database');

      // Must throw immediately without constructing or connecting to application database
      expect(() => {
        createPrismaClient();
      }).toThrow(/TEST ISOLATION VIOLATION: NODE_ENV is set to "test" but TEST_DATABASE_URL is missing/);
    } finally {
      process.env.TEST_DATABASE_URL = originalTestUrl;
      process.env.DATABASE_URL = originalAppUrl;
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('should fail closed when TEST_DATABASE_URL is set to the application database', async () => {
    const originalTestUrl = process.env.TEST_DATABASE_URL;
    const originalAppUrl = process.env.DATABASE_URL;
    const originalNodeEnv = process.env.NODE_ENV;

    try {
      process.env.NODE_ENV = 'test';
      process.env.DATABASE_URL = 'mysql://root:secret@localhost:3306/ai_schedule_optimizer';
      process.env.TEST_DATABASE_URL = 'mysql://root:secret@localhost:3306/ai_schedule_optimizer';

      const { createPrismaClient } = await import('@ai-schedule-optimizer/database');

      expect(() => {
        createPrismaClient();
      }).toThrow(/TEST ISOLATION VIOLATION: TEST_DATABASE_URL target "ai_schedule_optimizer" matches application database target/);
    } finally {
      process.env.TEST_DATABASE_URL = originalTestUrl;
      process.env.DATABASE_URL = originalAppUrl;
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
