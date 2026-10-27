'use client';

import React, { useState } from 'react';
import { Product } from '../../types';
import { ProductImage } from './ProductImage';
import { 
  X, 
  ShieldCheck, 
  Truck, 
  Clock, 
  Coins, 
  Copy, 
  Check, 
  ExternalLink, 
  ShoppingBag, 
  Package, 
  MapPin,
  Sparkles,
  ChevronRight
} from 'lucide-react';

interface ProductDetailsModalProps {
  product: Product;
  onClose: () => void;
  onSellProduct?: (product: Product) => void;
  userRole?: string;
}

export const ProductDetailsModal: React.FC<ProductDetailsModalProps> = ({
  product,
  onClose,
  onSellProduct,
  userRole = 'salesperson'
}) => {
  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.imageUrl || ''];
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const activeImage = allImages[activeImageIndex] || product.imageUrl;

  const unitCommission = product.commissionTerms?.type === 'fixed_per_unit'
    ? product.commissionTerms.rateOrAmount
    : Math.round((product.unitPrice * (product.commissionTerms?.rateOrAmount || 10)) / 100);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?product=${product.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="glass-modal w-full max-w-3xl rounded-3xl shadow-2xl border border-white/90 overflow-hidden flex flex-col max-h-[92vh] bg-white/95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/80">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {product.category}
            </span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-xs text-slate-500">{product.sku}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close details"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Visual Gallery Left Column */}
            <div className="space-y-3">
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm relative group bg-slate-100">
                <ProductImage
                  src={activeImage}
                  alt={product.name}
                  category={product.category}
                  aspectRatio="square"
                  zoomOnHover={true}
                  className="w-full h-80 object-cover"
                />
                <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                  {activeImageIndex + 1} / {allImages.length || 1}
                </div>
              </div>

              {/* Thumbnails if multiple images */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx
                          ? 'border-slate-900 ring-2 ring-slate-900/20'
                          : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Economics & Information Right Column */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-slate-500">Merchant Supplier:</span>
                  <strong className="text-xs text-slate-800">{product.supplierName}</strong>
                  <span className="text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold">
                    Verified
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 leading-snug">
                  {product.name}
                </h2>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {product.description || 'Verified authentic Ethiopian product.'}
                </p>
              </div>

              {/* Financial Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-slate-500 font-medium">Customer Retail Price:</span>
                  <div className="font-mono-numbers font-extrabold text-2xl text-slate-900">
                    ETB {product.unitPrice.toLocaleString()}
                  </div>
                </div>

                {product.suggestedRetailPrice && (
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Suggested Shelf Price:</span>
                    <span className="font-mono-numbers line-through">
                      ETB {product.suggestedRetailPrice.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Sales Agent Commission Highlight */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-slate-900">Agent Commission:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono-numbers font-bold text-base text-emerald-700">
                      ETB {unitCommission.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {product.commissionTerms?.type === 'fixed_per_unit'
                        ? 'Fixed per unit'
                        : `${product.commissionTerms?.rateOrAmount || 10}% rate`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Logistics & Stock Info */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Package className="w-3.5 h-3.5" /> Stock Available
                  </div>
                  <div className="font-bold text-slate-800 font-mono">
                    {product.stock} units
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <div className="text-[11px] text-slate-400 flex items-center gap-1 mb-0.5">
                    <Clock className="w-3.5 h-3.5" /> Dispatch SLA
                  </div>
                  <div className="font-bold text-slate-800">
                    {product.estimatedFulfillmentHours || 24} hours
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-1 p-3 bg-slate-50/70 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-1">
                  <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Standard Addis Delivery: <strong>ETB {product.standardDeliveryFee}</strong></span>
                </div>
                <div className="flex items-start gap-1 text-[11px] text-slate-500 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Available Subcities: {(product.deliveryAreas || []).slice(0, 5).join(', ')}...</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/90 flex items-center justify-between gap-3">
          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 transition-colors"
            >
              Close
            </button>

            {onSellProduct && (
              <button
                onClick={() => {
                  onSellProduct(product);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Sell to Buyer as Agent</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
