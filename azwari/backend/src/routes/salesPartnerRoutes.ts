import { Router, Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { centsToEtb } from '../config/walletConfig.js';

export const salesPartnerRouter = Router();

const formatPartner = (sp: any) => ({
  id: sp.id,
  fullName: sp.fullName,
  phone: sp.phone,
  telegramUsername: sp.telegramUsername || undefined,
  idNumber: sp.idNumber || 'ID-ET-' + sp.id.substring(3),
  verificationStatus: (sp.verificationStatus.toLowerCase() as any) || 'verified',
  city: sp.city,
  subcity: sp.subcity,
  payoutDestination: {
    provider: sp.payoutProvider === 'CBE' ? ('CBE' as const) : ('Telebirr' as const),
    accountNumber: sp.payoutAccountNumber,
    accountHolderName: sp.payoutAccountName,
  },
  totalAttributedSales: Number(sp.totalAttributedSales || 0),
  pendingCommissions: sp.wallet ? centsToEtb(sp.wallet.lockedBalance) : Number(sp.pendingCommissions || 0),
  eligibleCommissions: sp.wallet ? centsToEtb(sp.wallet.availableBalance) : Number(sp.eligibleCommissions || 0),
  paidCommissions: Number(sp.paidCommissions || 0),
  enrolledProductIds: Array.isArray(sp.enrolledProductIds) ? sp.enrolledProductIds : [],
  referralCode: sp.referralCode,
  joinedAt: sp.createdAt.toISOString(),
});

/**
 * GET /api/sales-partners
 */
salesPartnerRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const partners = await prisma.salesPartner.findMany({
      include: { wallet: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      success: true,
      count: partners.length,
      salesPartners: partners.map(formatPartner),
    });
  } catch (error: any) {
    console.error('[Get Sales Partners Error]', error);
    res.status(500).json({ success: false, error: error.message || 'Failed to fetch sales partners' });
  }
});

/**
 * GET /api/sales-partners/:id
 */
salesPartnerRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const partner = await prisma.salesPartner.findUnique({
      where: { id },
      include: { wallet: true },
    });

    if (!partner) {
      res.status(404).json({ success: false, error: 'Sales partner not found' });
      return;
    }

    res.status(200).json({ success: true, salesPartner: formatPartner(partner) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/sales-partners/:id
 */
salesPartnerRouter.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { payoutProvider, payoutAccountNumber, payoutAccountName, subcity } = req.body;

    const updated = await prisma.salesPartner.update({
      where: { id },
      include: { wallet: true },
      data: {
        ...(payoutProvider ? { payoutProvider: payoutProvider === 'CBE' ? 'CBE' : 'TELEBIRR' } : {}),
        ...(payoutAccountNumber ? { payoutAccountNumber } : {}),
        ...(payoutAccountName ? { payoutAccountName } : {}),
        ...(subcity ? { subcity } : {}),
      },
    });

    res.status(200).json({ success: true, salesPartner: formatPartner(updated) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});
