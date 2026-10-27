# Azwari Merchant Wallet & Chapa Payment Integration

This guide documents the merchant collateral wallet and Chapa payment integration for **Azwari**, a commission-only freelance sales marketplace in Ethiopia (ETB).

---

## 1. Problem Solved & Business Rules

1. **Guaranteed Commission Escrow**:
   - Merchants must deposit money into their Azwari wallet before listing products.
   - **Collateral Modes** (`WALLET_LISTING_COLLATERAL_MODE` in `.env`):
     - `PER_STOCK` (*Default*): Required Deposit = $\sum (\text{Stock} \times \text{Commission per product})$.
     - `PER_PRODUCT`: Required Deposit = $\sum (1 \times \text{Commission per product})$.
2. **Order Lifecycle Ledger Movements**:
   - **Order Placed**: Commission amount moves from merchant wallet `availableBalance` $\to$ `lockedBalance`.
   - **Delivery Confirmed**: Commission moves from merchant `lockedBalance` $\to$ salesperson `availableBalance` (earnings).
   - **Order Cancelled / Expired**: Commission is unlocked from merchant `lockedBalance` back to `availableBalance`.
3. **Auto-Pause Risk Control** (`WALLET_AUTO_PAUSE_ENABLED=true`):
   - When merchant available balance drops below the commission needed for 1 unit of an active listing, that product is automatically deactivated (`isActive: false`) and logged to `AuditLog`.
   - Upon a new deposit replenishment, paused listings are automatically restored to active status.
4. **Append-Only Ledger**:
   - The `WalletTransaction` table is strictly append-only.
   - Database-level trigger `trg_prevent_wallet_transaction_mod` forbids any `UPDATE` or `DELETE` operations.
   - Concurrency is protected via raw SQL `SELECT ... FOR UPDATE` row locks inside atomic transactions.
5. **Idempotency**:
   - Unique constraints on `txRef` in `Deposit` and `reference` in `Payout`.
   - Webhook calls are processed idempotently.

---

## 2. Environment Configuration

Add the following to your `.env` file:

```env
# Chapa API Credentials
CHAPA_SECRET_KEY="CHASECK_TEST-your-chapa-secret-key"
CHAPA_WEBHOOK_SECRET="your-chapa-webhook-secret-hash"
CHAPA_BASE_URL="https://api.chapa.co/v1"
CHAPA_CALLBACK_URL="http://localhost:5000/api/webhooks/chapa"
CHAPA_RETURN_URL="http://localhost:3000/merchant/wallet?status=return"

# Minimum thresholds (in ETB)
MIN_WITHDRAWAL_ETB=100
MIN_DEPOSIT_ETB=10

# Business rules
WALLET_LISTING_COLLATERAL_MODE="PER_STOCK"
WALLET_AUTO_PAUSE_ENABLED="true"
```

---

## 3. Chapa Sandbox Testing Guide

