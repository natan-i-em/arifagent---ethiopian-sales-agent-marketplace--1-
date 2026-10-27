import dotenv from 'dotenv';

dotenv.config();

export interface WalletSystemConfig {
  chapaSecretKey: string;
  chapaWebhookSecret: string;
  chapaBaseUrl: string;
  chapaCallbackUrl: string;
  chapaReturnUrl: string;
  minWithdrawalEtb: number;
  minDepositEtb: number;
  listingCollateralMode: 'PER_STOCK' | 'PER_PRODUCT';
  autoPauseEnabled: boolean;
}

export const walletConfig: WalletSystemConfig = {
  chapaSecretKey: process.env.CHAPA_SECRET_KEY || '',
  chapaWebhookSecret: process.env.CHAPA_WEBHOOK_SECRET || process.env.CHAPA_SECRET_KEY || '',
  chapaBaseUrl: process.env.CHAPA_BASE_URL || 'https://api.chapa.co/v1',
  chapaCallbackUrl: process.env.CHAPA_CALLBACK_URL || 'http://localhost:5000/api/webhooks/chapa',
  chapaReturnUrl: process.env.CHAPA_RETURN_URL || 'http://localhost:3000/portal/supplier?tab=wallet&deposit=return',
  minWithdrawalEtb: Number(process.env.MIN_WITHDRAWAL_ETB || 10),
  minDepositEtb: Number(process.env.MIN_DEPOSIT_ETB || 10),
  listingCollateralMode: (process.env.WALLET_LISTING_COLLATERAL_MODE || 'PER_STOCK') as 'PER_STOCK' | 'PER_PRODUCT',
  autoPauseEnabled: process.env.WALLET_AUTO_PAUSE_ENABLED !== 'false', // Default true
};

/**
 * Converts ETB (e.g. 150.50) into integer cents (15050n)
 */
export function etbToCents(etbAmount: number): bigint {
  if (isNaN(etbAmount) || etbAmount < 0) {
    throw new Error(`Invalid ETB amount: ${etbAmount}`);
  }
  // Math.round to avoid JS floating point artifacts (e.g., 19.99 * 100 = 1998.9999999999998)
  const centsNumber = Math.round(etbAmount * 100);
  return BigInt(centsNumber);
}

/**
 * Converts integer cents (15050n) into ETB number (150.5)
 */
export function centsToEtb(cents: bigint | number): number {
  const c = typeof cents === 'bigint' ? Number(cents) : cents;
  return Number((c / 100).toFixed(2));
}

/**
 * Formats integer cents into user-friendly ETB currency string (e.g. "ETB 1,250.00")
 */
export function formatCentsToEtbString(cents: bigint | number): string {
  const etb = centsToEtb(cents);
  return `ETB ${etb.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
