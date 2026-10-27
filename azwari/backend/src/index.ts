import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { prisma } from './prisma.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { smsRouter } from './routes/smsRoutes.js';
import { authRouter } from './routes/authRoutes.js';
import { businessRouter } from './routes/businessRoutes.js';
import { productRouter } from './routes/productRoutes.js';
import { orderRouter } from './routes/orderRoutes.js';
import { salesPartnerRouter } from './routes/salesPartnerRoutes.js';
import { auditRouter } from './routes/auditRoutes.js';
import { disputeRouter } from './routes/disputeRoutes.js';
import { commissionRouter } from './routes/commissionRoutes.js';
import { uploadRouter } from './routes/uploadRoutes.js';
import { waitlistRouter } from './routes/waitlistRoutes.js';
import { walletRouter } from './routes/walletRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import { startOrderExpirationWorker } from './workers/orderExpirationWorker.js';
import { SmsEthiopiaService } from './services/smsEthiopiaService.js';

dotenv.config();

// Global BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Next.js rewrites and ngrok) for accurate client IP resolution
app.set('trust proxy', 1);

// Enable CORS for frontend applications
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ],
    credentials: true,
  })
);

// Parse JSON and URL-encoded bodies with high limit for camera images and rawBody capture for webhooks
app.use(
  express.json({
    limit: '25mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Apply general API rate limiting to all /api routes
app.use('/api', apiLimiter);

// Mount API routes
app.use('/api/sms', smsRouter);
app.use('/api/auth', authRouter);
app.use('/api/businesses', businessRouter);
app.use('/api/products', productRouter);
app.use('/api/orders', orderRouter);
app.use('/api/sales-partners', salesPartnerRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/disputes', disputeRouter);
app.use('/api/commissions', commissionRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/webhooks', webhookRouter);

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch (err) {
    dbStatus = 'error';
  }

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: dbStatus,
    smsProvider: SmsEthiopiaService.getStatus(),
    environment: process.env.NODE_ENV || 'development',
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.redirect('/health');
});

// 404 Handler for undefined API routes
app.use('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API endpoint '${req.method} ${req.originalUrl}' does not exist`,
  });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[SERVER UNHANDLED ERROR]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error occurred',
  });
});

let server: any;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Azwari Express Backend Server Running on Port ${PORT}`);
    console.log(`📡 Health Check:     http://localhost:${PORT}/health`);
    console.log(`💬 SMS Gateway:      SMS Ethiopia Gateway (Rate-Limited)`);
    console.log(`🗄️  Supabase DB:      Connected via Prisma ORM`);
    console.log(`======================================================\n`);

    // Start background workers
    startOrderExpirationWorker();
  });
}

// Graceful cleanup on server stop
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server and Prisma connections...');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('HTTP server and Prisma disconnected.');
  });
});

export default app;
