import app from './app';
import { env } from './config/env';
import { checkDatabaseConnection } from './config/database';
import { settingsService } from './services/settings.service';
import './workers/syllabus.worker';

const startServer = async () => {
  try {
    if (!env.googleGenAiApiKey || env.googleGenAiApiKey.includes('replace_this')) {
      console.error('CRITICAL: Gemini API key is not configured. Please set GOOGLE_GENAI_API_KEY in your environment.');
      process.exit(1);
    }

    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      console.log('Successfully connected to the database.');
      // Migrate any legacy preferences from JSON / Redis into MySQL
      try {
        const migrated = await settingsService.migrateAllLegacySettings();
        if (migrated > 0) {
          console.log(`Migrated ${migrated} legacy user preference record(s) into MySQL.`);
        }
      } catch (migrationErr) {
        console.warn('Non-fatal error migrating legacy user settings:', migrationErr);
      }
    } else {
      console.warn('Failed to connect to the database on startup.');
    }

    app.listen(env.port, () => {
      console.log(`Server is running in ${env.nodeEnv} mode on port ${env.port}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
