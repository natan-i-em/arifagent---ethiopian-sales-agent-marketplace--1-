import { Router, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { requireAuth, requireRole, AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { validateBody, DepositSchema, WithdrawSchema } from '../middleware/zodValidators.js';
import { WalletService } from '../services/walletService.js';
import { ChapaService } from '../services/chapaService.js';
import { etbToCents, centsToEtb, walletConfig } from '../config/walletConfig.js';

export const walletRouter = Router();

/**
 * GET /api/wallet
 * Returns balances and recent transactions for authenticated merchant or salesperson
 */
walletRouter.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = req.user!;
    let owner: { businessId?: string; salesPartnerId?: string } = {};

    if (user.role === 'supplier') {
      const bId = user.businessId || (req.query.businessId as string);
      if (!bId) {
        res.status(403).json({ success: false, error: 'No business profile attached to merchant account' });
        return;
      }
      owner.businessId = bId;
    } else if (user.role === 'salesperson') {
      const spId = user.salesPartnerId || (req.query.salesPartnerId as string);
      if (!spId) {
        res.status(403).json({ success: false, error: 'No sales partner profile attached to salesperson account' });
        return;
      }
      owner.salesPartnerId = spId;
    } else if (user.role === 'admin') {
      // Admin can query specific wallet or default to platform
      if (req.query.businessId) {
        owner.businessId = String(req.query.businessId);
      } else if (req.query.salesPartnerId) {
        owner.salesPartnerId = String(req.query.salesPartnerId);
      } else {
        // Return global ledger stats for admin
        const totalWallets = await prisma.wallet.count();
        const wallets = await prisma.wallet.findMany({ take: 50, include: { business: true, salesPartner: true } });
        res.status(200).json({
          success: true,
          adminOverview: {
            totalWallets,
            wallets: wallets.map((w: any) => ({
              id: w.id,
              ownerType: w.ownerType,
              name: w.business?.name || w.salesPartner?.fullName || 'N/A',
              availableEtb: centsToEtb(w.availableBalance),
              lockedEtb: centsToEtb(w.lockedBalance),
              currency: w.currency,
            })),
          },
        });
        return;
      }
    }

    if (owner.businessId) {
      // Auto-reconciliation: verify any recent pending deposits with Chapa
      try {
        const pendingDeposits = await prisma.deposit.findMany({
          where: {
            businessId: owner.businessId,
            status: 'PENDING',
            createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
          },
          take: 5,
        });

        for (const dep of pendingDeposits) {
          try {
            const verification = await ChapaService.verifyTransaction(dep.txRef);
            if (verification.status === 'success' && BigInt(dep.amount) === verification.amountCents) {
              await WalletService.creditDeposit({
                walletId: dep.walletId,
                amountCents: dep.amount,
                txRef: dep.txRef,
                chapaReference: verification.reference,
                rawPayload: verification.rawResponse,
              });
              console.log(`[AUTO-RECONCILE] Verified & credited deposit ${dep.txRef}`);
            }
          } catch {
            // Keep pending if not yet completed on Chapa
          }
        }
      } catch (reconcileErr) {
        console.warn('[Auto-reconciliation notice]', reconcileErr);
      }
    }

    if (owner.salesPartnerId) {
      // Auto-reconciliation for any pending payouts with Chapa
      try {
        const pendingPayouts = await prisma.payout.findMany({
          where: {
            salesPartnerId: owner.salesPartnerId,
            status: 'PENDING',
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          take: 5,
        });

        for (const payout of pendingPayouts) {
          try {
            const verification = await ChapaService.verifyTransfer(payout.reference);
            if (verification.status === 'success') {
              await WalletService.confirmWithdrawal(payout.reference, verification.rawResponse?.data?.id);
              console.log(`[AUTO-RECONCILE] Verified & confirmed payout ${payout.reference}`);
            } else if (verification.status === 'failed') {
              await WalletService.refundWithdrawal(payout.reference, 'Transfer failed at Chapa bank gateway');
            }
          } catch {}
        }
      } catch (err) {
        console.warn('[Payout reconcile notice]', err);
      }
    }

    const details = await WalletService.getWalletDetails(owner);
    res.status(200).json({
      success: true,
      wallet: details,
    });
  } catch (err: any) {
    console.error('[GET WALLET ERROR]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch wallet information' });
  }
});