### A. Setting up Chapa Sandbox Keys
1. Log in to [Chapa Dashboard](https://dashboard.chapa.co).
2. Toggle to **Test Mode / Sandbox**.
3. Go to **Settings > API & Webhooks**:
   - Copy **Public Key** and **Secret Key** (`CHASECK_TEST-...`).
   - In the **Webhooks** section, set your Webhook URL (e.g. via ngrok: `https://your-domain.ngrok-free.app/api/webhooks/chapa`).
   - Set a **Secret Hash** and paste it into `CHAPA_WEBHOOK_SECRET`.

### B. Chapa Test Credentials

#### Test Payment Cards:
| Card Number | Expiry | CVV | OTP | Result |
| :--- | :--- | :--- | :--- | :--- |
| `4084084084084081` | Any future date | `123` | `1234` | **Success** |
| `4084084084084082` | Any future date | `123` | - | **Declined / Failed** |

#### Test Mobile Wallets (Telebirr / CBEBirr):
- **Phone**: Any 10-digit Ethiopian number starting with `09` (e.g., `0911223344`).
- **OTP**: `1234` or any 4-digit code.

---

## 4. API Endpoints

### 1. `GET /api/wallet`
Returns wallet balances and recent transactions.
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
```json
{
  "success": true,
  "wallet": {
    "walletId": "b1b6894c-...",
    "ownerType": "MERCHANT",
    "balances": {
      "availableCents": "150000",
      "lockedCents": "12000",
      "totalCents": "162000",
      "availableEtb": 1500.00,
      "lockedEtb": 120.00,
      "totalEtb": 1620.00,
      "currency": "ETB"
    },
    "transactions": [...]
  }
}
```

### 2. `POST /api/wallet/deposit`
Initiates a Chapa payment to deposit funds into the merchant's wallet.
- **Headers**: `Authorization: Bearer <merchant_token>`
- **Body**:
```json
{
  "amount": 500
}
```
- **Response**:
```json
{
  "success": true,
  "tx_ref": "DEP-AA-1740000000-ABC",
  "checkout_url": "https://checkout.chapa.co/checkout/payment/...",
  "amount": 500,
  "currency": "ETB"
}
```

### 3. `GET /api/wallet/deposit/verify/:txRef`
Polled by frontend redirect page after customer returns from Chapa.
- **Constraint**: Purely read-only; queries database status and never directly credits the wallet.
- **Response**:
```json
{
  "success": true,
  "tx_ref": "DEP-AA-1740000000-ABC",
  "status": "success",
  "amount": 500.00,
  "currency": "ETB",
  "verifiedAt": "2026-10-26T18:00:00.000Z",
  "walletBalanceEtb": 1500.00
}
```

### 4. `GET /api/wallet/banks`
Returns the list of supported Ethiopian banks from Chapa (cached with in-memory TTL and database sync).
- **Response**:
```json
{
  "success": true,
  "count": 10,
  "banks": [
    { "id": "cbe", "code": "855", "name": "Commercial Bank of Ethiopia (CBE)", "acronym": "CBE" },
    { "id": "telebirr", "code": "telebirr", "name": "Telebirr", "acronym": "Telebirr" },
    { "id": "awash", "code": "856", "name": "Awash Bank", "acronym": "AWASH" }
  ]
}
```

### 5. `POST /api/wallet/withdraw`
Allows sales agents to withdraw eligible commissions into their verified Ethiopian bank account.
- **Headers**: `Authorization: Bearer <salesperson_token>`
- **Body**:
```json
{
  "amount": 250,
  "bank_code": "855",
  "account_number": "100012345678",
  "account_name": "Abebe Bikila"
}
```
- **Response**:
```json
{
  "success": true,
  "reference": "POW-AA-1740000000-XYZ",
  "status": "pending",
  "amount": 250,
  "bankName": "Commercial Bank of Ethiopia (CBE)",
  "accountNumber": "100012345678",
  "message": "Withdrawal requested successfully. Funds will arrive after bank clearance."
}
```

### 6. `POST /api/webhooks/chapa`
Secure webhook listener receiving raw event bodies from Chapa.
- Validates the `x-chapa-signature` header using HMAC-SHA256 with constant-time equality.
- Idempotently verifies and credits deposits or confirms/refunds transfers.

---

## 5. Running Automated Tests

Run the automated test suite testing all 5 critical edge cases:
```bash
npm run test:wallet
```

Tests included:
1. **Webhook signature rejection**: Tampered body, invalid key, or missing header is rejected with HTTP 401.
2. **Duplicate webhook**: Resubmitting identical `tx_ref` does not double-credit wallet balance.
3. **Insufficient balance**: Order placement and withdrawals exceeding available balance throw `InsufficientBalanceError`.
4. **Concurrent order locking**: Two simultaneous orders competing for remaining collateral use `SELECT ... FOR UPDATE` so exactly one succeeds and one fails.
5. **Failed payout refund**: When Chapa reports a failed transfer, held payout funds are safely restored to the agent's available balance.

---

## 6. Daily Reconciliation Script

Run the financial ledger reconciliation script to verify internal double-entry integrity and compare against Chapa's reported balance:

```bash
npm run reconcile
```
