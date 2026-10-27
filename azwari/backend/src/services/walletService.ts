import { prisma, PrismaClient } from '../prisma.js';
import {
  walletConfig,
  centsToEtb,
  etbToCents,
  formatCentsToEtbString,
} from '../config/walletConfig.js';
import crypto from 'crypto';

export class InsufficientBalanceError extends Error {
  public code = 'INSUFFICIENT_BALANCE';
  constructor(message: string) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

export class InsufficientCollateralError extends Error {
  public code = 'INSUFFICIENT_COLLATERAL';
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'InsufficientCollateralError';
  }
}

export interface WalletBalances {
  availableCents: bigint;
  lockedCents: bigint;
  totalCents: bigint;
  availableEtb: number;
  lockedEtb: number;
  totalEtb: number;
  currency: string;
}

const TX_OPTIONS = {
  maxWait: 20000,
  timeout: 45000,
};

export class WalletService {
  /**
   * Retrieves or provisions a wallet for a merchant (Business) or salesperson (SalesPartner)
   */
  public static async getOrCreateWallet(
    owner: {
      businessId?: string;
      salesPartnerId?: string;
      userId?: string;
      ownerType?: 'MERCHANT' | 'SALESPERSON';
    },
    tx?: any
  ) {
    const db = tx || prisma;

    if (owner.businessId) {
      const existing = await db.wallet.findUnique({
        where: { businessId: owner.businessId },
      });
      if (existing) return existing;

      return await db.wallet.create({
        data: {
          ownerType: 'MERCHANT',
          businessId: owner.businessId,
          userId: owner.userId || null,
          availableBalance: BigInt(0),
          lockedBalance: BigInt(0),
          currency: 'ETB',
        },
      });
    }

    if (owner.salesPartnerId) {
      const existing = await db.wallet.findUnique({
        where: { salesPartnerId: owner.salesPartnerId },
      });
      if (existing) {
        // If wallet has 0 balance but sales partner has legacy eligible commissions, sync it
        if (BigInt(existing.availableBalance) === BigInt(0)) {
          const sp = await db.salesPartner.findUnique({ where: { id: owner.salesPartnerId } });
          const legacyCents = sp ? etbToCents(Number(sp.eligibleCommissions || 0)) : BigInt(0);
          if (legacyCents > BigInt(0)) {
            const updated = await db.wallet.update({
              where: { id: existing.id },
              data: { availableBalance: legacyCents },
            });
            return updated;
          }
        }
        return existing;
      }

      const sp = await db.salesPartner.findUnique({ where: { id: owner.salesPartnerId } });
      const initialAvailable = sp ? etbToCents(Number(sp.eligibleCommissions || 0)) : BigInt(0);

      return await db.wallet.create({
        data: {
          ownerType: 'SALESPERSON',
          salesPartnerId: owner.salesPartnerId,
          userId: owner.userId || null,
          availableBalance: initialAvailable,
          lockedBalance: BigInt(0),
          currency: 'ETB',
        },
      });
    }

    throw new Error('Wallet must be attached to either a businessId or salesPartnerId');
  }

  /**
   * Fetches formatted wallet balances and summary
   */
  public static async getWalletBalances(owner: {
    businessId?: string;
    salesPartnerId?: string;
  }): Promise<WalletBalances> {
    const wallet = await this.getOrCreateWallet(owner);
    const availableCents = BigInt(wallet.availableBalance);
    const lockedCents = BigInt(wallet.lockedBalance);
    const totalCents = availableCents + lockedCents;

    return {
      availableCents,
      lockedCents,
      totalCents,
      availableEtb: centsToEtb(availableCents),
      lockedEtb: centsToEtb(lockedCents),
      totalEtb: centsToEtb(totalCents),
      currency: wallet.currency || 'ETB',
    };
  }

