import type { Role } from '../generated/prisma/enums.ts';

export interface AuthUser {
  id: number;
  username: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      /** Set by the auth middleware. null = anonymous. */
      user: AuthUser | null;
    }
  }
}