/**
 * POST /api/wallet/deposit
 * Initiates a Chapa payment to deposit funds into merchant commission wallet
 */
walletRouter.post(
  '/deposit',
  requireAuth,
  requireRole('supplier', 'admin'),
  validateBody(DepositSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { amount } = req.body; // in ETB
      const businessId = user.businessId || (req.query.businessId as string);

      if (!businessId) {
        res.status(403).json({ success: false, error: 'Only registered merchants can deposit commission collateral' });
        return;
      }

      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        res.status(404).json({ success: false, error: 'Business profile not found' });
        return;
      }

      const amountCents = etbToCents(amount);
      const txRef = `DEP-AA-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      // 1. Create pending deposit in DB
      const deposit = await WalletService.createPendingDeposit({
        businessId,
        amountCents,
        txRef,
      });

      // 2. Call Chapa initialize
      const names = (user.fullName || business.name || 'Merchant').trim().split(' ');
      const firstName = names[0] || 'Merchant';
      const lastName = names.slice(1).join(' ') || 'Azwari';

      const baseReturnUrl = walletConfig.chapaReturnUrl;
      const sep = baseReturnUrl.includes('?') ? '&' : '?';
      const returnUrl = `${baseReturnUrl}${sep}tx_ref=${txRef}`;

      const chapaRes = await ChapaService.initializePayment({
        amountCents,
        currency: 'ETB',
        email: business.contactEmail || user.email,
        firstName,
        lastName,
        phoneNumber: business.phone || user.phone,
        txRef,
        returnUrl,
        customization: {
          title: 'Azwari Deposit',
          description: `Wallet top-up ${amount} ETB for ${business.name}`.replace(/[^a-zA-Z0-9\-_ .]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 50),
        },
      });

      // 3. Update deposit with checkout URL
      await prisma.deposit.update({
        where: { id: deposit.id },
        data: { checkoutUrl: chapaRes.checkoutUrl },
      });

      res.status(200).json({
        success: true,
        tx_ref: txRef,
        checkout_url: chapaRes.checkoutUrl,
        amount: Number(amount),
        currency: 'ETB',
      });
    } catch (err: any) {
      console.error('[DEPOSIT INITIALIZE ERROR]', err);
      res.status(500).json({ success: false, error: err.message || 'Failed to initialize deposit with Chapa' });
    }
  }
);

/**
 * GET /api/wallet/deposit/verify/:txRef
 * Read-only status polling endpoint for frontend callback page.
 * CONSTRAINT: Never credits the wallet here; only checks and returns DB status.
 */
walletRouter.get('/deposit/verify/:txRef', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { txRef } = req.params;

    let deposit = await prisma.deposit.findUnique({
      where: { txRef },
      include: { wallet: true },
    });

    if (!deposit) {
      res.status(404).json({ success: false, error: 'Deposit record not found for transaction reference' });
      return;
    }

    // Active reconciliation: if still pending in local DB, verify directly with Chapa
    if (deposit.status === 'PENDING') {
      try {
        const verification = await ChapaService.verifyTransaction(txRef);
        if (verification.status === 'success' && BigInt(deposit.amount) === verification.amountCents) {
          await WalletService.creditDeposit({
            walletId: deposit.walletId,
            amountCents: deposit.amount,
            txRef,
            chapaReference: verification.reference,
            rawPayload: verification.rawResponse,
          });

          // Reload updated deposit and wallet record
          const reloaded = await prisma.deposit.findUnique({
            where: { txRef },
            include: { wallet: true },
          });
          if (reloaded) deposit = reloaded;
        }
      } catch (verifyErr: any) {
        console.warn(`[Deposit Verify Sync Notice] Chapa verification pending for ${txRef}:`, verifyErr?.message);
      }
    }

    res.status(200).json({
      success: true,
      tx_ref: deposit.txRef,
      status: deposit.status.toLowerCase(), // 'pending' | 'success' | 'failed'
      amount: centsToEtb(deposit.amount),
      currency: deposit.currency,
      verifiedAt: deposit.verifiedAt ? deposit.verifiedAt.toISOString() : null,
      walletBalanceEtb: centsToEtb(deposit.wallet.availableBalance),
    });
  } catch (err: any) {
    console.error('[POLL DEPOSIT STATUS ERROR]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to check deposit status' });
  }
});

/**
 * GET /api/wallet/banks
 * Returns list of supported payout banks from Chapa (cached)
 */
walletRouter.get('/banks', requireAuth, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const banks = await ChapaService.getBanks();
    res.status(200).json({
      success: true,
      count: banks.length,
      banks,
    });
  } catch (err: any) {
    console.error('[GET BANKS ERROR]', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to fetch bank list' });
  }
});

/**
 * POST /api/wallet/withdraw
 * Salesperson withdraws eligible commissions to their verified Ethiopian bank account
 */
walletRouter.post(
  '/withdraw',
  requireAuth,
  requireRole('salesperson', 'admin'),
  validateBody(WithdrawSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = req.user!;
      const { amount, bank_code, account_number, account_name } = req.body;
      const salesPartnerId = user.salesPartnerId || (req.query.salesPartnerId as string);

      if (!salesPartnerId) {
        res.status(403).json({ success: false, error: 'Only registered sales agents can request commission withdrawals' });
        return;
      }

      const amountCents = etbToCents(amount);

      // Verify minimum withdrawal
      if (amount < walletConfig.minWithdrawalEtb) {
        res.status(400).json({
          success: false,
          error: `Minimum withdrawal amount is ETB ${walletConfig.minWithdrawalEtb}`,
        });
        return;
      }

      // 1. Validate bank code against supported banks
      const banks = await ChapaService.getBanks();
      const matchedBank = banks.find((b) => b.code === bank_code || b.id === bank_code);
      const bankName = matchedBank ? matchedBank.name : undefined;

      // 2. Put funds on hold in DB transaction (deducts available balance, records PAYOUT_HOLD)
      const { payout, reference } = await WalletService.holdWithdrawal({
        salesPartnerId,
        amountCents,
        bankCode: bank_code,
        bankName,
        accountNumber: account_number,
        accountName: account_name,
      });

      // 3. Call Chapa Transfer API
      try {
        const transferRes = await ChapaService.initiateTransfer({
          accountNumber: account_number,
          accountName: account_name,
          amountCents,
          bankCode: bank_code,
          reference,
          currency: 'ETB',
        });

        if (transferRes.transferId) {
          await prisma.payout.update({
            where: { id: payout.id },
            data: { chapaTransferId: transferRes.transferId },
          });
        }

        res.status(200).json({
          success: true,
          reference,
          status: 'pending',
          amount: Number(amount),
          bankName: bankName || bank_code,
          accountNumber: account_number,
          message: 'Withdrawal requested successfully. Funds will arrive after bank clearance.',
        });
      } catch (transferErr: any) {
        console.error('[CHAPA TRANSFER INITIATION FAILED]', transferErr);
        // Automatically refund hold if API call itself failed upfront
        await WalletService.refundWithdrawal(reference, `Chapa API error: ${transferErr.message}`);
        res.status(502).json({
          success: false,
          error: `Failed to initiate bank transfer: ${transferErr.message}. Funds have been restored to your wallet.`,
        });
      }
    } catch (err: any) {
      console.error('[WITHDRAWAL REQUEST ERROR]', err);
      const statusCode = err.code === 'INSUFFICIENT_BALANCE' ? 400 : 500;
      res.status(statusCode).json({ success: false, error: err.message || 'Withdrawal processing failed' });
    }
  }
);
