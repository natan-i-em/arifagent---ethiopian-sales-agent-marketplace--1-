import { Router, Response } from 'express';
import { prisma, VerificationStatus } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { centsToEtb } from '../config/walletConfig.js';
import { cacheService } from '../services/cacheService.js';
import { realtimeEmitter } from './realtimeRoutes.js';
import { SmsEthiopiaService } from '../services/smsEthiopiaService.js';

export const businessRouter = Router();

// Helper to map Prisma PaymentProvider to Frontend format
const mapProviderToFrontend = (provider: string): any => {
  const map: Record<string, string> = {
    TELEBIRR: 'Telebirr',
    CBE: 'Commercial Bank of Ethiopia (CBE)',
    AWASH_BANK: 'Awash Bank',
    BANK_OF_ABYSSINIA: 'Bank of Abyssinia',
    DASHEN_BANK: 'Dashen Bank',
  };
  return map[provider] || 'Telebirr';
};

const mapProviderToPrisma = (provider: string): any => {
  const norm = (provider || '').toUpperCase().replace(/\s+/g, '_');
  if (norm.includes('TELEBIRR')) return 'TELEBIRR';
  if (norm.includes('CBE') || norm.includes('COMMERCIAL_BANK')) return 'CBE';
  if (norm.includes('AWASH')) return 'AWASH_BANK';
  if (norm.includes('ABYSSINIA')) return 'BANK_OF_ABYSSINIA';
  if (norm.includes('DASHEN')) return 'DASHEN_BANK';
  return 'TELEBIRR';
};

export const formatBusinessForFrontend = (b: any) => ({
  id: b.id,
  name: b.name,
  tradeName: b.tradeName,
  tinNumber: b.tinNumber,
  licenseNumber: b.licenseNumber,
  verificationStatus: (b.verificationStatus?.toLowerCase() as any) || 'verified',
  verificationDocumentUrl: b.verificationDocumentUrl || undefined,
  city: b.city,
  subcity: b.subcity,
  specificLocation: b.specificLocation,
  phone: b.phone,
  contactEmail: b.contactEmail,
  commissionReserveBalance: b.wallet ? centsToEtb(b.wallet.availableBalance) : Number(b.commissionReserveBalance || 0),
  subscriptionPlan: b.subscriptionPlan as any,
  subscriptionStatus: b.subscriptionStatus as any,
  subscriptionRenewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  createdAt: b.createdAt ? b.createdAt.toISOString() : new Date().toISOString(),
  paymentAccounts: (b.paymentAccounts || []).map((acc: any) => ({
    id: acc.id,
    provider: mapProviderToFrontend(acc.provider),
    accountNumber: acc.accountNumber,
    accountHolderName: acc.accountHolderName,
    isPrimary: acc.isPrimary,
    verified: acc.verified,
    instructions: acc.instructions || '',
  })),
});

/**
 * GET /api/businesses
 * List businesses with payment accounts
 */
