import type { ErrorRequestHandler, RequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'INTERNAL';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  INTERNAL: 500,
};

export class HttpError extends Error {
  readonly status: number;
  constructor(readonly code: ErrorCode, message: string) {
    super(message);
    this.status = STATUS[code];
  }
  static badRequest(msg = 'Bad request') { return new HttpError('BAD_REQUEST', msg); }
  static unauthorized(msg = 'Authentication required') { return new HttpError('UNAUTHORIZED', msg); }
  static forbidden(msg = 'Forbidden') { return new HttpError('FORBIDDEN', msg); }
  static notFound(msg = 'Not found') { return new HttpError('NOT_FOUND', msg); }
  static tooLarge(msg = 'Payload too large') { return new HttpError('PAYLOAD_TOO_LARGE', msg); }
  static unsupportedType(msg = 'Unsupported media type') { return new HttpError('UNSUPPORTED_MEDIA_TYPE', msg); }
}

/** Response body for every error: `{ error: { code, message } }`. */
export interface ErrorBody {
  error: { code: ErrorCode; message: string };
}

/** Wraps an async handler so rejections reach the error middleware. (Express 5 does this natively; kept for explicitness.) */
export const asyncHandler =
  <H extends RequestHandler>(fn: H): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/** Largest unread request body we will drain before sending an error response. */
const MAX_DRAIN_BYTES = 100 * 1024 * 1024;

export const errorMiddleware: ErrorRequestHandler = (err, req, res, _next) => {
  let httpErr: HttpError;
  if (err instanceof HttpError) {
    httpErr = err;
  } else if (err instanceof ZodError) {
    httpErr = HttpError.badRequest(err.issues.map((i) => `${i.path.join('.') || 'input'}: ${i.message}`).join('; '));
  } else if (err instanceof multer.MulterError) {
    httpErr = err.code === 'LIMIT_FILE_SIZE' ? HttpError.tooLarge(err.message) : HttpError.badRequest(err.message);
  } else {
    console.error(err);
    httpErr = new HttpError('INTERNAL', 'Internal server error');
  }
  if (res.headersSent) return;
  const body: ErrorBody = { error: { code: httpErr.code, message: httpErr.message } };
  const send = () => {
    if (!res.headersSent) res.status(httpErr.status).json(body);
  };

  // Rejected before the body was read (e.g. 401 on an upload): if we reply now, Node tears down
  // the socket while the client is still sending and the client sees ECONNRESET instead of our
  // error. Drain the body first, then reply. Huge bodies get an immediate reply + Connection: close.
  if (!req.complete && !req.readableEnded) {
    const length = Number(req.headers['content-length'] ?? 0);
    if (length > MAX_DRAIN_BYTES) {
      res.setHeader('Connection', 'close');
      send();
      return;
    }
    req.once('end', send);
    req.once('error', () => res.destroy());
    req.resume();
    return;
  }
  send();
};
