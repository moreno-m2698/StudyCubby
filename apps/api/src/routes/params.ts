import { z } from 'zod';
import { SCOPES } from '../services/visibility.ts';

const MAX_INT4 = 2_147_483_647;

export const idSchema = z
  .string()
  .regex(/^\d+$/, 'must be a positive integer')
  .transform(Number)
  .refine((n) => n >= 1 && n <= MAX_INT4, 'must be a positive integer');

export const idParams = z.object({ id: idSchema });
export const scopeSchema = z.enum(SCOPES).default('all');
