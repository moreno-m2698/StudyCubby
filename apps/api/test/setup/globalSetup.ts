import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTestDatabase, getTestDatabaseUrl } from './testDbUrl.ts';

const API_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * Bring the TEST database's schema up to date. Never touches any other database.
 *
 * Uses `prisma migrate deploy`, which only applies pending migrations and never drops data.
 * Data is reset per test file by `seedDatabase` (TRUNCATE ... RESTART IDENTITY), so a full
 * `migrate reset` is unnecessary. If the test DB schema ever drifts (e.g. after editing an
 * already-applied migration), reset it yourself:
 *   cd apps/api && STUDYCUBBY_SKIP_DOTENV=1 DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate reset
 */
export default function setup(): void {
  const url = getTestDatabaseUrl();
  assertTestDatabase(url);

  // Explicit DATABASE_URL + skip .env so apps/api/.env (the dev DB) can't win.
  const env = { ...process.env, DATABASE_URL: url, STUDYCUBBY_SKIP_DOTENV: '1' };
  const result = spawnSync('npx prisma migrate deploy', {
    cwd: API_ROOT,
    env,
    shell: true,
    encoding: 'utf8',
  });
  const out = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (result.status !== 0) {
    throw new Error(`prisma migrate deploy failed for the test database (exit ${result.status}):\n${out}`);
  }
  if (!out.includes('studycubby_test')) {
    throw new Error(`prisma migrate deploy output does not mention studycubby_test; aborting.\n${out}`);
  }
  if (/studycubby_dev/.test(out)) {
    throw new Error(`prisma migrate deploy output mentions studycubby_dev; aborting.\n${out}`);
  }
}
