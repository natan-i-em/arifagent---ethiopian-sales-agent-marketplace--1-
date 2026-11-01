import { Router, Request, Response } from 'express';
import { EventEmitter } from 'events';

export const realtimeEmitter = new EventEmitter();
realtimeEmitter.setMaxListeners(1000);

export const realtimeRouter = Router();

/**
 * GET /api/realtime/stream
 * Server-Sent Events (SSE) live stream to push real-time database changes directly to browser
 */
realtimeRouter.get('/stream', (req: Request, res: Response): void => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Prevents Nginx/proxy buffering
  res.flushHeaders?.();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: Date.now() })}\n\n`);

  const onEvent = (event: { type: string; payload?: any }) => {
    try {
      res.write(`data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`);
    } catch {}
  };

  realtimeEmitter.on('change', onEvent);

  // Keep-alive heartbeat every 15 seconds
  const keepAlive = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAlive);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
    realtimeEmitter.off('change', onEvent);
  });
});

