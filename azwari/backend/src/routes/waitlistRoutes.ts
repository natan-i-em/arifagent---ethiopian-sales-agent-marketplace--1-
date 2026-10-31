import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, JoinWaitlistSchema } from '../middleware/zodValidators.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';

export const waitlistRouter = Router();

/**
 * GET /api/waitlist
 * Admin retrieves all waitlist entries, or public gets public counter
 */
waitlistRouter.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const entries = await prisma.waitlistEntry.findMany({
      orderBy: { waitlistNumber: 'asc' },
    });

    res.status(200).json({
      success: true,
      count: entries.length,
      waitlist: entries.map((e: any) => ({
        id: e.id,
        fullName: e.fullName,
        phone: e.phone,
        role: e.role,
        subcity: e.subcity,
        telegramUsername: e.telegramUsername || undefined,
        categoryOrChannel: e.categoryOrChannel,
        estimatedScale: e.estimatedScale,
        referralCode: e.referralCode,
        referralCount: e.referralCount,
        waitlistNumber: e.waitlistNumber,
        status: e.status,
        joinedAt: e.joinedAt.toISOString(),
        invitedAt: e.invitedAt ? e.invitedAt.toISOString() : undefined,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/waitlist
 * Public registration to join early access waitlist
 */
waitlistRouter.post('/', validateBody(JoinWaitlistSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { fullName, phone, role, subcity, telegramUsername, categoryOrChannel, estimatedScale, referralCodeUsed } = req.body;

    // Check if phone already registered
    const existing = await prisma.waitlistEntry.findFirst({
      where: { phone },
    });

    if (existing) {
      res.status(200).json({
        success: true,
        message: 'You are already on the Azwari waitlist!',
        entry: {
          id: existing.id,
          fullName: existing.fullName,
          phone: existing.phone,
          role: existing.role,
          subcity: existing.subcity,
          telegramUsername: existing.telegramUsername || undefined,
          categoryOrChannel: existing.categoryOrChannel,
          estimatedScale: existing.estimatedScale,
          referralCode: existing.referralCode,
          referralCount: existing.referralCount,
          waitlistNumber: existing.waitlistNumber,
          status: existing.status,
          joinedAt: existing.joinedAt.toISOString(),
          invitedAt: existing.invitedAt ? existing.invitedAt.toISOString() : undefined,
        },
      });
      return;
    }

    // Process referral code used
    if (referralCodeUsed) {
      try {
        await prisma.waitlistEntry.update({
          where: { referralCode: referralCodeUsed },
          data: { referralCount: { increment: 1 } },
        });
      } catch (e) {
        // Referral code didn't match, ignore silently
      }
    }

    const initials = fullName.split(' ')[0].replace(/[^A-Za-z]/g, '').toUpperCase() || 'AZW';
    const referralCode = `${initials}-${Math.floor(100 + Math.random() * 900)}`;

    const entry = await prisma.waitlistEntry.create({
      data: {
        fullName,
        phone,
        role,
        subcity,
        telegramUsername: telegramUsername || null,
        categoryOrChannel,
        estimatedScale,
        referralCode,
        status: 'waitlisted',
      },
    });

    // Send confirmation SMS
    const roleLabel = role === 'supplier' ? 'Merchant Supplier' : 'Sales Partner';
    const smsMsg = `Azwari: Welcome ${fullName}! You are #${entry.waitlistNumber} on the ${roleLabel} waitlist. Your referral code is ${entry.referralCode}. Share with peers to move up the queue!`;

    SmsEthiopiaService.sendSms({
      recipientPhone: phone,
      messageBody: smsMsg,
      orderNumber: `WAIT-${entry.waitlistNumber}`,
      templateName: 'waitlist_joined',
    }).catch(() => { });

    res.status(201).json({
      success: true,
      entry: {
        id: entry.id,
        fullName: entry.fullName,
        phone: entry.phone,
        role: entry.role,
        subcity: entry.subcity,
        telegramUsername: entry.telegramUsername || undefined,
        categoryOrChannel: entry.categoryOrChannel,
        estimatedScale: entry.estimatedScale,
        referralCode: entry.referralCode,
        referralCount: entry.referralCount,
        waitlistNumber: entry.waitlistNumber,
        status: entry.status,
        joinedAt: entry.joinedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[Join Waitlist Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to join waitlist' });
  }
});

/**
 * POST /api/waitlist/:id/invite
 * Admin invites a waitlisted user to onboard
 */
waitlistRouter.post('/:id/invite', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const entry = await prisma.waitlistEntry.findUnique({ where: { id } });
    if (!entry) {
      res.status(404).json({ success: false, error: 'Waitlist entry not found' });
      return;
    }

    const updated = await prisma.waitlistEntry.update({
      where: { id },
      data: {
        status: 'invited',
        invitedAt: new Date(),
      },
    });

    // Automatically verify matching merchant business or sales partner if they registered
    if (entry.role === 'supplier') {
      await prisma.business.updateMany({
        where: {
          OR: [
            { phone: entry.phone },
            { name: entry.fullName },
          ],
        },
        data: { verificationStatus: 'VERIFIED' },
      });
    } else {
      await prisma.salesPartner.updateMany({
        where: {
          OR: [
            { phone: entry.phone },
            { fullName: entry.fullName },
          ],
        },
        data: { verificationStatus: 'VERIFIED' },
      });
    }

    // Send approval SMS
    SmsEthiopiaService.sendSms({
      recipientPhone: entry.phone,
      messageBody: `Azwari Approval: Hello ${entry.fullName}! Your registration has been approved by admin. You can now log in at https://azwari.et to access your dashboard!`,
      orderNumber: `INV-${entry.waitlistNumber}`,
      templateName: 'waitlist_invited',
    }).catch(() => { });

    res.status(200).json({ success: true, entry: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
