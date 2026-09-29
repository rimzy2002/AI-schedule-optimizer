import dotenv from 'dotenv';
import path from 'path';

// Load .env from root without overriding explicitly set environment variables (such as test or deployment settings)
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

const googleGenAiApiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';
const isTest = process.env.NODE_ENV === 'test';
const testDbUrl = process.env.TEST_DATABASE_URL;
const activeDbUrl = isTest ? (testDbUrl || '') : (process.env.DATABASE_URL || '');

export const env = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key_here',
  googleGenAiApiKey,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  studyTimezone: process.env.STUDY_TIMEZONE || 'Asia/Colombo',
  database: {
    url: activeDbUrl,
    testUrl: testDbUrl,
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306', 10),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    name: isTest ? 'ai_schedule_optimizer_test' : (process.env.DATABASE_NAME || 'ai_schedule_optimizer'),
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    queueName: isTest ? 'syllabus-queue-test' : 'syllabus-queue',
  },
  validateConfig: () => {
    const issues: string[] = [];
    if (!env.jwtSecret || (env.jwtSecret === 'super_secret_jwt_key_here' && env.nodeEnv === 'production')) {
      issues.push('JWT_SECRET should be set to a secure secret in production.');
    }
    if (!env.googleGenAiApiKey && env.nodeEnv !== 'test') {
      issues.push('GOOGLE_GENAI_API_KEY (or GEMINI_API_KEY) is missing. Syllabus AI parsing will not function.');
    }
    return issues;
  }
};
