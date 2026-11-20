import { defineConfig, env } from 'prisma/config';
import { loadDotenv } from './src/env.ts';

// apps/api/.env overrides shell variables (see src/env.ts for why).
loadDotenv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx scripts/seed.ts --profile full',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
