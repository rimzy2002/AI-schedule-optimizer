import { prisma } from '@ai-schedule-optimizer/database';
import { redis } from '../config/redis';
import fs from 'fs';
import path from 'path';

export interface UserPreferences {
  timezone: string;
  startHour: number;
  endHour: number;
  maxSessionDuration: number;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  timezone: 'Asia/Colombo',
  startHour: 8,
  endHour: 22,
  maxSessionDuration: 90,
};

// Known legacy file locations for data-preserving import
const LEGACY_FILE_CANDIDATES = [
  path.resolve(__dirname, '../../data/user_settings.json'),
  path.resolve(__dirname, '../../../data/user_settings.json'),
  path.resolve(process.cwd(), 'data/user_settings.json'),
  path.resolve(process.cwd(), 'apps/api/data/user_settings.json'),
];

export function findExistingLegacySettingsFile(): string | null {
  for (const candidate of LEGACY_FILE_CANDIDATES) {
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // Continue checking next candidate
    }
  }
  return null;
}

export function readLegacyJsonPreferences(): Record<string, Partial<UserPreferences>> {
  const filePath = findExistingLegacySettingsFile();
  if (!filePath) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (err) {
    console.warn(`Failed reading legacy settings from ${filePath}:`, err);
  }
  return {};
}

export class SettingsService {
  /**
   * Retrieves preferences for an authenticated user.
   * Authoritative store is MySQL (prisma.userSettings).
   * Redis serves as an optional cache; cache failures fall back to MySQL.
   * If no database record exists, imports from Redis or legacy JSON file (MySQL > Redis > JSON > Default).
   * Test mode strictly uses the isolated test database and ignores Redis/files.
   */
  async getPreferences(userId: string): Promise<UserPreferences> {
    const isTest = process.env.NODE_ENV === 'test';

    // 1. Authoritative lookup directly from MySQL first
    const dbRecord = await prisma.userSettings.findUnique({
      where: { user_id: userId },
    });

    if (dbRecord) {
      const prefs: UserPreferences = {
        timezone: dbRecord.timezone,
        startHour: dbRecord.start_hour,
        endHour: dbRecord.end_hour,
        maxSessionDuration: dbRecord.max_session_duration,
      };

      // In non-test mode, optionally keep Redis in sync asynchronously,
      // but MySQL is always the primary source of truth.
      if (!isTest) {
        try {
          await redis.set(`user:settings:${userId}`, JSON.stringify(prefs), 'EX', 86400);
        } catch {
          // Redis cache error is non-fatal
        }
      }

      return prefs;
    }

    // In test mode, do not import from dev files or Redis
    if (isTest) {
      return { ...DEFAULT_PREFERENCES };
    }

    // Data-preserving migration: Precedence MySQL > Redis > JSON > Default
    // Check if preferences exist in Redis or legacy JSON
    let legacyPrefs: Partial<UserPreferences> | null = null;

    try {
      const cached = await redis.get(`user:settings:${userId}`);
      if (cached) {
        legacyPrefs = JSON.parse(cached);
      }
    } catch {
      // Redis unavailable, proceed to check JSON
    }

    if (!legacyPrefs) {
      const jsonMap = readLegacyJsonPreferences();
      if (jsonMap[userId]) {
        legacyPrefs = jsonMap[userId];
      }
    }

    const mergedPrefs: UserPreferences = {
      timezone: legacyPrefs?.timezone || DEFAULT_PREFERENCES.timezone,
      startHour: legacyPrefs?.startHour !== undefined ? legacyPrefs.startHour : DEFAULT_PREFERENCES.startHour,
      endHour: legacyPrefs?.endHour !== undefined ? legacyPrefs.endHour : DEFAULT_PREFERENCES.endHour,
      maxSessionDuration: legacyPrefs?.maxSessionDuration !== undefined ? legacyPrefs.maxSessionDuration : DEFAULT_PREFERENCES.maxSessionDuration,
    };

    // If legacy preferences exist, migrate them into MySQL so future reads are authoritative
    if (legacyPrefs) {
      try {
        const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (userExists) {
          await prisma.userSettings.upsert({
            where: { user_id: userId },
            create: {
              user_id: userId,
              timezone: mergedPrefs.timezone,
              start_hour: mergedPrefs.startHour,
              end_hour: mergedPrefs.endHour,
              max_session_duration: mergedPrefs.maxSessionDuration,
            },
            update: {
              timezone: mergedPrefs.timezone,
              start_hour: mergedPrefs.startHour,
              end_hour: mergedPrefs.endHour,
              max_session_duration: mergedPrefs.maxSessionDuration,
            },
          });
        }
      } catch (err) {
        console.warn(`Failed to auto-migrate legacy preferences for user ${userId}:`, err);
      }
    }

    return mergedPrefs;
  }

