import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// Phone validator for Ethiopian numbers (+251 9... / 09...)
const ethiopianPhoneRegex = /^(\+251\s?9\d{8}|09\d{8}|2519\d{8})$/;

export const CreateOrderSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  variantId: z.string().optional(),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  paymentAccountId: z.string().optional(),
  buyerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  buyerPhone: z.string().min(9, 'Valid phone number is required'),
  deliverySubcity: z.string().min(1, 'Delivery subcity is required'),
  specificAddress: z.string().min(2, 'Specific address or landmark is required'),
  preferredDate: z.string().optional(),
  preferredTimeSlot: z.string().optional(),
  specialInstructions: z.string().optional(),
  consentMethod: z.enum(['phone_call', 'telegram_chat', 'in_person_verbal']).default('phone_call'),
});

export const PaymentEvidenceSchema = z.object({
  provider: z.string().min(2, 'Payment provider name is required'),
  transactionReference: z.string().min(3, 'Transaction reference/receipt ID is required'),
  amountShown: z.number().positive('Payment amount must be greater than 0'),
  receiptNote: z.string().optional(),
  receiptImageUrl: z.string().optional(),
  receiptMockImage: z.string().optional(),
  token: z.string().optional(),
  trackingToken: z.string().optional(),
  publicAccessToken: z.string().optional(),
});

export const VerifyPaymentSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().optional(),
});

export const ScheduleDeliverySchema = z.object({
  assignedDriverName: z.string().min(2, 'Driver name is required'),
  assignedDriverPhone: z.string().min(9, 'Driver contact number is required'),
  scheduledDate: z.string().min(1, 'Scheduled delivery date is required'),
  scheduledTimeSlot: z.string().min(1, 'Delivery time slot is required'),
  notes: z.string().optional(),
});

export const DispatchOrderSchema = z.object({
  assignedDriverName: z.string().optional(),
  assignedDriverPhone: z.string().optional(),
  notes: z.string().optional(),
});

export const DeliverOrderSchema = z.object({
  proofNotes: z.string().optional(),
  token: z.string().optional(),
  trackingToken: z.string().optional(),
  publicAccessToken: z.string().optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().optional().default('Cancelled by user'),
});

export const ExtendPaymentSchema = z.object({
  additionalMinutes: z.number().int().positive().max(120).default(15),
  token: z.string().optional(),
  trackingToken: z.string().optional(),
  publicAccessToken: z.string().optional(),
});

export const SettleCommissionsSchema = z.object({
  salespersonId: z.string().min(1, 'Salesperson ID is required'),
  payoutMethod: z.string().min(2, 'Payout method is required'),
  transactionReference: z.string().min(3, 'Payout transaction reference is required'),
  entryIds: z.array(z.string()).optional(),
});

export const CreateProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  sku: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional().default(''),
  unitPrice: z.number().positive('Unit price must be positive'),
  suggestedRetailPrice: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),
  stock: z.number().int().nonnegative().default(0),
  minimumOrderQty: z.number().int().positive().default(1),
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string(),
    sku: z.string().optional(),
    additionalPrice: z.number().default(0),
    stock: z.number().int().nonnegative().default(0),
  })).optional(),
  deliveryAreas: z.array(z.string()).optional(),
  standardDeliveryFee: z.number().nonnegative().default(120),
  estimatedFulfillmentHours: z.number().int().positive().default(24),
  fulfillmentType: z.enum(['physical', 'service']).default('physical'),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  commissionTerms: z.object({
    type: z.enum(['fixed_per_unit', 'percentage']).default('percentage'),
    rateOrAmount: z.number().positive('Commission rate or amount must be positive'),
  }).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  isActive: z.boolean().optional(),
  status: z.enum(['active', 'draft', 'out_of_stock']).optional(),
});

export const CreateDisputeSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  category: z.string().min(2, 'Category is required'),
  reason: z.string().min(5, 'Detailed reason is required'),
  raisedByRole: z.string().optional(),
  raisedByName: z.string().optional(),
  token: z.string().optional(),
  trackingToken: z.string().optional(),
  publicAccessToken: z.string().optional(),
});

export const ResolveDisputeSchema = z.object({
  resolutionDecision: z.enum(['refund_customer', 'release_to_supplier', 'dismissed', 'custom_settlement']),
  resolutionNote: z.string().min(3, 'Resolution justification is required'),
});

export const JoinWaitlistSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(9, 'Phone number is required'),
  role: z.enum(['sales_agent', 'supplier']),
  subcity: z.string().min(1, 'Subcity is required'),
  telegramUsername: z.string().optional(),
  categoryOrChannel: z.string().min(1, 'Category or sales channel is required'),
  estimatedScale: z.string().min(1, 'Estimated scale is required'),
  referralCodeUsed: z.string().optional(),
});

export const DepositSchema = z.object({
  amount: z.number().positive('Deposit amount must be greater than 0').min(10, 'Minimum deposit amount is 10 ETB'),
});

export const WithdrawSchema = z.object({
  amount: z.number().positive('Withdrawal amount must be greater than 0'),
  bank_code: z.string().min(1, 'Bank code is required'),
  account_number: z.string().min(4, 'Valid account number is required'),
  account_name: z.string().min(2, 'Account holder name is required'),
});

/**
 * Middleware factory for Zod validation on request body
 */
export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const formattedErrors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}
