import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';

/**
 * Middleware supporting Idempotency-Key header.
 * If an Idempotency-Key is provided, checks if an IdempotencyRecord exists.
 * If found, immediately returns the stored response body and status code.
 * If not found, intercepts res.json to store the response in DB before sending.
 */
export function checkIdempotency(endpoint: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = (req.headers['idempotency-key'] || req.headers['x-idempotency-key']) as string | undefined;

    if (!key) {
      return next();
    }

    try {
      const existing = await prisma.idempotencyRecord.findUnique({
        where: { key },
      });

      if (existing) {
        res.setHeader('X-Cache-Lookup', 'HIT');
        res.status(existing.statusCode).json(existing.responseBody);
        return;
      }

      // Monkey-patch res.json to capture response
      const originalJson = res.json.bind(res);
      res.json = (body: any) => {
        // Only cache successful or client-safe responses
        if (res.statusCode >= 200 && res.statusCode < 500) {
          prisma.idempotencyRecord
            .create({
              data: {
                key,
                endpoint,
                userId: req.user?.id || null,
                statusCode: res.statusCode,
                responseBody: body,
              },
            })
            .catch((err) => {
              console.warn('[Idempotency] Failed to persist record:', err.message);
            });
        }
        return originalJson(body);
      };

      next();
    } catch (err: any) {
      console.warn('[Idempotency] Error checking record:', err.message);
      next();
    }
  };
}
