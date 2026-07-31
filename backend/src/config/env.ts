import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

/**
 * Fail fast on missing/malformed env vars. Do NOT let this slide —
 * an app that boots with an undefined DB_HOST and only fails
 * three requests later, deep in a query, wastes hours of debugging
 * that a startup-time check would have caught in one second.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  // Database — no defaults on credentials. A missing DB_PASSWORD should
  // crash the app at boot, not silently connect with an empty string.
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_NAME: z.string().min(1),
  // Pool sizing: kept small and explicit rather than left at driver
  // defaults. See db/connection.ts for why 10 is the deliberate ceiling
  // for a solo-dev MVP, not an arbitrary number.
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
