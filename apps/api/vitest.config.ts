import { defineConfig } from 'vitest/config';
import { assertTestDatabase, getTestDatabaseUrl } from './test/setup/testDbUrl.ts';

const databaseUrl = getTestDatabaseUrl();
assertTestDatabase(databaseUrl);

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    fileParallelism: false, // all integration tests share one database
    globalSetup: ['test/setup/globalSetup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: databaseUrl,
      STUDYCUBBY_SKIP_DOTENV: '1',
    },
  },
});
