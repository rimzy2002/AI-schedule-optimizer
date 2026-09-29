import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';
import path from 'path';

// Load explicit test configuration from root .env without hardcoding credentials in config
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    env: {
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
    },
  },
});
