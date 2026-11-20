import type { Request, RequestHandler } from 'express';
import type { Config } from '../config.ts';
import type { PrismaClient } from '../generated/prisma/client.ts';
import { HttpError } from '../errors.ts';
import type { AuthUser } from '../types/express.d.ts';

/** Dev-only identity (docs/api.md "Identity"). Real auth will replace only this middleware. */
export function devAuth(config: Config, prisma: PrismaClient): RequestHandler {
  return async (req, _res, next) => {
    req.user = null;
    if (!config.devAuthEnabled) return next();

    const header = req.header('x-dev-user')?.trim();
    let username: string | null;
    let fromDefault = false;
    if (header) {
      username = header.toLowerCase() === 'anonymous' ? null : header;
    } else {
      username = config.devDefaultUser;
      fromDefault = true;
    }
    if (username == null) return next();

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, role: true },
    });
    if (!user) {
      return next(
        HttpError.unauthorized(
          fromDefault
            ? `DEV_DEFAULT_USER "${username}" does not exist; fix DEV_DEFAULT_USER (did you run the seed?)`
            : `Unknown dev user "${username}"`,
        ),
      );
    }
    req.user = user;
    next();
  };
}

export function requireUser(req: Request): AuthUser {
  if (!req.user) throw HttpError.unauthorized();
  return req.user;
}
