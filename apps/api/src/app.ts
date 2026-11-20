import cors from 'cors';
import express, { type Express } from 'express';
import { devAuth } from './auth/devAuth.ts';
import type { Config } from './config.ts';
import { errorMiddleware, HttpError } from './errors.ts';
import type { PrismaClient } from './generated/prisma/client.ts';
import { albumsRouter } from './routes/albums.ts';
import { meRouter } from './routes/me.ts';
import { tracksRouter } from './routes/tracks.ts';
import type { StorageDriver } from './storage/StorageDriver.ts';

export interface AppDeps {
  config: Config;
  prisma: PrismaClient;
  storage: StorageDriver;
}

/** Build the Express app without listening, so tests can drive it with Supertest. */
export function createApp(deps: AppDeps): Express {
  const { config, prisma } = deps;
  const app = express();
  app.disable('x-powered-by');

  app.use(
    cors({
      origin: config.corsOrigins,
      allowedHeaders: ['Content-Type', 'X-Dev-User', 'Range', 'If-None-Match'],
      exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'ETag'],
    }),
  );
  app.use(express.json());
  app.use(devAuth(config, prisma));

  app.use(meRouter());
  app.use(albumsRouter(deps));
  app.use(tracksRouter(deps));

  app.use((_req, _res, next) => next(HttpError.notFound('Route not found')));
  app.use(errorMiddleware);
  return app;
}