  /**
   * Updates preferences for an authenticated user.
   * Commits to MySQL before returning success.
   * Redis cache is refreshed only after database commit succeeds.
   */
  async updatePreferences(userId: string, partial: Partial<UserPreferences>): Promise<UserPreferences> {
    const isTest = process.env.NODE_ENV === 'test';
    const current = await this.getPreferences(userId);

    const updated: UserPreferences = {
      timezone: partial.timezone || current.timezone,
      startHour: partial.startHour !== undefined ? partial.startHour : current.startHour,
      endHour: partial.endHour !== undefined ? partial.endHour : current.endHour,
      maxSessionDuration: partial.maxSessionDuration !== undefined ? partial.maxSessionDuration : current.maxSessionDuration,
    };

    // Validate inputs
    if (updated.startHour < 0 || updated.startHour > 23) {
      throw new Error('Daily study start hour must be between 0 and 23.');
    }
    if (updated.endHour < 1 || updated.endHour > 24) {
      throw new Error('Daily study end hour must be between 1 and 24.');
    }
    if (updated.startHour >= updated.endHour) {
      throw new Error('Daily study start hour must be strictly before end hour.');
    }
    if (updated.maxSessionDuration < 15 || updated.maxSessionDuration > 240) {
      throw new Error('Maximum session duration must be between 15 and 240 minutes.');
    }

    // 1. Authoritative write to MySQL database first
    await prisma.userSettings.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        timezone: updated.timezone,
        start_hour: updated.startHour,
        end_hour: updated.endHour,
        max_session_duration: updated.maxSessionDuration,
      },
      update: {
        timezone: updated.timezone,
        start_hour: updated.startHour,
        end_hour: updated.endHour,
        max_session_duration: updated.maxSessionDuration,
      },
    });

    // 2. Only after database commit succeeds, update or invalidate Redis cache (non-test only)
    if (!isTest) {
      try {
        await redis.set(`user:settings:${userId}`, JSON.stringify(updated), 'EX', 86400);
      } catch (err) {
        console.warn('Redis cache update failed after DB commit (preferences are safely saved in MySQL):', err);
      }
    }

    return updated;
  }

  /**
   * One-time or boot-time migration of all legacy Redis and JSON preferences into MySQL.
   * Never deletes original files or Redis keys.
   * Precedence: MySQL > Redis > JSON.
   */
  async migrateAllLegacySettings(): Promise<number> {
    if (process.env.NODE_ENV === 'test') return 0;

    let migratedCount = 0;
    const jsonMap = readLegacyJsonPreferences();
    const candidateUserIds = new Set<string>(Object.keys(jsonMap));

    // Also collect any user IDs stored in Redis
    try {
      const redisKeys = await redis.keys('user:settings:*');
      for (const key of redisKeys) {
        const uId = key.replace('user:settings:', '');
        if (uId) candidateUserIds.add(uId);
      }
    } catch (err) {
      console.warn('Redis keys scan unavailable during migration:', err);
    }

    for (const userId of candidateUserIds) {
      try {
        // Precedence: If record already exists in MySQL, leave it untouched
        const existingInDb = await prisma.userSettings.findUnique({
          where: { user_id: userId },
        });
        if (existingInDb) continue;

        // Verify user exists in users table
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
        if (!user) continue;

        // Redis has precedence over JSON
        let candidatePrefs: Partial<UserPreferences> | null = null;
        try {
          const cached = await redis.get(`user:settings:${userId}`);
          if (cached) candidatePrefs = JSON.parse(cached);
        } catch {
          // Redis read failed, use JSON
        }

        if (!candidatePrefs && jsonMap[userId]) {
          candidatePrefs = jsonMap[userId];
        }

        if (candidatePrefs) {
          await prisma.userSettings.create({
            data: {
              user_id: userId,
              timezone: candidatePrefs.timezone || DEFAULT_PREFERENCES.timezone,
              start_hour: candidatePrefs.startHour ?? DEFAULT_PREFERENCES.startHour,
              end_hour: candidatePrefs.endHour ?? DEFAULT_PREFERENCES.endHour,
              max_session_duration: candidatePrefs.maxSessionDuration ?? DEFAULT_PREFERENCES.maxSessionDuration,
            },
          });
          migratedCount++;
        }
      } catch (err) {
        console.warn(`Error migrating preferences for user ${userId}:`, err);
      }
    }

    return migratedCount;
  }
}

export const settingsService = new SettingsService();
