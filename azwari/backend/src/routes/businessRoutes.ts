import { Router, Response } from 'express';
import { prisma, VerificationStatus } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { centsToEtb } from '../config/walletConfig.js';

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
    const businesses = await prisma.business.findMany({
      include: {
        paymentAccounts: true,
        wallet: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = businesses.map(formatBusinessForFrontend);
    res.status(200).json({ success: true, count: formatted.length, businesses: formatted });
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

    res.status(200).json({ success: true, business: formatBusinessForFrontend(b) });
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

      res.status(200).json({ success: true, message: 'Payment account deleted' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
);
