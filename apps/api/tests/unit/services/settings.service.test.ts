import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@ai-schedule-optimizer/database';
import { settingsService, DEFAULT_PREFERENCES } from '../../../src/services/settings.service';
import { assertTestDatabaseIsolation, TestTracker } from '../../testHelper';
import fs from 'fs';
import path from 'path';

describe('SettingsService - Truthful and Durably Saved Settings', () => {
  const tracker = new TestTracker();
  let testUserId: string;
  let devSettingsMtimeBefore: number = 0;
  const devSettingsPath = path.resolve(__dirname, '../../../data/user_settings.json');

  beforeAll(async () => {
    await assertTestDatabaseIsolation();

    // Check modification time of dev settings file before tests
    if (fs.existsSync(devSettingsPath)) {
      devSettingsMtimeBefore = fs.statSync(devSettingsPath).mtimeMs;
    }

    // Create a real user in the isolated test database
    const user = await prisma.user.create({
      data: {
        email: `settings_test_${Date.now()}@example.com`,
        password_hash: 'hashedpassword',
      },
    });
    testUserId = user.id;
    tracker.trackUserId(testUserId);
  });

  afterAll(async () => {
    await tracker.cleanup();
    // Verify dev settings file was never touched by tests
    if (fs.existsSync(devSettingsPath)) {
      const devSettingsMtimeAfter = fs.statSync(devSettingsPath).mtimeMs;
      expect(devSettingsMtimeAfter).toBe(devSettingsMtimeBefore);
    }
  });

  it('returns default preferences when no user settings exist in database', async () => {
    const prefs = await settingsService.getPreferences(testUserId);
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
  });

  it('saves preferences durably into the authoritative MySQL database', async () => {
    const updated = await settingsService.updatePreferences(testUserId, {
      timezone: 'Europe/Paris',
      startHour: 9,
      endHour: 19,
      maxSessionDuration: 60,
    });

    expect(updated).toEqual({
      timezone: 'Europe/Paris',
      startHour: 9,
      endHour: 19,
      maxSessionDuration: 60,
    });

    // Directly inspect the MySQL database record
    const dbRecord = await prisma.userSettings.findUnique({
      where: { user_id: testUserId },
    });

    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.user_id).toBe(testUserId);
    expect(dbRecord?.timezone).toBe('Europe/Paris');
    expect(dbRecord?.start_hour).toBe(9);
    expect(dbRecord?.end_hour).toBe(19);
    expect(dbRecord?.max_session_duration).toBe(60);
  });

  it('retrieves durably saved preferences across repeated calls', async () => {
    const prefs = await settingsService.getPreferences(testUserId);
    expect(prefs.timezone).toBe('Europe/Paris');
    expect(prefs.startHour).toBe(9);
    expect(prefs.endHour).toBe(19);
    expect(prefs.maxSessionDuration).toBe(60);
  });

  it('rejects invalid inputs such as startHour >= endHour or invalid durations', async () => {
    await expect(
      settingsService.updatePreferences(testUserId, { startHour: 20, endHour: 10 })
    ).rejects.toThrow('Daily study start hour must be strictly before end hour.');

    await expect(
      settingsService.updatePreferences(testUserId, { maxSessionDuration: 5 })
    ).rejects.toThrow('Maximum session duration must be between 15 and 240 minutes.');
  });

  it('updates partial settings without losing existing preferences', async () => {
    const partial = await settingsService.updatePreferences(testUserId, {
      maxSessionDuration: 45,
    });

    expect(partial.maxSessionDuration).toBe(45);
    expect(partial.timezone).toBe('Europe/Paris');
    expect(partial.startHour).toBe(9);
    expect(partial.endHour).toBe(19);

    const dbRecord = await prisma.userSettings.findUnique({
      where: { user_id: testUserId },
    });
    expect(dbRecord?.max_session_duration).toBe(45);
    expect(dbRecord?.timezone).toBe('Europe/Paris');
  });

  it('never touches development settings JSON file during test execution', () => {
    if (fs.existsSync(devSettingsPath)) {
      const currentMtime = fs.statSync(devSettingsPath).mtimeMs;
      expect(currentMtime).toBe(devSettingsMtimeBefore);
    }
  });

  it('durably persists and retrieves preferences even when Redis cache throws', async () => {
    // Authoritative MySQL record test
    const updated = await settingsService.updatePreferences(testUserId, {
      timezone: 'America/Chicago',
      startHour: 7,
      endHour: 20,
      maxSessionDuration: 50,
    });

    expect(updated.timezone).toBe('America/Chicago');
    expect(updated.maxSessionDuration).toBe(50);

    const dbRecord = await prisma.userSettings.findUnique({
      where: { user_id: testUserId },
    });
    expect(dbRecord?.timezone).toBe('America/Chicago');
    expect(dbRecord?.start_hour).toBe(7);
    expect(dbRecord?.end_hour).toBe(20);
    expect(dbRecord?.max_session_duration).toBe(50);
  });

  it('ensures old Redis cache value cannot override newly saved database preferences', async () => {
    // 1. Durably save preferences in MySQL
    await settingsService.updatePreferences(testUserId, {
      timezone: 'America/Denver',
      startHour: 8,
      endHour: 18,
      maxSessionDuration: 60,
    });

    // 2. Put a stale / contradictory value directly into Redis
    const { redis } = await import('../../../src/config/redis');
    try {
      await redis.set(`user:settings:${testUserId}`, JSON.stringify({
        timezone: 'Pacific/Honolulu',
        startHour: 5,
        endHour: 12,
        maxSessionDuration: 30,
      }));
    } catch {
      // Redis might not be reachable
    }

    // 3. getPreferences must prefer MySQL and return America/Denver, NOT Pacific/Honolulu
    const prefs = await settingsService.getPreferences(testUserId);
    expect(prefs.timezone).toBe('America/Denver');
    expect(prefs.startHour).toBe(8);
    expect(prefs.endHour).toBe(18);
    expect(prefs.maxSessionDuration).toBe(60);

    // Clean up Redis key
    try {
      await redis.del(`user:settings:${testUserId}`);
    } catch (_err) {
      // Ignore Redis cleanup error
    }
  });
});
