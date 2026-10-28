'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { ProductImage } from '../common/ProductImage';
import { ProductDetailsModal } from '../common/ProductDetailsModal';
import { Product } from '../../types';
import { 
  ArrowRight, 
  ShieldCheck, 
  Smartphone, 
  Building2, 
  UserCheck,
  ChevronRight,
  Coins,
  CheckCircle2, 
  Layers,
  Lock,
  UserPlus,
  Eye
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const { 
    currentUser,
    currentView,
    setCurrentView,
    setAuthRolePreference,
    setActiveRole, 
    products, 
    setShowWaitlistModal, 
    setWaitlistRolePreference,
    businesses,
    salesPartners,
    orders
  } = useApp();

  // Calculator state
  const [calcUnits, setCalcUnits] = useState<number>(20);
  const [calcProductIndex, setCalcProductIndex] = useState<number>(0);
  const [selectedProductForModal, setSelectedProductForModal] = useState<Product | null>(null);

  const calcProduct = products[calcProductIndex] || products[0];
  const unitPrice = calcProduct ? calcProduct.unitPrice : 3850;
  
  let unitCommission = 0;
  if (calcProduct) {
    if (calcProduct.commissionTerms.type === 'fixed_per_unit') {
      unitCommission = calcProduct.commissionTerms.rateOrAmount;
    } else {
      unitCommission = Math.round((unitPrice * calcProduct.commissionTerms.rateOrAmount) / 100);
    }
  }
  const totalCommissionEarned = unitCommission * calcUnits;
  const totalGrossSales = unitPrice * calcUnits;

  const handleOpenOnboarding = (role: 'sales_agent' | 'supplier') => {
    setWaitlistRolePreference(role);
    setShowWaitlistModal(true);
  };

  const totalGMV = orders.reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="space-y-16 pb-24 text-slate-900 bg-light-pattern">
      {/* Light Glassmorphism Hero Section */}
      <section className="pt-16 pb-20 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            {/* Live Platform Badge - Light Specular Glass, Zero Gradient */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 glass-card rounded-full text-xs font-semibold text-slate-800 shadow-2xs border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Azwari Production Network — Live in Addis Ababa</span>
              <span className="text-slate-400">·</span>
              <span className="font-mono-numbers text-slate-600">{businesses.length} Verified Suppliers</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
              Multi-Party Commerce & Financial Escrow for Ethiopia
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto text-balance font-normal">
              Azwari connects licensed merchants, independent sales agents, and direct buyers across Addis Ababa with tokenized SMS checkout, Telebirr & CBE payment verification, and automated commission escrow.
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              {currentUser ? (
                <Link
                  href={`/portal/${currentUser.role}`}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    Open My {currentUser.role === 'salesperson' ? 'Agent Workspace' : currentUser.role === 'supplier' ? 'Supplier Console' : 'Admin Clearinghouse'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setAuthRolePreference('salesperson')}
                    className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <UserCheck className="w-4 h-4 text-slate-300" />
                    <span>Join as Sales Agent</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setAuthRolePreference('supplier')}
                    className="px-6 py-3.5 rounded-xl glass-card hover:bg-white text-slate-900 font-semibold text-xs border border-slate-300/80 shadow-2xs transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span>Register as Merchant</span>
                  </Link>

                  <Link
                    href="/signin"
                    className="px-5 py-3.5 rounded-xl glass-card hover:bg-white text-slate-900 font-bold text-xs border border-slate-300 shadow-2xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4 text-slate-700" />
                    <span>Sign In</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 4 Production Roles - Interactive Portals Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Architected Portals
            </span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">
              Select Your Operational Workspace
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-sm sm:text-right">
            Every persona has dedicated tooling for product discovery, checkout links, fulfillment verification, and audited settlements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1: Sales Agent Hub */}
          <div 
            onClick={() => setActiveRole('salesperson')}
            className="glass-card-hover p-6 rounded-3xl cursor-pointer flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <UserCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors flex items-center justify-between">
                <span>Independent Sales Agent</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Discover vetted wholesale offers, generate unique SMS checkout tokens, and withdraw guaranteed commissions directly to Telebirr or CBE.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Active Agents: {salesPartners.length}</span>
              <span className="font-semibold text-slate-900">Enter Portal →</span>
            </div>
          </div>

          {/* 2: Supplier Console */}
          <div 
            onClick={() => setActiveRole('supplier')}
            className="glass-card-hover p-6 rounded-3xl cursor-pointer flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors flex items-center justify-between">
                <span>Merchant / Supplier HQ</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Publish inventory variants, inspect uploaded CBE and Telebirr payment screenshots, 1-click verify receipts, and assign delivery drivers.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Verified Merchants: {businesses.length}</span>
              <span className="font-semibold text-slate-900">Open Console →</span>
            </div>
          </div>

          {/* 3: Customer Checkout (Token-Only) */}
          <div className="glass-card p-6 rounded-3xl flex flex-col justify-between group space-y-4 border border-slate-200/80 bg-white/70">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                <span>Buyer SMS Checkout</span>
                <span className="text-[10px] font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                  Private Token
                </span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Zero app downloads or accounts. Buyers receive a direct tokenized link via SMS (*15-minute lock*), view verified CBE & Telebirr accounts, and upload slips.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Token Protected</span>
              <span className="font-semibold text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Dispatched via SMS</span>
              </span>
            </div>
          </div>

          {/* 4: Admin Compliance Desk */}
          <div 
            onClick={() => setActiveRole('admin')}
            className="glass-card-hover p-6 rounded-3xl cursor-pointer flex flex-col justify-between group space-y-4"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-slate-700 transition-colors flex items-center justify-between">
                <span>Compliance & Audit Desk</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Audit merchant TINs & business licenses, oversee commission clearing balances, arbitrate order disputes, and inspect the immutable audit stream.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Full Audit Trail</span>
              <span className="font-semibold text-slate-900">Admin Desk →</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4-Column Operational Metric Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 glass-card rounded-3xl">
          <div className="p-3">
            <span className="text-xs text-slate-500 block mb-1">Attributed Sales GMV</span>
            <div className="font-mono-numbers font-extrabold text-2xl text-slate-900">
              ETB {totalGMV.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block">Across Addis subcities</span>
          </div>
          <div className="p-3 border-l-0 md:border-l border-slate-200/80">
            <span className="text-xs text-slate-500 block mb-1">Escrow Reliability</span>
            <div className="font-mono-numbers font-extrabold text-2xl text-slate-900">100% ACID</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Prisma + Supabase Postgres</span>
          </div>
          <div className="p-3 border-l-0 md:border-l border-slate-200/80">
            <span className="text-xs text-slate-500 block mb-1">Payment Verification</span>
            <div className="font-mono-numbers font-extrabold text-2xl text-slate-900">&lt; 15 Mins</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Telebirr & CBE confirmation</span>
          </div>
          <div className="p-3 border-l-0 md:border-l border-slate-200/80">
            <span className="text-xs text-slate-500 block mb-1">Fulfillment Coverage</span>
            <div className="font-mono-numbers font-extrabold text-2xl text-slate-900">10 Subcities</div>
            <span className="text-[11px] text-slate-500 mt-1 block">Bole, Kirkos, Yeka, Arada, etc.</span>
          </div>
        </div>
      </section>

      {/* Interactive Commission & Earnings Calculator */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 md:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-white/90">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Coins className="w-3.5 h-3.5 text-slate-600" />
              <span>Commission & Settlement Calculator</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Calculate Agent Earnings & Merchant Margins
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Every commission term on Azwari is locked at order inception. See how much sales partners earn and what merchants retain across real verified catalog products.
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Catalog Product:
                </label>
                <select
                  value={calcProductIndex}
                  onChange={(e) => setCalcProductIndex(parseInt(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white/90 text-slate-900 px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                >
                  {products.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      {p.name} — ETB {p.unitPrice.toLocaleString()} ({p.supplierName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 mb-1.5">
                  <span>Projected Units Sold (per month):</span>
                  <span className="font-mono-numbers font-bold text-slate-900">{calcUnits} units</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="100"
                  step="1"
                  value={calcUnits}
                  onChange={(e) => setCalcUnits(parseInt(e.target.value))}
                  className="w-full accent-slate-900 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>2 units</span>
                  <span>50 units</span>
                  <span>100 units</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-card-subtle rounded-2xl p-6 border border-slate-200/90 space-y-4 shadow-2xs">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
              Monthly Settlement Breakdown
            </span>

            <div className="p-4 bg-white/90 border border-slate-200/90 rounded-2xl space-y-1 shadow-2xs">
              <span className="text-xs text-slate-600 block font-medium">Agent Net Commission:</span>
              <div className="font-mono-numbers font-extrabold text-3xl text-slate-900">
                ETB {totalCommissionEarned.toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-500 block pt-1">
                Avg ETB {unitCommission.toLocaleString()} earned per unit
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>Gross Customer Order Volume:</span>
                <span className="font-mono-numbers text-slate-900 font-semibold">ETB {totalGrossSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Supplier Net Proceeds:</span>
                <span className="font-mono-numbers text-slate-900 font-semibold">
                  ETB {(totalGrossSales - totalCommissionEarned).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Payout Channels:</span>
                <span>Telebirr B2C · CBE Direct Transfer</span>
              </div>
            </div>

            <button
              onClick={() => setActiveRole('salesperson')}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
            >
              Start Selling This Offer in Agent Hub
            </button>
          </div>
        </div>
      </section>

      {/* Featured Offers Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Live Verified Wholesale Catalog
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Active inventory from licensed Addis Ababa merchants ready for immediate customer dispatch.
            </p>
          </div>
          <button
            onClick={() => setActiveRole('salesperson')}
            className="text-xs font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1"
          >
            <span>View All in Agent Catalog</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.slice(0, 3).map((prod) => (
            <div
              key={prod.id}
              className="glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between group"
            >
              {/* Product Visual Photo */}
              <div className="relative">
                <ProductImage
                  src={prod.imageUrl}
                  alt={prod.name}
                  category={prod.category}
                  aspectRatio="wide"
                  className="w-full h-48 cursor-pointer"
                  showCategoryBadge={true}
                  zoomOnHover={true}
                />
                <button
                  onClick={() => setSelectedProductForModal(prod)}
                  className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-900 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-slate-700" />
                  <span>Inspect Visuals</span>
                </button>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {prod.category}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    {prod.badgeLabel || 'Verified'}
                  </span>
                </div>

                <h3 
                  onClick={() => setSelectedProductForModal(prod)}
                  className="text-base font-bold text-slate-900 cursor-pointer hover:text-slate-700 transition-colors"
                >
                  {prod.name}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {prod.description}
                </p>

                <div className="p-3.5 bg-slate-50/80 rounded-2xl space-y-1.5 text-xs border border-slate-200/80">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Retail Price:</span>
                    <span className="font-mono-numbers font-bold text-slate-900">
                      ETB {prod.unitPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-900 font-semibold">
                    <span>Agent Commission:</span>
                    <span className="font-mono-numbers font-bold text-emerald-800">
                      {prod.commissionTerms.type === 'fixed_per_unit'
                        ? `ETB ${prod.commissionTerms.rateOrAmount.toLocaleString()}/unit`
                        : `${prod.commissionTerms.rateOrAmount}% of order`}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-200 pt-1">
                    <span>Delivery Locations:</span>
                    <span>{prod.deliveryAreas.slice(0, 3).join(', ')}</span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50/60 border-t border-slate-200/80 flex items-center gap-2">
                <button
                  onClick={() => setSelectedProductForModal(prod)}
                  className="w-1/3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveRole('salesperson')}
                  className="w-2/3 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                >
                  Sell as Agent
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust & Settlement Architecture */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 border border-white/90 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              Why Azwari Eliminates Commercial Counterparty Risk
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Purpose-built for Ethiopian informal commerce and multi-tier banking:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <span>Audited Commission Snapshots</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                When an order is created, the commission terms are irrevocably locked into database transactions. A supplier cannot alter agreed percentages or prices after an agent initiates checkout.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-800" />
                <span>Zero Buyer Account Friction</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Customers in Addis Ababa never need to register an account or install mobile apps. They receive an SMS with verified Telebirr & CBE transfer details and an instant receipt upload window.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-800" />
                <span>Pre-Funded Reserves & Arbitration</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Merchants maintain verified commission reserve balances. If fulfillment is contested or delivery delayed, administrative dispute arbitration protects the buyer and the sales agent.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Details & Visual Inspection Modal */}
      {selectedProductForModal && (
        <ProductDetailsModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
          onSellProduct={() => {
            setActiveRole('salesperson');
            setSelectedProductForModal(null);
          }}
          userRole={currentUser?.role || 'public'}
        />
      )}
    </div>
  );
};
