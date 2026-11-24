import { timingSafeEqual } from 'crypto';

const HEADER = 'x-admin-token';

interface RequestWithHeaders {
  headers?: Record<string, string | string[] | undefined>;
}

/**
 * True when the request carries `X-Admin-Token` equal to `ADMIN_TOKEN`.
 * Throws when the server itself has no token configured.
 */
export function hasValidAdminToken(req: RequestWithHeaders | undefined): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    throw new Error('ADMIN_TOKEN is not configured');
  }
  const provided = req?.headers?.[HEADER];
  return typeof provided === 'string' && safeEqual(provided, expected);
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
