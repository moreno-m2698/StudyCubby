import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Absolute path to apps/api, regardless of the process cwd. */
export const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  CORS_ORIGIN: z.string().default('http://localhost:443,http://localhost:5173'),
  STORAGE_DIR: z.string().default('./storage'),
  DEV_DEFAULT_USER: z.string().default(''),
  /** Set to "on" to force dev auth; it is on by default outside production and forbidden in production. */
  DEV_AUTH: z.enum(['on', 'off', '']).default(''),
  SEED_MEDIA_DIR: z.string().default('./fixtures/media'),
});

export interface Config {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  databaseUrl: string;
  corsOrigins: string[];
  /** Absolute path. Relative values are resolved against API_ROOT. */
  storageDir: string;
  devAuthEnabled: boolean;
  /** Username used when a request has no X-Dev-User header; null = anonymous. */
  devDefaultUser: string | null;
  /** Absolute path. */
  seedMediaDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment: ${issues}`);
  }
  const e = parsed.data;
  if (e.NODE_ENV === 'production' && e.DEV_AUTH === 'on') {
    throw new Error('DEV_AUTH=on is not allowed when NODE_ENV=production');
  }
  return {
    nodeEnv: e.NODE_ENV,
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    corsOrigins: e.CORS_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean),
    storageDir: path.resolve(API_ROOT, e.STORAGE_DIR),
    devAuthEnabled: e.NODE_ENV !== 'production' && e.DEV_AUTH !== 'off',
    devDefaultUser: e.DEV_DEFAULT_USER.trim() || null,
    seedMediaDir: path.resolve(API_ROOT, e.SEED_MEDIA_DIR),
  };
}