  /**
   * Returns wallet details including balances and recent transactions
   */
  public static async getWalletDetails(
    owner: { businessId?: string; salesPartnerId?: string },
    limit: number = 20
  ) {
    const wallet = await this.getOrCreateWallet(owner);
    const balances = await this.getWalletBalances(owner);

    const transactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const formattedTxs = transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amount.toString(),
      amountEtb: centsToEtb(t.amount),
      ref: t.ref,
      status: t.status,
      balanceAfterAvailableEtb: centsToEtb(t.balanceAfterAvailable),
      balanceAfterLockedEtb: centsToEtb(t.balanceAfterLocked),
      metadata: t.metadata,
      createdAt: t.createdAt.toISOString(),
    }));

    return {
      walletId: wallet.id,
      ownerType: wallet.ownerType,
      balances: {
        ...balances,
        availableCents: balances.availableCents.toString(),
        lockedCents: balances.lockedCents.toString(),
        totalCents: balances.totalCents.toString(),
      },
      transactions: formattedTxs,
    };
  }

  /**
   * Creates a pending Deposit row before calling Chapa initialize
   */
  public static async createPendingDeposit(params: {
    businessId: string;
    amountCents: bigint;
    txRef: string;
    checkoutUrl?: string;
  }) {
    const wallet = await this.getOrCreateWallet({ businessId: params.businessId });

    return await prisma.deposit.create({
      data: {
        walletId: wallet.id,
        businessId: params.businessId,
        amount: params.amountCents,
        currency: 'ETB',
        txRef: params.txRef,
        status: 'PENDING',
        checkoutUrl: params.checkoutUrl,
      },
    });
  }

  /**
   * Credits a deposit to the merchant's wallet
   * Uses raw SQL SELECT ... FOR UPDATE on the wallet row
   * Enforces idempotency (unique txRef and check if already processed)
   */
  public static async creditDeposit(params: {
    walletId: string;
    amountCents: bigint;
    txRef: string;
    chapaReference?: string;
    rawPayload?: any;
  }) {
    return await prisma.$transaction(async (tx) => {
      // 1. Idempotency Check: verify deposit record
      const deposit = await tx.deposit.findUnique({
        where: { txRef: params.txRef },
      });

      if (!deposit) {
        throw new Error(`Deposit with txRef ${params.txRef} does not exist.`);
      }

      if (deposit.status === 'SUCCESS') {
        console.log(`[DEPOSIT IDEMPOTENT] Deposit ${params.txRef} already processed. Skipping double credit.`);
        return { alreadyProcessed: true, deposit };
      }

      // 2. Lock Wallet row using SELECT ... FOR UPDATE
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "availableBalance", "lockedBalance"
        FROM "Wallet"
        WHERE "id" = ${params.walletId}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new Error(`Wallet ${params.walletId} not found during lock.`);
      }

      const currentAvailable = BigInt(lockedRows[0].availableBalance);
      const currentLocked = BigInt(lockedRows[0].lockedBalance);
      const newAvailable = currentAvailable + params.amountCents;

      // 3. Update Wallet available balance
      await tx.wallet.update({
        where: { id: params.walletId },
        data: { availableBalance: newAvailable },
      });

      // Synchronize business commission reserve balance with wallet
      if (deposit.businessId) {
        await tx.business.update({
          where: { id: deposit.businessId },
          data: { commissionReserveBalance: centsToEtb(newAvailable) },
        });
      }

      // 4. Append to WalletTransaction (IMMUTABLE)
      const walletTx = await tx.walletTransaction.create({
        data: {
          walletId: params.walletId,
          type: 'DEPOSIT',
          amount: params.amountCents,
          ref: params.txRef,
          status: 'COMPLETED',
          balanceAfterAvailable: newAvailable,
          balanceAfterLocked: currentLocked,
          metadata: {
            chapaReference: params.chapaReference,
            depositId: deposit.id,
            amountEtb: centsToEtb(params.amountCents),
          },
        },
      });

      // 5. Update Deposit status
      const updatedDeposit = await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: 'SUCCESS',
          chapaReference: params.chapaReference || deposit.chapaReference,
          rawWebhookPayload: params.rawPayload || undefined,
          verifiedAt: new Date(),
        },
      });

      // 6. Check if any auto-paused products can be unpaused
      if (deposit.businessId) {
        try {
          await this.unpauseEligibleListings(deposit.businessId, tx);
        } catch (unpauseErr) {
          console.warn('[Auto-Unpause Notice]', unpauseErr);
        }
      }

      return {
        alreadyProcessed: false,
        deposit: updatedDeposit,
        walletTransaction: walletTx,
        newBalanceEtb: centsToEtb(newAvailable),
      };
    }, TX_OPTIONS);
  }

  /**
   * Lock commission when an order is placed
   * Deducts from merchant's availableBalance and moves to lockedBalance
   */
  public static async lockCommission(
    orderId: string,
    businessId: string,
    amountCents: bigint,
    externalTx?: any
  ) {
    const execute = async (tx: any) => {
      // 1. Get or create wallet
      const wallet = await this.getOrCreateWallet({ businessId }, tx);

      // 2. Lock Wallet row
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "availableBalance", "lockedBalance"
        FROM "Wallet"
        WHERE "id" = ${wallet.id}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new Error(`Merchant wallet not found for businessId ${businessId}`);
      }

      const available = BigInt(lockedRows[0].availableBalance);
      const locked = BigInt(lockedRows[0].lockedBalance);

      if (available < amountCents) {
        throw new InsufficientBalanceError(
          `Insufficient wallet balance to accept order. Required commission: ${formatCentsToEtbString(
            amountCents
          )}, Available: ${formatCentsToEtbString(available)}`
        );
      }

      const newAvailable = available - amountCents;
      const newLocked = locked + amountCents;

      // 3. Update balances
      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: newAvailable,
          lockedBalance: newLocked,
        },
      });

      if (businessId) {
        await tx.business.update({
          where: { id: businessId },
          data: { commissionReserveBalance: centsToEtb(newAvailable) },
        });
      }

      // 4. Append WalletTransaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'COMMISSION_LOCK',
          amount: amountCents,
          ref: orderId,
          status: 'COMPLETED',
          balanceAfterAvailable: newAvailable,
          balanceAfterLocked: newLocked,
          metadata: {
            orderId,
            action: 'ORDER_PLACED_LOCK',
            amountEtb: centsToEtb(amountCents),
          },
        },
      });

      // 5. Trigger auto-pause check if enabled
      if (walletConfig.autoPauseEnabled) {
        await this.checkAndAutoPauseListings(businessId, tx, newAvailable);
      }

      return { availableBalance: newAvailable, lockedBalance: newLocked };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await prisma.$transaction(execute, TX_OPTIONS);
    }
  }

  /**
   * Release commission back to merchant available balance when an order is cancelled
   */
  public static async releaseCommission(orderId: string, externalTx?: any) {
    const execute = async (tx: any) => {
      // Find the Order to identify business and commission
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { business: true },
      });

      if (!order) return;

      const wallet = await tx.wallet.findUnique({
        where: { businessId: order.businessId },
      });

      if (!wallet) return;

      // Check if this order was already unlocked or settled
      const existingUnlock = await tx.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          ref: orderId,
          type: { in: ['COMMISSION_UNLOCK', 'COMMISSION_SETTLE_DEBIT'] },
        },
      });

      if (existingUnlock) {
        console.log(`[RELEASE COMMISSION] Order ${orderId} already settled or unlocked. Skipping.`);
        return;
      }

      // Find the lock transaction to get exact locked amount
      const lockTx = await tx.walletTransaction.findFirst({
        where: {
          walletId: wallet.id,
          ref: orderId,
          type: 'COMMISSION_LOCK',
        },
      });

      if (!lockTx) {
        console.log(`[RELEASE COMMISSION] No lock transaction found for order ${orderId}. Skipping.`);
        return;
      }

      const releaseAmount = BigInt(lockTx.amount);

      // Lock Wallet
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "availableBalance", "lockedBalance"
        FROM "Wallet"
        WHERE "id" = ${wallet.id}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) return;

      const available = BigInt(lockedRows[0].availableBalance);
      const locked = BigInt(lockedRows[0].lockedBalance);

      const actualRelease = locked >= releaseAmount ? releaseAmount : locked;
      const newAvailable = available + actualRelease;
      const newLocked = locked - actualRelease;

      await tx.wallet.update({
        where: { id: wallet.id },
        data: {
          availableBalance: newAvailable,
          lockedBalance: newLocked,
        },
      });

      if (order.businessId) {
        await tx.business.update({
          where: { id: order.businessId },
          data: { commissionReserveBalance: centsToEtb(newAvailable) },
        });
      }

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'COMMISSION_UNLOCK',
          amount: actualRelease,
          ref: orderId,
          status: 'COMPLETED',
          balanceAfterAvailable: newAvailable,
          balanceAfterLocked: newLocked,
          metadata: {
            orderId,
            action: 'ORDER_CANCELLED_RELEASE',
            amountEtb: centsToEtb(actualRelease),
          },
        },
      });

      // Unpause any paused listings if balance has been replenished
      await this.unpauseEligibleListings(order.businessId, tx);

      return { availableBalance: newAvailable, lockedBalance: newLocked };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await prisma.$transaction(execute, TX_OPTIONS);
    }
  }

  /**
   * Settle commission upon delivery confirmation:
   * Deducts from merchant's locked balance and credits salesperson's available balance
   */
  public static async settleCommission(orderId: string, externalTx?: any) {
    const execute = async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { business: true, salesPartner: true },
      });

      if (!order || !order.businessId || !order.salesPartnerId) {
        throw new Error(`Order ${orderId} does not have valid business and salesperson references.`);
      }

      const merchantWallet = await this.getOrCreateWallet({ businessId: order.businessId }, tx);
      const salesWallet = await this.getOrCreateWallet({ salesPartnerId: order.salesPartnerId }, tx);

      // Check if already settled
      const alreadySettled = await tx.walletTransaction.findFirst({
        where: {
          walletId: merchantWallet.id,
          ref: orderId,
          type: 'COMMISSION_SETTLE_DEBIT',
        },
      });

      if (alreadySettled) {
        console.log(`[SETTLE COMMISSION] Order ${orderId} commission already settled.`);
        return;
      }

      // Determine commission amount in cents
      let commissionCents = BigInt(0);
      const lockTx = await tx.walletTransaction.findFirst({
        where: {
          walletId: merchantWallet.id,
          ref: orderId,
          type: 'COMMISSION_LOCK',
        },
      });

      if (lockTx) {
        commissionCents = BigInt(lockTx.amount);
      } else {
        commissionCents = etbToCents(Number(order.commissionAmount || 0));
      }

      // Lock both wallets in deterministic order by ID to prevent deadlocks
      const [firstWalletId, secondWalletId] = [merchantWallet.id, salesWallet.id].sort();
      await tx.$queryRaw`SELECT "id" FROM "Wallet" WHERE "id" = ${firstWalletId} FOR UPDATE;`;
      await tx.$queryRaw`SELECT "id" FROM "Wallet" WHERE "id" = ${secondWalletId} FOR UPDATE;`;

      const merchantFresh = await tx.wallet.findUnique({ where: { id: merchantWallet.id } });
      const salesFresh = await tx.wallet.findUnique({ where: { id: salesWallet.id } });

      const merchantLocked = BigInt(merchantFresh!.lockedBalance);
      const merchantAvailable = BigInt(merchantFresh!.availableBalance);

      const salesAvailable = BigInt(salesFresh!.availableBalance);
      const salesLocked = BigInt(salesFresh!.lockedBalance);

      // Deduct from merchant locked
      const debitFromLocked = merchantLocked >= commissionCents ? commissionCents : merchantLocked;
      const newMerchantLocked = merchantLocked - debitFromLocked;

      await tx.wallet.update({
        where: { id: merchantWallet.id },
        data: { lockedBalance: newMerchantLocked },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: merchantWallet.id,
          type: 'COMMISSION_SETTLE_DEBIT',
          amount: commissionCents,
          ref: orderId,
          status: 'COMPLETED',
          balanceAfterAvailable: merchantAvailable,
          balanceAfterLocked: newMerchantLocked,
          metadata: {
            orderId,
            salesPartnerId: order.salesPartnerId,
            amountEtb: centsToEtb(commissionCents),
          },
        },
      });

      // Credit to salesperson available
      const newSalesAvailable = salesAvailable + commissionCents;
      await tx.wallet.update({
        where: { id: salesWallet.id },
        data: { availableBalance: newSalesAvailable },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: salesWallet.id,
          type: 'COMMISSION_SETTLE_CREDIT',
          amount: commissionCents,
          ref: orderId,
          status: 'COMPLETED',
          balanceAfterAvailable: newSalesAvailable,
          balanceAfterLocked: salesLocked,
          metadata: {
            orderId,
            businessId: order.businessId,
            amountEtb: centsToEtb(commissionCents),
          },
        },
      });

      if (order.salesPartnerId) {
        await tx.salesPartner.update({
          where: { id: order.salesPartnerId },
          data: {
            eligibleCommissions: centsToEtb(newSalesAvailable),
          },
        });
      }

      return {
        orderId,
        commissionSettledEtb: centsToEtb(commissionCents),
        merchantLockedRemaining: newMerchantLocked,
        salespersonNewAvailable: newSalesAvailable,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await prisma.$transaction(execute, TX_OPTIONS);
    }
  }

  /**
   * Hold withdrawal: locks funds into a pending payout hold
   */
  public static async holdWithdrawal(params: {
    salesPartnerId: string;
    amountCents: bigint;
    bankCode: string;
    bankName?: string;
    accountNumber: string;
    accountName: string;
  }) {
    const minWithdrawalCents = etbToCents(walletConfig.minWithdrawalEtb);
    if (params.amountCents < minWithdrawalCents) {
      throw new Error(`Minimum withdrawal amount is ${walletConfig.minWithdrawalEtb} ETB.`);
    }

    const reference = `POW-AA-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    return await prisma.$transaction(async (tx) => {
      const wallet = await this.getOrCreateWallet({ salesPartnerId: params.salesPartnerId }, tx);

      // Lock Wallet row
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "availableBalance", "lockedBalance"
        FROM "Wallet"
        WHERE "id" = ${wallet.id}
        FOR UPDATE;
      `;

      if (!lockedRows || lockedRows.length === 0) {
        throw new Error(`Salesperson wallet not found.`);
      }

      const available = BigInt(lockedRows[0].availableBalance);
      const locked = BigInt(lockedRows[0].lockedBalance);

      if (available < params.amountCents) {
        throw new InsufficientBalanceError(
          `Insufficient earnings balance for payout. Available: ${formatCentsToEtbString(
            available
          )}, Requested: ${formatCentsToEtbString(params.amountCents)}`
        );
      }

      const newAvailable = available - params.amountCents;

      // Deduct from available balance
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { availableBalance: newAvailable },
      });

      // Synchronize SalesPartner eligibleCommissions
      await tx.salesPartner.update({
        where: { id: params.salesPartnerId },
        data: { eligibleCommissions: centsToEtb(newAvailable) },
      });

      // Create Payout record
      const payout = await tx.payout.create({
        data: {
          walletId: wallet.id,
          salesPartnerId: params.salesPartnerId,
          amount: params.amountCents,
          currency: 'ETB',
          bankCode: params.bankCode,
          bankName: params.bankName || null,
          accountNumber: params.accountNumber,
          accountName: params.accountName,
          reference,
          status: 'PENDING',
        },
      });

      // Append PAYOUT_HOLD transaction
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'PAYOUT_HOLD',
          amount: params.amountCents,
          ref: reference,
          status: 'COMPLETED',
          balanceAfterAvailable: newAvailable,
          balanceAfterLocked: locked,
          metadata: {
            payoutId: payout.id,
            bankCode: params.bankCode,
            accountNumber: params.accountNumber,
            amountEtb: centsToEtb(params.amountCents),
          },
        },
      });

      return { payout, reference };
    }, TX_OPTIONS);
  }

  /**
   * Confirms successful payout from Chapa transfer webhook
   */
  public static async confirmWithdrawal(payoutReference: string, chapaTransferId?: string, rawPayload?: any) {
    return await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { reference: payoutReference },
      });

      if (!payout) {
        throw new Error(`Payout with reference ${payoutReference} not found.`);
      }

      if (payout.status === 'SUCCESS') {
        return { alreadyConfirmed: true, payout };
      }

      const wallet = await tx.wallet.findUnique({ where: { id: payout.walletId } });
      const available = BigInt(wallet!.availableBalance);
      const locked = BigInt(wallet!.lockedBalance);

      // Update Payout
      const updatedPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'SUCCESS',
          chapaTransferId: chapaTransferId || payout.chapaTransferId,
          verifiedAt: new Date(),
          rawWebhookPayload: rawPayload || undefined,
        },
      });

      // Append PAYOUT_SUCCESS
      await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: 'PAYOUT_SUCCESS',
          amount: payout.amount,
          ref: payoutReference,
          status: 'COMPLETED',
          balanceAfterAvailable: available,
          balanceAfterLocked: locked,
          metadata: {
            payoutId: payout.id,
            chapaTransferId,
            amountEtb: centsToEtb(payout.amount),
          },
        },
      });

      // Update sales partner paid commissions counter
      if (payout.salesPartnerId) {
        await tx.salesPartner.update({
          where: { id: payout.salesPartnerId },
          data: {
            paidCommissions: { increment: centsToEtb(payout.amount) },
          },
        });
      }

      return { alreadyConfirmed: false, payout: updatedPayout };
    }, TX_OPTIONS);
  }

  /**
   * Refunds a failed withdrawal back to the salesperson's available balance
   */
  public static async refundWithdrawal(payoutReference: string, failureReason?: string, rawPayload?: any) {
    return await prisma.$transaction(async (tx) => {
      const payout = await tx.payout.findUnique({
        where: { reference: payoutReference },
      });

      if (!payout) {
        throw new Error(`Payout with reference ${payoutReference} not found.`);
      }

      if (payout.status === 'FAILED') {
        return { alreadyRefunded: true, payout };
      }

      // Lock Wallet
      const lockedRows: any[] = await tx.$queryRaw`
        SELECT "id", "availableBalance", "lockedBalance"
        FROM "Wallet"
        WHERE "id" = ${payout.walletId}
        FOR UPDATE;
      `;

      const available = BigInt(lockedRows[0].availableBalance);
      const locked = BigInt(lockedRows[0].lockedBalance);
      const newAvailable = available + BigInt(payout.amount);

      // Refund available balance
      await tx.wallet.update({
        where: { id: payout.walletId },
        data: { availableBalance: newAvailable },
      });

      // Update Payout status
      const updatedPayout = await tx.payout.update({
        where: { id: payout.id },
        data: {
          status: 'FAILED',
          failureReason: failureReason || 'Transfer failed at Chapa bank processor',
          rawWebhookPayload: rawPayload || undefined,
          verifiedAt: new Date(),
        },
      });

      // Append PAYOUT_REFUND transaction
      await tx.walletTransaction.create({
        data: {
          walletId: payout.walletId,
          type: 'PAYOUT_REFUND',
          amount: payout.amount,
          ref: payoutReference,
          status: 'COMPLETED',
          balanceAfterAvailable: newAvailable,
          balanceAfterLocked: locked,
          metadata: {
            payoutId: payout.id,
            reason: failureReason,
            amountEtb: centsToEtb(payout.amount),
          },
        },
      });

      // Restore sales partner eligible commissions
      if (payout.salesPartnerId) {
        await tx.salesPartner.update({
          where: { id: payout.salesPartnerId },
          data: {
            eligibleCommissions: centsToEtb(newAvailable),
          },
        });
      }

      return { alreadyRefunded: false, payout: updatedPayout, refundedAmountEtb: centsToEtb(payout.amount) };
    }, TX_OPTIONS);
  }

  /**
   * Business Rule 1 & Rule 4:
   * Checks if merchant wallet has sufficient deposit collateral before creating a listing
   */
  public static async validateListingCollateral(params: {
    businessId: string;
    stock: number;
    commissionPerUnit: number;
  }) {
    const wallet = await this.getOrCreateWallet({ businessId: params.businessId });
    const availableCents = BigInt(wallet.availableBalance);

    const commissionPerUnitCents = etbToCents(params.commissionPerUnit);

    // Calculate required collateral based on config mode
    let requiredCentsForNewProduct: bigint;
    if (walletConfig.listingCollateralMode === 'PER_STOCK') {
      const stockCount = BigInt(Math.max(1, params.stock));
      requiredCentsForNewProduct = stockCount * commissionPerUnitCents;
    } else {
      // 1 x commission per product
      requiredCentsForNewProduct = commissionPerUnitCents;
    }

    if (availableCents < requiredCentsForNewProduct) {
      const shortfallCents = requiredCentsForNewProduct - availableCents;
      throw new InsufficientCollateralError(
        `Merchant wallet requires deposit collateral before listing. Mode: ${walletConfig.listingCollateralMode
        }. Required deposit: ${formatCentsToEtbString(
          requiredCentsForNewProduct
        )}, Available in wallet: ${formatCentsToEtbString(
          availableCents
        )}. Shortfall: ${formatCentsToEtbString(shortfallCents)}. Please deposit funds first.`,
        {
          mode: walletConfig.listingCollateralMode,
          requiredEtb: centsToEtb(requiredCentsForNewProduct),
          availableEtb: centsToEtb(availableCents),
          shortfallEtb: centsToEtb(shortfallCents),
        }
      );
    }

    return {
      eligible: true,
      mode: walletConfig.listingCollateralMode,
      requiredCents: requiredCentsForNewProduct,
      availableCents,
    };
  }

  /**
   * Rule 4 Auto-Pause:
   * Pauses active product listings if available wallet balance drops below 1 commission
   */
  public static async checkAndAutoPauseListings(businessId: string, tx: any, currentAvailableCents?: bigint) {
    if (!walletConfig.autoPauseEnabled) return;

    let available = currentAvailableCents;
    if (available === undefined) {
      const wallet = await tx.wallet.findUnique({ where: { businessId } });
      if (!wallet) return;
      available = BigInt(wallet.availableBalance);
    }

    // Fetch active products for this business
    const activeProducts = await tx.product.findMany({
      where: { businessId, isActive: true },
      select: { id: true, name: true, unitPrice: true, costPrice: true, description: true },
    });

    for (const prod of activeProducts) {
      // Parse commission rate
      let commRate = 12; // default 12%
      const commMatch = prod.description?.match(/<!--COMM:(\{.*?\})-->/);
      if (commMatch) {
        try {
          const parsed = JSON.parse(commMatch[1]);
          if (parsed.rate !== undefined) commRate = Number(parsed.rate);
        } catch { }
      } else if (prod.costPrice && Number(prod.costPrice) > 0 && Number(prod.costPrice) <= 100) {
        commRate = Number(prod.costPrice);
      }

      const unitPrice = Number(prod.unitPrice);
      const minCommissionForOneUnit = Math.round(unitPrice * (commRate / 100));
      const minCommissionCents = etbToCents(minCommissionForOneUnit);

      // If available balance drops below one commission, auto-pause this listing
      if (available < minCommissionCents) {
        await tx.product.update({
          where: { id: prod.id },
          data: { isActive: false },
        });

        console.log(
          `⚠️ [WALLET AUTO-PAUSE] Product "${prod.name}" (${prod.id}) was auto-paused. Available balance (${centsToEtb(
            available
          )} ETB) is below 1 unit commission (${minCommissionForOneUnit} ETB).`
        );

        try {
          await tx.auditLog.create({
            data: {
              actorRole: 'system',
              actorName: 'Azwari Wallet Risk Engine',
              action: 'PRODUCT_AUTO_PAUSED',
              entityType: 'Product',
              entityId: prod.id,
              businessId,
              description: `Listing "${prod.name}" automatically paused because merchant wallet balance dropped below 1 unit commission collateral (${minCommissionForOneUnit} ETB).`,
            },
          });
        } catch (logErr) { }
      }
    }
  }

  /**
   * Automatically unpauses eligible listings when deposit restores merchant balance
   */
  public static async unpauseEligibleListings(businessId: string, tx: any) {
    const wallet = await tx.wallet.findUnique({ where: { businessId } });
    if (!wallet) return;

    let available = BigInt(wallet.availableBalance);

    const pausedProducts = await tx.product.findMany({
      where: { businessId, isActive: false },
      select: { id: true, name: true, unitPrice: true, costPrice: true, description: true },
    });

    for (const prod of pausedProducts) {
      let commRate = 12;
      const commMatch = prod.description?.match(/<!--COMM:(\{.*?\})-->/);
      if (commMatch) {
        try {
          const parsed = JSON.parse(commMatch[1]);
          if (parsed.rate !== undefined) commRate = Number(parsed.rate);
        } catch { }
      } else if (prod.costPrice && Number(prod.costPrice) > 0 && Number(prod.costPrice) <= 100) {
        commRate = Number(prod.costPrice);
      }

      const unitPrice = Number(prod.unitPrice);
      const minCommissionForOneUnit = Math.round(unitPrice * (commRate / 100));
      const minCommissionCents = etbToCents(minCommissionForOneUnit);

      if (available >= minCommissionCents) {
        await tx.product.update({
          where: { id: prod.id },
          data: { isActive: true },
        });

        console.log(
          `✨ [WALLET AUTO-UNPAUSE] Product "${prod.name}" (${prod.id}) was auto-restored after deposit replenishment.`
        );

        try {
          await tx.auditLog.create({
            data: {
              actorRole: 'system',
              actorName: 'Azwari Wallet Risk Engine',
              action: 'PRODUCT_AUTO_UNPAUSED',
              entityType: 'Product',
              entityId: prod.id,
              businessId,
              description: `Listing "${prod.name}" restored to active status following merchant wallet deposit.`,
            },
          });
        } catch { }
      }
    }
  }
}
