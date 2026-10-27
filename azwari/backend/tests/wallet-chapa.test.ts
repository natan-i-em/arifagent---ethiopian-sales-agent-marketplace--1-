import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { prisma } from '../src/prisma.js';
import { ChapaService } from '../src/services/chapaService.js';
import { WalletService, InsufficientBalanceError } from '../src/services/walletService.js';
import { walletConfig, etbToCents, centsToEtb } from '../src/config/walletConfig.js';

describe('Azwari Merchant Wallet & Chapa Payment Integration Test Suite', () => {
  const testRunId = Date.now().toString(36);
  let testBusinessId: string;
  let testSalesPartnerId: string;
  let testMerchantWalletId: string;
  let testSalespersonWalletId: string;

  before(async () => {
    // Ensure test secret key is configured for HMAC
    process.env.CHAPA_WEBHOOK_SECRET = process.env.CHAPA_WEBHOOK_SECRET || 'test_chapa_secret_key_123456';
    walletConfig.chapaWebhookSecret = process.env.CHAPA_WEBHOOK_SECRET;
    walletConfig.chapaSecretKey = process.env.CHAPA_WEBHOOK_SECRET;

    // 1. Create temporary test Business
    const biz = await prisma.business.create({
      data: {
        name: `Test Merchant ${testRunId}`,
        tradeName: `Test Trade ${testRunId}`,
        tinNumber: `TIN-${testRunId}`,
        licenseNumber: `LIC-${testRunId}`,
        subcity: 'Bole',
        specificLocation: 'Atlas',
        phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
        contactEmail: `merchant-${testRunId}@test.azwari.et`,
      },
    });
    testBusinessId = biz.id;

    // 2. Create temporary test SalesPartner
    const sp = await prisma.salesPartner.create({
      data: {
        fullName: `Test Agent ${testRunId}`,
        phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
        subcity: 'Kirkos',
        referralCode: `REF-${testRunId}`,
        payoutAccountNumber: '100012345678',
        payoutAccountName: `Test Agent ${testRunId}`,
      },
    });
    testSalesPartnerId = sp.id;

    // 3. Provision Wallets
    const mWallet = await WalletService.getOrCreateWallet({ businessId: testBusinessId });
    testMerchantWalletId = mWallet.id;

    const sWallet = await WalletService.getOrCreateWallet({ salesPartnerId: testSalesPartnerId });
    testSalespersonWalletId = sWallet.id;
  });

  after(async () => {
    // Note: WalletTransaction has an immutability trigger preventing DELETE,
    // so test records are safely preserved as an audit trail.
  });

  // TEST 1: Webhook signature rejection
  it('1. Webhook signature rejection (tampered body or invalid signature fails)', () => {
    const rawPayload = JSON.stringify({
      event: 'charge.complete',
      tx_ref: 'DEP-TEST-1234',
      amount: '500.00',
      currency: 'ETB',
    });

    const secret = walletConfig.chapaWebhookSecret;
    const validSignature = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');

    // 1a. Valid signature must pass
    const isValid = ChapaService.verifyWebhookSignature(rawPayload, validSignature);
    assert.equal(isValid, true, 'Valid HMAC signature must be accepted');

    // 1b. Forged signature must fail
    const forgedSignature = '0000000000000000000000000000000000000000000000000000000000000000';
    const isForgedValid = ChapaService.verifyWebhookSignature(rawPayload, forgedSignature);
    assert.equal(isForgedValid, false, 'Forged HMAC signature must be rejected');

    // 1c. Tampered body with original signature must fail
    const tamperedPayload = JSON.stringify({
      event: 'charge.complete',
      tx_ref: 'DEP-TEST-1234',
      amount: '50000.00', // Attacker altered 500 to 50000
      currency: 'ETB',
    });
    const isTamperedValid = ChapaService.verifyWebhookSignature(tamperedPayload, validSignature);
    assert.equal(isTamperedValid, false, 'Tampered payload body must be rejected');

    // 1d. Missing signature must fail
    const isMissingValid = ChapaService.verifyWebhookSignature(rawPayload, undefined);
    assert.equal(isMissingValid, false, 'Missing signature must be rejected');
  });

  // TEST 2: Duplicate webhook (no double credit)
  it('2. Duplicate webhook idempotency (no double crediting on identical tx_ref)', async () => {
    const txRef = `DEP-DUP-${testRunId}`;
    const depositAmountCents = 100000n; // 1,000 ETB

    // Initialize pending deposit
    await WalletService.createPendingDeposit({
      businessId: testBusinessId,
      amountCents: depositAmountCents,
      txRef,
    });

    // Capture baseline wallet balance
    const baseWallet = await prisma.wallet.findUnique({ where: { id: testMerchantWalletId } });
    const baselineAvailable = BigInt(baseWallet!.availableBalance);

    // First Webhook Arrival -> Credits wallet
    const firstCredit = await WalletService.creditDeposit({
      walletId: testMerchantWalletId,
      amountCents: depositAmountCents,
      txRef,
      chapaReference: 'CHAPA-REF-001',
    });

    assert.equal(firstCredit.alreadyProcessed, false, 'First credit should process successfully');

    const walletAfterFirst = await prisma.wallet.findUnique({ where: { id: testMerchantWalletId } });
    assert.equal(
      BigInt(walletAfterFirst!.availableBalance),
      baselineAvailable + depositAmountCents,
      'Available balance must be incremented by 1,000 ETB'
    );

    // Duplicate Webhook Arrival (e.g. Chapa network retry)
    const duplicateCredit = await WalletService.creditDeposit({
      walletId: testMerchantWalletId,
      amountCents: depositAmountCents,
      txRef,
      chapaReference: 'CHAPA-REF-001',
    });

    assert.equal(duplicateCredit.alreadyProcessed, true, 'Duplicate webhook must be identified as already processed');

    // Verify balance was NOT credited twice
    const walletAfterDuplicate = await prisma.wallet.findUnique({ where: { id: testMerchantWalletId } });
    assert.equal(
      BigInt(walletAfterDuplicate!.availableBalance),
      baselineAvailable + depositAmountCents,
      'Duplicate webhook must NOT alter or double-credit wallet balance'
    );
  });

  // TEST 3: Insufficient balance
  it('3. Insufficient balance rejection for commission lock and withdrawal', async () => {
    // 3a. Commission Lock Insufficient Balance
    const excessiveCommissionCents = 999999999n; // Far exceeds available
    const fakeOrderId = `ORD-FAIL-${testRunId}`;

    await assert.rejects(
      async () => {
        await WalletService.lockCommission(fakeOrderId, testBusinessId, excessiveCommissionCents);
      },
      (err: any) => {
        assert.equal(err.name, 'InsufficientBalanceError');
        assert.match(err.message, /Insufficient wallet balance/);
        return true;
      },
      'Locking commission exceeding available balance must throw InsufficientBalanceError'
    );

    // 3b. Salesperson Withdrawal Insufficient Balance
    await assert.rejects(
      async () => {
        await WalletService.holdWithdrawal({
          salesPartnerId: testSalesPartnerId,
          amountCents: 5000000n, // 50,000 ETB requested on 0 ETB balance
          bankCode: '855',
          accountNumber: '100012345678',
          accountName: 'Test Agent',
        });
      },
      (err: any) => {
        assert.equal(err.name, 'InsufficientBalanceError');
        assert.match(err.message, /Insufficient earnings balance/);
        return true;
      },
      'Withdrawal exceeding earnings balance must throw InsufficientBalanceError'
    );
  });

  // TEST 4: Concurrent order locking (SELECT ... FOR UPDATE prevents race conditions)
  it('4. Concurrent order locking (prevents race conditions and double spending)', async () => {
    // Create an isolated test business and wallet with exactly 150 ETB (15000 cents)
    const concurrentBiz = await prisma.business.create({
      data: {
        name: `Concurrent Biz ${testRunId}`,
        tradeName: `Concurrent Trade ${testRunId}`,
        tinNumber: `TIN-CONCUR-${testRunId}`,
        licenseNumber: `LIC-CONCUR-${testRunId}`,
        subcity: 'Bole',
        specificLocation: 'Bole',
        phone: `+2519${Math.floor(10000000 + Math.random() * 90000000)}`,
        contactEmail: `concur-${testRunId}@test.azwari.et`,
      },
    });

    const cWallet = await WalletService.getOrCreateWallet({ businessId: concurrentBiz.id });

    // Seed wallet with exactly 150 ETB (15000 cents)
    await prisma.wallet.update({
      where: { id: cWallet.id },
      data: { availableBalance: 15000n, lockedBalance: 0n },
    });

    // Two orders simultaneously placed, each requesting 100 ETB (10000 cents) commission.
    // Total demanded = 200 ETB > 150 ETB available.
    // Concurrency safety (SELECT ... FOR UPDATE) MUST ensure exactly one succeeds and one fails!
    const order1Id = `ORD-CONCUR-1-${testRunId}`;
    const order2Id = `ORD-CONCUR-2-${testRunId}`;
    const commissionDemand = 10000n; // 100 ETB

    const [res1, res2] = await Promise.allSettled([
      WalletService.lockCommission(order1Id, concurrentBiz.id, commissionDemand),
      WalletService.lockCommission(order2Id, concurrentBiz.id, commissionDemand),
    ]);

    const successes = [res1, res2].filter((r) => r.status === 'fulfilled');
    const failures = [res1, res2].filter((r) => r.status === 'rejected');

    assert.equal(successes.length, 1, 'Exactly one concurrent commission lock must succeed');
    assert.equal(failures.length, 1, 'Exactly one concurrent commission lock must fail due to balance depletion');

    // Verify database state: Available should be 50 ETB, Locked should be 100 ETB
    const freshWallet = await prisma.wallet.findUnique({ where: { id: cWallet.id } });
    assert.equal(BigInt(freshWallet!.availableBalance), 5000n, 'Available balance must be exactly 50 ETB');
    assert.equal(BigInt(freshWallet!.lockedBalance), 10000n, 'Locked balance must be exactly 100 ETB');
  });

  // TEST 5: Failed payout refund
  it('5. Failed payout refund (reverses held funds back to salesperson available balance)', async () => {
    // 1. Credit salesperson wallet with 500 ETB (50000 cents)
    await prisma.wallet.update({
      where: { id: testSalespersonWalletId },
      data: { availableBalance: 50000n, lockedBalance: 0n },
    });

    const withdrawalAmountCents = 20000n; // 200 ETB

    // 2. Initiate payout hold
    const { payout, reference } = await WalletService.holdWithdrawal({
      salesPartnerId: testSalesPartnerId,
      amountCents: withdrawalAmountCents,
      bankCode: '855',
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '100098765432',
      accountName: 'Test Sales Agent',
    });

    assert.equal(payout.status, 'PENDING');

    // Available balance should now be 300 ETB (30000 cents)
    const walletDuringHold = await prisma.wallet.findUnique({ where: { id: testSalespersonWalletId } });
    assert.equal(BigInt(walletDuringHold!.availableBalance), 30000n, 'Available balance must decrease by payout amount during hold');

    // 3. Simulate Chapa transfer failure webhook
    const refundResult = await WalletService.refundWithdrawal(
      reference,
      'Account number does not match recipient name at bank'
    );

    assert.equal(refundResult.alreadyRefunded, false);
    assert.equal(refundResult.payout.status, 'FAILED');
    assert.equal(refundResult.refundedAmountEtb, 200);

    // 4. Verify balance was restored back to 500 ETB
    const walletAfterRefund = await prisma.wallet.findUnique({ where: { id: testSalespersonWalletId } });
    assert.equal(
      BigInt(walletAfterRefund!.availableBalance),
      50000n,
      'Available balance must be restored to original 500 ETB upon payout failure'
    );

    // 5. Verify PAYOUT_REFUND transaction in append-only ledger
    const refundTx = await prisma.walletTransaction.findFirst({
      where: {
        walletId: testSalespersonWalletId,
        ref: reference,
        type: 'PAYOUT_REFUND',
      },
    });

    assert.ok(refundTx, 'PAYOUT_REFUND ledger transaction must be created');
    assert.equal(BigInt(refundTx!.amount), withdrawalAmountCents);
    assert.equal(BigInt(refundTx!.balanceAfterAvailable), 50000n);
  });
});
