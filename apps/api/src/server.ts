import { loadDotenv } from './env.ts';

// Must run before anything reads process.env (loadConfig below).
loadDotenv();

import { createApp } from './app.ts';
import { loadConfig } from './config.ts';
import { createPrismaClient } from './db.ts';
import { LocalDiskStorage } from './storage/LocalDiskStorage.ts';

const config = loadConfig();
const prisma = createPrismaClient(config.databaseUrl);
const storage = new LocalDiskStorage(config.storageDir);
const app = createApp({ config, prisma, storage });

const server = app.listen(config.port, () => {
  const auth = config.devAuthEnabled
    ? `dev auth ENABLED${config.devDefaultUser ? `, default user "${config.devDefaultUser}"` : ', default anonymous'}`
    : 'dev auth disabled';
  console.log(`StudyCubby API listening on http://localhost:${config.port} (${auth})`);
});

let closing = false;
async function shutdown(signal: string): Promise<void> {
  if (closing) return;
  closing = true;
  console.log(`${signal} received, shutting down`);
  server.close();
  server.closeAllConnections();
  await prisma.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
