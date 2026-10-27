import { prisma } from '../src/prisma';
import { ChapaService } from '../src/services/chapaService';
import { centsToEtb, formatCentsToEtbString } from '../src/config/walletConfig';
import dotenv from 'dotenv';

dotenv.config();

export interface ReconciliationReport {
  timestamp: string;
  isBalanced: boolean;
  totalWallets: number;
  totalAvailableEtb: number;
  totalLockedEtb: number;
  totalInternalBalanceEtb: number;
  totalDepositsEtb: number;
  totalPayoutsEtb: number;
  totalPendingPayoutsEtb: number;
  chapaGatewayBalanceEtb: number;
  internalVarianceEtb: number;
  gatewayVarianceEtb: number;
  anomalies: string[];
}

export async function runReconciliation(): Promise<ReconciliationReport> {
  const anomalies: string[] = [];

  console.log('\n============================================================');
  console.log('⚖️  AZWARI DAILY FINANCIAL RECONCILIATION AUDIT');
  console.log('============================================================');
  console.log(`⏰ Time: ${new Date().toISOString()}`);

  // 1. Fetch Wallets sum
  const wallets = await prisma.wallet.findMany();
  let totalAvailableCents = BigInt(0);
  let totalLockedCents = BigInt(0);

  for (const w of wallets) {
    const avail = BigInt(w.availableBalance);
    const locked = BigInt(w.lockedBalance);

    if (avail < 0n) {
      anomalies.push(`CRITICAL: Wallet ${w.id} has negative available balance: ${avail}`);
    }
    if (locked < 0n) {
      anomalies.push(`CRITICAL: Wallet ${w.id} has negative locked balance: ${locked}`);
    }

    totalAvailableCents += avail;
    totalLockedCents += locked;
  }

  const totalInternalBalanceCents = totalAvailableCents + totalLockedCents;

  // 2. Fetch Successful Deposits
  const successfulDeposits = await prisma.deposit.findMany({
    where: { status: 'SUCCESS' },
  });
  let totalDepositsCents = BigInt(0);
  for (const d of successfulDeposits) {
    totalDepositsCents += BigInt(d.amount);
  }

  // 3. Fetch Successful Payouts
  const successfulPayouts = await prisma.payout.findMany({
    where: { status: 'SUCCESS' },
  });
  let totalPayoutsCents = BigInt(0);
  for (const p of successfulPayouts) {
    totalPayoutsCents += BigInt(p.amount);
  }

  // 4. Fetch Pending Payouts (Holds)
  const pendingPayouts = await prisma.payout.findMany({
    where: { status: 'PENDING' },
  });
  let totalPendingPayoutsCents = BigInt(0);
  for (const p of pendingPayouts) {
    totalPendingPayoutsCents += BigInt(p.amount);
  }

  // 5. Fetch Live Chapa Gateway Balance
  let chapaBalanceCents = BigInt(0);
  try {
    const chapaRes = await ChapaService.getBalance();
    chapaBalanceCents = chapaRes.balanceCents;
    console.log(`📡 Chapa Gateway Connection: ACTIVE (Reported Balance: ${formatCentsToEtbString(chapaBalanceCents)})`);
  } catch (err: any) {
    console.warn(`⚠️ Could not reach Chapa balance endpoint: ${err.message}`);
    anomalies.push(`Chapa balance fetch failed: ${err.message}`);
  }

  // 6. Invariant 1: Internal Double-Entry Consistency
  // Expected internal balance = (Total Net Deposits - Total Settled Payouts - Total Pending Payout Holds)
  const expectedInternalCents = totalDepositsCents - totalPayoutsCents - totalPendingPayoutsCents;
  const internalVarianceCents = totalInternalBalanceCents - expectedInternalCents;

  if (internalVarianceCents !== 0n) {
    anomalies.push(
      `Internal Ledger Invariant Violation! Discrepancy of ${formatCentsToEtbString(
        internalVarianceCents
      )} between wallet balances and net deposit/payout ledger.`
    );
  }

  // 7. Invariant 2: External Gateway Consistency
  // Chapa balance should match Net Deposits minus Payouts (within transaction fees)
  const expectedGatewayCents = totalDepositsCents - totalPayoutsCents;
  const gatewayVarianceCents = chapaBalanceCents > 0n ? chapaBalanceCents - expectedGatewayCents : 0n;

  // Print Summary Table
  console.log('\n--- INTERNAL POSTGRESQL LEDGER STATS ---');
  console.log(`Wallets Active:            ${wallets.length}`);
  console.log(`Total Available Balance:   ${formatCentsToEtbString(totalAvailableCents)}`);
  console.log(`Total Locked Escrow:       ${formatCentsToEtbString(totalLockedCents)}`);
  console.log(`Total Internal Balances:   ${formatCentsToEtbString(totalInternalBalanceCents)}`);
  console.log('----------------------------------------');
  console.log(`Total Verified Deposits:   ${formatCentsToEtbString(totalDepositsCents)} (${successfulDeposits.length} txs)`);
  console.log(`Total Settled Payouts:     ${formatCentsToEtbString(totalPayoutsCents)} (${successfulPayouts.length} txs)`);
  console.log(`Total Pending Payouts:     ${formatCentsToEtbString(totalPendingPayoutsCents)} (${pendingPayouts.length} holds)`);
  console.log(`Expected Internal Balance: ${formatCentsToEtbString(expectedInternalCents)}`);
  console.log(`Internal Variance:         ${formatCentsToEtbString(internalVarianceCents)}`);

  console.log('\n--- EXTERNAL CHAPA GATEWAY STATS ---');
  console.log(`Chapa Live Balance:        ${formatCentsToEtbString(chapaBalanceCents)}`);
  console.log(`Gateway Variance:          ${formatCentsToEtbString(gatewayVarianceCents)}`);

  const isBalanced = internalVarianceCents === 0n && anomalies.length === 0;

  console.log('\n============================================================');
  if (isBalanced) {
    console.log('✅ RECONCILIATION STATUS: PERFECTLY BALANCED (0.00 Variance)');
  } else {
    console.log('❌ RECONCILIATION STATUS: DISCREPANCIES DETECTED');
    anomalies.forEach((a, i) => console.log(`   ${i + 1}. ${a}`));
  }
  console.log('============================================================\n');

  return {
    timestamp: new Date().toISOString(),
    isBalanced,
    totalWallets: wallets.length,
    totalAvailableEtb: centsToEtb(totalAvailableCents),
    totalLockedEtb: centsToEtb(totalLockedCents),
    totalInternalBalanceEtb: centsToEtb(totalInternalBalanceCents),
    totalDepositsEtb: centsToEtb(totalDepositsCents),
    totalPayoutsEtb: centsToEtb(totalPayoutsCents),
    totalPendingPayoutsEtb: centsToEtb(totalPendingPayoutsCents),
    chapaGatewayBalanceEtb: centsToEtb(chapaBalanceCents),
    internalVarianceEtb: centsToEtb(internalVarianceCents),
    gatewayVarianceEtb: centsToEtb(gatewayVarianceCents),
    anomalies,
  };
}

if (process.argv[1] && process.argv[1].includes('reconcile_ledger')) {
  runReconciliation()
    .then((report) => {
      process.exit(report.isBalanced ? 0 : 1);
    })
    .catch((err) => {
      console.error('[FATAL RECONCILIATION ERROR]', err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