businessRouter.get('/', async (_req: any, res: Response): Promise<void> => {
  try {
    const cacheKey = 'cache:businesses:all';
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const businesses = await prisma.business.findMany({
      include: {
        paymentAccounts: true,
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = businesses.map(formatBusinessForFrontend);
    const responsePayload = { success: true, count: formatted.length, businesses: formatted };
    await cacheService.set(cacheKey, responsePayload, 180);
    res.status(200).json(responsePayload);
  } catch (error: any) {
    console.error('[Get Businesses Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch businesses' });
  }
});

/**
 * GET /api/businesses/:id
 */
businessRouter.get('/:id', async (req: any, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const cacheKey = `cache:businesses:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      res.status(200).json(cached);
      return;
    }

    const b = await prisma.business.findUnique({
      where: { id },
      include: { 
        paymentAccounts: true,
        wallet: true,
      },
    });

    if (!b) {
      res.status(404).json({ success: false, error: 'Business not found' });
      return;
    }

    const responsePayload = { success: true, business: formatBusinessForFrontend(b) };
    await cacheService.set(cacheKey, responsePayload, 180);
    res.status(200).json(responsePayload);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/businesses/:id
 * Supplier updates their business profile; verification status restricted to admin
 */
businessRouter.patch('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const body = req.body;

    if (user.role === 'supplier' && user.businessId !== id) {
      res.status(403).json({ success: false, error: 'Forbidden: You do not have permission to edit this business profile' });
      return;
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.tradeName !== undefined) updateData.tradeName = body.tradeName;
    if (body.tinNumber !== undefined) updateData.tinNumber = body.tinNumber;
    if (body.licenseNumber !== undefined) updateData.licenseNumber = body.licenseNumber;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.city !== undefined) updateData.city = body.city;
    if (body.subcity !== undefined) updateData.subcity = body.subcity;
    if (body.specificLocation !== undefined) updateData.specificLocation = body.specificLocation;
    if (body.commissionReserveBalance !== undefined) updateData.commissionReserveBalance = body.commissionReserveBalance;

    // Only admin can alter verificationStatus directly
    if (user.role === 'admin' && body.verificationStatus) {
      const statusMap: Record<string, VerificationStatus> = {
        verified: VerificationStatus.VERIFIED,
        pending: VerificationStatus.PENDING,
        unverified: VerificationStatus.UNVERIFIED,
        rejected: VerificationStatus.REJECTED,
      };
      updateData.verificationStatus = statusMap[body.verificationStatus.toLowerCase()] || VerificationStatus.PENDING;
    }

    const updated = await prisma.business.update({
      where: { id },
      data: updateData,
      include: { paymentAccounts: true },
    });

    await cacheService.delPattern('cache:businesses:*');
    realtimeEmitter.emit('change', { type: 'BUSINESS_UPDATED', businessId: id });

    res.status(200).json({ success: true, business: formatBusinessForFrontend(updated) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/businesses/:id/verify
 * Admin verifies or rejects business KYC
 */
businessRouter.post('/:id/verify', requireAuth, requireRole('admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status = 'verified' } = req.body;

    const statusMap: Record<string, VerificationStatus> = {
      verified: VerificationStatus.VERIFIED,
      pending: VerificationStatus.PENDING,
      unverified: VerificationStatus.UNVERIFIED,
      rejected: VerificationStatus.REJECTED,
    };

    const targetStatus = statusMap[status.toLowerCase()] || VerificationStatus.VERIFIED;

    const updated = await prisma.business.update({
      where: { id },
      data: { verificationStatus: targetStatus },
      include: { paymentAccounts: true },
    });

    // If verified, automatically update their waitlist entry and send onboarding invitation SMS
    if (targetStatus === VerificationStatus.VERIFIED) {
      try {
        await prisma.waitlistEntry.updateMany({
          where: {
            OR: [
              ...(updated.phone ? [{ phone: updated.phone }] : []),
              { fullName: updated.name },
              ...(updated.tradeName ? [{ fullName: updated.tradeName }] : []),
            ],
          },
          data: {
            status: 'invited',
            invitedAt: new Date(),
          },
        });

        if (updated.phone) {
          const smsBody = `Congratulations ${updated.name}! Your Azwari supplier account has been verified and approved. You can now log in at https://arifagent-ethiopian-sales-agent-mar.vercel.app/signin to start listing your merchandise!`;
          await SmsEthiopiaService.sendSms({
            recipientPhone: updated.phone,
            messageBody: smsBody,
            orderNumber: `KYC-${updated.id.substring(0, 8)}`,
            templateName: 'supplier_verified_invitation',
          });
        }

        await prisma.auditLog.create({
          data: {
            actorRole: req.user!.role,
            actorName: req.user!.fullName || 'Admin KYC Officer',
            action: 'VERIFY_AND_INVITE_SUPPLIER',
            entityType: 'Business',
            entityId: updated.id,
            businessId: updated.id,
            description: `Supplier "${updated.name}" verified and invited to portal. Automated onboarding SMS sent to ${updated.phone}.`,
          },
        });
      } catch (postVerifyErr) {
        console.warn('[KYC Post-Verify Notice]', postVerifyErr);
      }
    }

    await cacheService.delPattern('cache:businesses:*');
    await cacheService.delPattern('cache:waitlist:*');
    realtimeEmitter.emit('change', { type: 'BUSINESS_UPDATED', businessId: id });
    realtimeEmitter.emit('change', { type: 'WAITLIST_UPDATED' });

    res.status(200).json({ success: true, business: formatBusinessForFrontend(updated) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/businesses/:id/payment-accounts
 * Supplier adds a payout / payment account
 */
businessRouter.post(
  '/:id/payment-accounts',
  requireAuth,
  requireRole('supplier', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = req.user!;
      const { provider, accountNumber, accountHolderName, isPrimary, instructions } = req.body;

      if (user.role === 'supplier' && user.businessId !== id) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this business' });
        return;
      }

      if (!accountNumber || !accountHolderName) {
        res.status(400).json({ success: false, error: 'Account number and account holder name are required' });
        return;
      }

      if (isPrimary) {
        await prisma.supplierPaymentAccount.updateMany({
          where: { businessId: id },
          data: { isPrimary: false },
        });
      }

      const created = await prisma.supplierPaymentAccount.create({
        data: {
          id: 'acc_' + Date.now().toString(36),
          businessId: id,
          provider: mapProviderToPrisma(provider),
          accountNumber,
          accountHolderName,
          isPrimary: isPrimary ?? false,
          verified: true,
          instructions: instructions || '',
        },
      });

      await cacheService.delPattern('cache:businesses:*');
      realtimeEmitter.emit('change', { type: 'BUSINESS_UPDATED', businessId: id });

      res.status(201).json({
        success: true,
        account: {
          id: created.id,
          provider: mapProviderToFrontend(created.provider),
          accountNumber: created.accountNumber,
          accountHolderName: created.accountHolderName,
          isPrimary: created.isPrimary,
          verified: created.verified,
          instructions: created.instructions || '',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

/**
 * DELETE /api/businesses/:id/payment-accounts/:accountId
 */
businessRouter.delete(
  '/:id/payment-accounts/:accountId',
  requireAuth,
  requireRole('supplier', 'admin'),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id, accountId } = req.params;
      const user = req.user!;

      if (user.role === 'supplier' && user.businessId !== id) {
        res.status(403).json({ success: false, error: 'Forbidden: You do not own this business' });
        return;
      }

      await prisma.supplierPaymentAccount.delete({
        where: { id: accountId },
      });

      await cacheService.delPattern('cache:businesses:*');
      realtimeEmitter.emit('change', { type: 'BUSINESS_UPDATED', businessId: id });

      res.status(200).json({ success: true, message: 'Payment account deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
