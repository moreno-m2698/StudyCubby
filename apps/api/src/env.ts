import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Load apps/api/.env, letting it OVERRIDE variables already in the shell.
 *
 * Why override: a machine-wide variable (e.g. a global DATABASE_URL left over from another
 * project) would otherwise silently win over this project's .env and point dev tooling at the
 * wrong database. In production there is no .env file, so real environment variables apply.
 *
 * Call this from entrypoints only (server, seed script, prisma.config.ts) — never from modules
 * the test suite imports, since tests set their own environment.
 * Set STUDYCUBBY_SKIP_DOTENV=1 to disable (the test setup does this when shelling out to Prisma).
 */
export function loadDotenv(): void {
  if (process.env.STUDYCUBBY_SKIP_DOTENV === '1') return;
  const file = path.join(API_ROOT, '.env');
  if (fs.existsSync(file)) config({ path: file, override: true, quiet: true });
}
