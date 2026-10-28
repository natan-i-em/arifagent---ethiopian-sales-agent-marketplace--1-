'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Product } from '../../types';
import { 
  X, 
  CheckCircle, 
  AlertCircle, 
  Phone, 
  MapPin, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Copy, 
  ExternalLink,
  Coins
} from 'lucide-react';
import { ProductImage } from '../common/ProductImage';

interface CreateOrderModalProps {
  initialProductId?: string;
  onClose: () => void;
}

const ADDIS_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Addis Ketema',
  'Kolfe Keranio',
  'Gulele',
  'Nifas Silk-Lafto',
  'Akaky Kaliti',
];

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({ initialProductId, onClose }) => {
  const { 
    products, 
    businesses, 
    selectedSalespersonId, 
    salesPartners, 
    createOrder,
    sendNotification,
    setActiveRole,
    setSelectedCustomerToken
  } = useApp();

  const salesperson = salesPartners.find((s) => s.id === selectedSalespersonId) || salesPartners[0];

  const activeProducts = products.filter(
    (p) => (p.status === 'active' || p.status === undefined) && (p as any).isActive !== false
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(
    initialProductId || (activeProducts[0] ? activeProducts[0].id : products[0]?.id || '')
  );
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [buyerName, setBuyerName] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('+251 9');
  const [deliverySubcity, setDeliverySubcity] = useState<string>('Bole');
  const [specificAddress, setSpecificAddress] = useState<string>('');
  const [preferredDate, setPreferredDate] = useState<string>(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<string>('2:00 PM - 5:00 PM');
  const [specialInstructions, setSpecialInstructions] = useState<string>('');
  const [paymentAccountId, setPaymentAccountId] = useState<string>('');
  const [consentObtained, setConsentObtained] = useState<boolean>(true);
  const [consentMethod, setConsentMethod] = useState<'phone_call' | 'telegram_chat' | 'in_person_verbal'>('phone_call');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrderResult, setCreatedOrderResult] = useState<{
    orderNumber: string;
    token: string;
    totalAmount: number;
    commissionAmount: number;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  const product = products.find((p) => p.id === selectedProductId) || products[0];
  const supplier = businesses.find((b) => b.id === product?.supplierId) || businesses[0];
  const variant = selectedVariantId ? product?.variants.find((v) => v.id === selectedVariantId) : undefined;

  // Auto-select primary payment account when product/supplier changes
  React.useEffect(() => {
    if (supplier && supplier.paymentAccounts.length > 0) {
      const primary = supplier.paymentAccounts.find((a) => a.isPrimary) || supplier.paymentAccounts[0];
      setPaymentAccountId(primary.id);
    }
  }, [supplier]);

  if (!product) return null;

  // Calculations
  const unitPrice = product.unitPrice + (variant?.additionalPrice || 0);
  const subtotal = unitPrice * quantity;
  const deliveryFee = product.standardDeliveryFee;
  const totalDue = subtotal + deliveryFee;

  let estimatedCommission = 0;
  if (product.commissionTerms.type === 'fixed_per_unit') {
    estimatedCommission = product.commissionTerms.rateOrAmount * quantity;
  } else {
    estimatedCommission = Math.round((subtotal * product.commissionTerms.rateOrAmount) / 100);
  }

  const handlePhoneChange = (val: string) => {
    setBuyerPhone(val);
  };

  const validatePhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, '');
    return /^(?:\+251|0)[79]\d{8}$/.test(cleaned);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!buyerName.trim()) {
      setErrorMsg('Please enter customer full name.');
      return;
    }

    if (!validatePhone(buyerPhone)) {
      setErrorMsg('Please enter a valid Ethiopian phone number (e.g. +251 911 234567 or 0911234567).');
      return;
    }

    if (!specificAddress.trim()) {
      setErrorMsg('Please provide a specific delivery landmark or house address in Addis Ababa.');
      return;
    }

    if (!consentObtained) {
      setErrorMsg('Buyer consent is required before placing an order on their behalf.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createOrder({
        productId: product.id,
        variantId: selectedVariantId || undefined,
        quantity,
        buyerName,
        buyerPhone,
        deliverySubcity,
        specificAddress,
        preferredDate,
        preferredTimeSlot,
        specialInstructions,
        paymentAccountId: paymentAccountId || supplier.paymentAccounts[0]?.id || '',
        consentMethod,
      });

      if (result.success && result.order) {
        setCreatedOrderResult({
          orderNumber: result.order.orderNumber,
          token: result.order.publicAccessToken,
          totalAmount: result.order.totalAmount,
          commissionAmount: result.order.agreedCommissionAmount,
        });

        // Instant notification to supplier
        sendNotification({
          recipientRole: 'supplier',
          recipientId: product.supplierId,
          type: 'order',
          title: `New Order ${result.order.orderNumber}`,
          message: `Agent ${salesperson?.fullName || 'Sales Agent'} created an order for ${buyerName} (${product.name}, ETB ${result.order.totalAmount.toLocaleString()}).`,
          severity: 'info',
          link: '/portal/supplier?tab=orders',
          metadata: { orderNumber: result.order.orderNumber, amount: result.order.totalAmount }
        });

        // Instant notification to salesperson
        sendNotification({
          recipientRole: 'salesperson',
          recipientId: salesperson?.id,
          type: 'order',
          title: `Order Generated: ${result.order.orderNumber}`,
          message: `Attributed order placed for ${buyerName}. Commission of ETB ${result.order.agreedCommissionAmount.toLocaleString()} will lock in escrow upon payment.`,
          severity: 'success',
          link: '/portal/salesperson?tab=orders',
          metadata: { orderNumber: result.order.orderNumber, amount: result.order.agreedCommissionAmount }
        });
      } else {
        setErrorMsg(result.error || 'Failed to create order.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCustomerLink = () => {
    if (!createdOrderResult) return;
    const url = `${window.location.origin}/order/${createdOrderResult.orderNumber}?token=${createdOrderResult.token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenBuyerPage = () => {
    if (!createdOrderResult) return;
    setSelectedCustomerToken(createdOrderResult.token);
    setActiveRole('customer');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/30 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-modal w-full max-w-2xl rounded-3xl shadow-2xl border border-white/90 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/60 backdrop-blur-md">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create Order on Behalf of Buyer
            </h2>
            <p className="text-xs text-slate-500">
              Agent: <span className="font-semibold text-slate-700">{salesperson.fullName}</span> · Addis Ababa Fast Dispatch
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {createdOrderResult ? (
          /* Order Created Success View */
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-slate-200">
              <CheckCircle className="w-6 h-6 text-slate-900" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">
              Order Created Successfully!
            </h3>
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-lg font-mono text-xs font-semibold text-slate-800 mb-3 border border-slate-200/70">
              {createdOrderResult.orderNumber}
            </div>
            <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
              An SMS with payment instructions has been dispatched to{' '}
              <strong className="text-slate-900">{buyerPhone}</strong>. The 15-minute payment countdown has started.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto mb-5 text-left p-3.5 glass-card rounded-2xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Total Customer Due:</span>
                <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                  ETB {createdOrderResult.totalAmount.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Your Commission (Estimated):</span>
                <span className="font-mono-numbers font-bold text-slate-900 text-sm">
                  ETB {createdOrderResult.commissionAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
              <button
                onClick={copyCustomerLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedLink ? 'Link Copied to Clipboard!' : 'Copy Customer SMS Payment Link'}</span>
              </button>

              <button
                onClick={handleOpenBuyerPage}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Buyer Order & Receipt View</span>
              </button>

              <button
                onClick={onClose}
                className="w-full text-xs text-slate-500 hover:text-slate-700 py-1"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Order Form */
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Step 1: Product & Quantity */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
                1. Select Product & Quantity
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Product</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => {
                      setSelectedProductId(e.target.value);
                      setSelectedVariantId('');
                    }}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  >
                    {activeProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} — ETB {p.unitPrice.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {product.variants.length > 0 && (
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">Variant / Color / Size</label>
                    <select
                      value={selectedVariantId}
                      onChange={(e) => setSelectedVariantId(e.target.value)}
                      className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                    >
                      <option value="">Default ({product.variants[0]?.name})</option>
                      {product.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.additionalPrice > 0 ? `(+ETB ${v.additionalPrice})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div className="w-32">
                  <label className="block text-[11px] text-slate-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={product.stock}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>
                <div className="text-xs text-slate-500 pt-5">
                  Available in Stock: <span className="font-semibold text-slate-800">{product.stock} units</span>
                </div>
              </div>

              {/* Visual Selected Product Preview Card */}
              {product && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/90 flex items-center gap-3.5">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white shadow-2xs">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.name}
                      category={product.category}
                      aspectRatio="square"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 truncate">{product.name}</span>
                      <span className="text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded uppercase font-semibold">
                        {product.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Supplier: <strong className="text-slate-700">{supplier?.name || product.supplierName}</strong>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[11px]">
                      <span className="font-mono text-slate-900 font-bold">ETB {unitPrice.toLocaleString()}/unit</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono">
                        <Coins className="w-3 h-3" />
                        Est. Commission: ETB {estimatedCommission.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Customer Details */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
                2. Customer Information (Phone & Telegram)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alemayehu Kebede"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">
                    Ethiopian Phone Number * (SMS Recipient)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+251 911 234567 or 0911..."
                    value={buyerPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Delivery Information */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
                3. Addis Ababa Delivery Destination
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Subcity *</label>
                  <select
                    value={deliverySubcity}
                    onChange={(e) => setDeliverySubcity(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  >
                    {ADDIS_SUBCITIES.map((sc) => (
                      <option key={sc} value={sc}>
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Preferred Time Window *</label>
                  <select
                    value={preferredTimeSlot}
                    onChange={(e) => setPreferredTimeSlot(e.target.value)}
                    className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="9:00 AM - 12:00 PM">Morning (9:00 AM - 12:00 PM)</option>
                    <option value="2:00 PM - 5:00 PM">Afternoon (2:00 PM - 5:00 PM)</option>
                    <option value="5:00 PM - 7:30 PM">Evening (5:00 PM - 7:30 PM)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Specific Street / Landmark / Gate / House No. *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Edna Mall, behind Cameroon St, House #314"
                  value={specificAddress}
                  onChange={(e) => setSpecificAddress(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Special Instructions for Courier (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Call 10 mins before arrival, ring gate bell"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            {/* Step 4: Payment Recipient Destination */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wide">
                4. Supplier Payment Destination (Sent in SMS)
              </label>

              <div>
                <select
                  value={paymentAccountId}
                  onChange={(e) => setPaymentAccountId(e.target.value)}
                  className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-600"
                >
                  {supplier.paymentAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.provider}: {acc.accountNumber} ({acc.accountHolderName})
                    </option>
                  ))}
                </select>
                <span className="block text-[11px] text-slate-500 mt-1">
                  The customer will be instructed to pay this verified merchant account and submit receipt proof.
                </span>
              </div>
            </div>

            {/* Step 5: Mandatory Buyer Consent */}
            <div className="p-3.5 glass-card-subtle rounded-2xl border border-slate-200/80 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentObtained}
                  onChange={(e) => setConsentObtained(e.target.checked)}
                  className="mt-0.5 rounded-sm text-slate-900 focus:ring-slate-900"
                />
                <div className="text-xs text-slate-800">
                  <span className="font-semibold">Buyer Consent Confirmed:</span> I confirm that I obtained the buyer's explicit consent before creating this order and providing their delivery information.
                </div>
              </label>

              <div className="flex items-center gap-4 text-xs text-slate-600 pl-6">
                <span className="text-[11px] text-slate-500">Consent Channel:</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="consentMethod"
                    value="phone_call"
                    checked={consentMethod === 'phone_call'}
                    onChange={() => setConsentMethod('phone_call')}
                  />
                  <span>Phone Call</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="consentMethod"
                    value="telegram_chat"
                    checked={consentMethod === 'telegram_chat'}
                    onChange={() => setConsentMethod('telegram_chat')}
                  />
                  <span>Telegram Chat</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="consentMethod"
                    value="in_person_verbal"
                    checked={consentMethod === 'in_person_verbal'}
                    onChange={() => setConsentMethod('in_person_verbal')}
                  />
                  <span>In-Person Verbal</span>
                </label>
              </div>
            </div>

            {/* Financial Summary & Estimated Commission */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal ({quantity}x item):</span>
                <span className="font-mono text-slate-200">ETB {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Standard Delivery Fee ({deliverySubcity}):</span>
                <span className="font-mono text-slate-200">ETB {deliveryFee.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold">
                <span>Total Amount Due from Buyer:</span>
                <span className="font-mono text-white">ETB {totalDue.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800/60 pt-2 flex justify-between text-xs">
                <span className="text-slate-300 font-medium">Your Agent Commission (Estimated):</span>
                <span className="font-mono font-bold text-slate-100">
                  ETB {estimatedCommission.toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                * Note: Commission transitions from estimated to eligible upon customer payment verification and verified physical delivery.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors flex items-center gap-2 shadow-xs"
              >
                {isSubmitting ? 'Submitting Order...' : 'Create Order & Dispatch SMS'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
