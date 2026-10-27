import { Router, Request, Response } from 'express';
import { smsLimiter } from '../middleware/rateLimiter.js';
import { validateSmsRequest } from '../middleware/validator.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';

export const smsRouter = Router();

/**
 * POST /api/sms/send
 * Rate-limited to max 10 requests / 10 minutes per IP
 * Input-validated for valid Ethiopian phone numbers (+2519... / +2517...) and non-empty message
 */
smsRouter.post('/send', smsLimiter, validateSmsRequest, async (req: Request, res: Response) => {
  try {
    const { recipientPhone, messageBody, orderNumber, templateName } = req.body;

    const result = await SmsEthiopiaService.sendSms({
      recipientPhone,
      messageBody,
      orderNumber,
      templateName,
    });

    const isSuccess = result.status !== 'failed';
    res.status(isSuccess ? 200 : 422).json({
      success: isSuccess,
      message: result,
      error: !isSuccess ? (result.error || 'SMS Gateway rejected the message') : undefined,
    });
  } catch (error: any) {
    console.error('[SMS Router Error]', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to dispatch SMS through SMS Ethiopia gateway',
    });
  }
});

/**
 * GET /api/sms/outbox
 * Returns recorded SMS dispatches from Supabase PostgreSQL database
 */
smsRouter.get('/outbox', async (_req: Request, res: Response) => {
  try {
    const logs = await SmsEthiopiaService.getRecentLogs(50);
    res.status(200).json({ success: true, count: logs.length, outbox: logs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Could not fetch SMS outbox' });
  }
});

/**
 * GET /api/sms/status
 * Returns current configuration status of SMS Ethiopia Gateway
 */
smsRouter.get('/status', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    gateway: SmsEthiopiaService.getStatus(),
  });
});
