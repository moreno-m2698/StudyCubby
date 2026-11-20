export const DEFAULT_TEST_DATABASE_URL = 'postgresql://studycubby:studycubby@localhost:5433/studycubby_test';

/** The test database URL: TEST_DATABASE_URL from the environment, else the docker-compose default. */
export function getTestDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.TEST_DATABASE_URL?.trim() || DEFAULT_TEST_DATABASE_URL;
}

/** Throws unless the URL's database name is exactly `studycubby_test`. */
export function assertTestDatabase(url: string): void {
  let dbName: string;
  try {
    dbName = decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));
  } catch {
    throw new Error('Refusing to run: test database URL is not a valid URL');
  }
  if (dbName !== 'studycubby_test') {
    throw new Error(`Refusing to run destructive test setup: database name is "${dbName}", expected "studycubby_test"`);
  }
}
