'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { useLanguage } from '../../context/LanguageContext';
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
  Lock,
  Eye,
  HelpCircle,
  ChevronDown
} from 'lucide-react';

export const LandingView: React.FC = () => {
  const {
    currentUser,
    setAuthRolePreference,
    setActiveRole,
    products
  } = useApp();
  const { t, language } = useLanguage();

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

  return (
    <div className="space-y-16 pb-24 text-slate-900 bg-light-pattern">
      {/* 1. HERO SECTION */}
      <section className="pt-16 pb-20 border-b border-slate-200/70">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-semibold text-slate-700 mx-auto shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Azwari · Addis Ababa, Ethiopia · azwari.com.et</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight text-balance">
              {t('hero.headlinePart1')}{t('hero.headlineHighlight')}{t('hero.headlinePart2')}
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto text-balance font-normal">
              {t('hero.subheadline')}
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              {currentUser ? (
                <Link
                  href={`/portal/${currentUser.role}`}
                  className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>
                    {currentUser.role === 'salesperson' 
                      ? t('hero.openAgent') 
                      : currentUser.role === 'supplier' 
                      ? t('hero.openMerchant') 
                      : t('hero.openPortal')}
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
                    <span>{t('hero.startSelling')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/signup"
                    onClick={() => setAuthRolePreference('supplier')}
                    className="px-6 py-3.5 rounded-xl glass-card hover:bg-white text-slate-900 font-semibold text-xs border border-slate-300/80 shadow-2xs transition-all flex items-center justify-center gap-2"
                  >
                    <Building2 className="w-4 h-4 text-slate-700" />
                    <span>{t('hero.listProduct')}</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. ROLE CARDS (2 Cards: Sales Agent & Merchant) */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Sales Agent */}
          <div
            onClick={() => {
              setAuthRolePreference('salesperson');
              if (currentUser) {
                setActiveRole('salesperson');
              } else {
                window.location.href = '/signup';
              }
            }}
            className="glass-card-hover p-8 rounded-3xl cursor-pointer flex flex-col justify-between group space-y-5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <UserCheck className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                {t('roles.agentTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('roles.agentDesc')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 group-hover:text-slate-700 flex items-center gap-1.5">
                <span>{t('roles.agentCta')}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>

          {/* Merchant */}
          <div
            onClick={() => {
              setAuthRolePreference('supplier');
              if (currentUser) {
                setActiveRole('supplier');
              } else {
                window.location.href = '/signup';
              }
            }}
            className="glass-card-hover p-8 rounded-3xl cursor-pointer flex flex-col justify-between group space-y-5"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-slate-700 transition-colors">
                {t('roles.merchantTitle')}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {t('roles.merchantDesc')}
              </p>
            </div>
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-900 group-hover:text-slate-700 flex items-center gap-1.5">
                <span>{t('roles.merchantCta')}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. STATS STRIP (4 Promises) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-6 glass-card rounded-3xl">
          <div className="p-3 flex flex-col justify-center">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 leading-snug">{t('promises.p1Title')}</h4>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('promises.p1Desc')}</span>
          </div>
          <div className="p-3 sm:border-l border-slate-200/80 flex flex-col justify-center">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center mb-2">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 leading-snug">{t('promises.p2Title')}</h4>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('promises.p2Desc')}</span>
          </div>
          <div className="p-3 md:border-l border-slate-200/80 flex flex-col justify-center">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center mb-2">
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 leading-snug">{t('promises.p3Title')}</h4>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('promises.p3Desc')}</span>
          </div>
          <div className="p-3 sm:border-l border-slate-200/80 flex flex-col justify-center">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center mb-2">
              <Lock className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 leading-snug">{t('promises.p4Title')}</h4>
            <span className="text-[11px] text-slate-500 mt-1 block">{t('promises.p4Desc')}</span>
          </div>
        </div>
      </section>

      {/* 4. WHY AZWARI SECTION */}
      <section id="why-trust" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 border border-white/90 space-y-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-slate-900">
              {t('trust.title')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-800 shrink-0" />
                <span>{t('trust.t1Title')}</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('trust.t1Desc')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-800 shrink-0" />
                <span>{t('trust.t2Title')}</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('trust.t2Desc')}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-slate-800 shrink-0" />
                <span>{t('trust.t3Title')}</span>
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t('trust.t3Desc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. COMMISSION CALCULATOR */}
      <section id="calculator" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-card rounded-3xl p-8 md:p-12 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border border-white/90">
          <div className="lg:col-span-7 space-y-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Coins className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('calculator.badge')}</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {t('calculator.title')}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {t('calculator.subtitle')}
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('calculator.chooseProduct')}
                </label>
                <select
                  value={calcProductIndex}
                  onChange={(e) => setCalcProductIndex(parseInt(e.target.value))}
                  className="w-full text-xs rounded-xl border border-slate-300 bg-white/90 text-slate-900 px-3.5 py-2.5 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                >
                  {products.map((p, idx) => (
                    <option key={p.id} value={idx}>
                      {(p.name || '').replace(/Luxuryios/gi, 'Luxury')} — ETB {p.unitPrice.toLocaleString()} ({p.supplierName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-700 mb-1.5">
                  <span>{t('calculator.unitsSlider')}</span>
                  <span className="font-mono-numbers font-bold text-slate-900">
                    {calcUnits} {t('calculator.unitsLabel')}
                  </span>
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
                  <span>2 {t('calculator.unitsLabel')}</span>
                  <span>50 {t('calculator.unitsLabel')}</span>
                  <span>100 {t('calculator.unitsLabel')}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-card-subtle rounded-2xl p-6 border border-slate-200/90 space-y-4 shadow-2xs">
            <div className="p-4 bg-white/90 border border-slate-200/90 rounded-2xl space-y-1 shadow-2xs">
              <span className="text-xs text-slate-600 block font-medium">{t('calculator.youEarn')}</span>
              <div className="font-mono-numbers font-extrabold text-3xl text-slate-900">
                ETB {totalCommissionEarned.toLocaleString()}
              </div>
            </div>

            <div className="space-y-2 text-xs text-slate-600 pt-2 border-t border-slate-200">
              <div className="flex justify-between">
                <span>{t('calculator.totalSales')}</span>
                <span className="font-mono-numbers text-slate-900 font-semibold">ETB {totalGrossSales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('calculator.merchantReceives')}</span>
                <span className="font-mono-numbers text-slate-900 font-semibold">
                  ETB {(totalGrossSales - totalCommissionEarned).toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                setAuthRolePreference('salesperson');
                if (currentUser) {
                  setActiveRole('salesperson');
                } else {
                  window.location.href = '/signup';
                }
              }}
              className="w-full py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
            >
              {t('calculator.cta')}
            </button>
          </div>
        </div>
      </section>

      {/* 6. CATALOG */}
      <section id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t('catalog.title')}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {t('catalog.subtitle')}
            </p>
          </div>
          <button
            onClick={() => setActiveRole('salesperson')}
            className="text-xs font-semibold text-slate-800 hover:text-slate-900 flex items-center gap-1"
          >
            <span>{t('catalog.seeAll')}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.slice(0, 3).map((prod) => {
            const displayName = (prod.name || '').replace(/Luxuryios/gi, 'Luxury');
            const displayDesc = (prod.description || '')
              .replace(/Luxuryios/gi, 'Luxury')
              .replace(/<!--COMM:\{.*?\}-->/g, '')
              .replace(/<!--IMG:\{.*?\}-->/g, '')
              .trim();

            return (
              <div
                key={prod.id}
                className="glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between group"
              >
                {/* Product Visual Photo */}
                <div className="relative">
                  <ProductImage
                    src={prod.imageUrl}
                    alt={displayName}
                    category={prod.category}
                    aspectRatio="wide"
                    className="w-full h-48 cursor-pointer"
                    showCategoryBadge={true}
                    zoomOnHover={true}
                  />
                  <button
                    onClick={() => setSelectedProductForModal({ ...prod, name: displayName, description: displayDesc })}
                    className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-slate-900 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md border border-slate-200/80 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-700" />
                    <span>{t('catalog.viewPhoto')}</span>
                  </button>
                </div>

                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      {prod.category}
                    </span>
                    <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                      {prod.badgeLabel || t('catalog.verified')}
                    </span>
                  </div>

                  <h3
                    onClick={() => setSelectedProductForModal({ ...prod, name: displayName, description: displayDesc })}
                    className="text-base font-bold text-slate-900 cursor-pointer hover:text-slate-700 transition-colors"
                  >
                    {displayName}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {displayDesc}
                  </p>

                  <div className="p-3.5 bg-slate-50/80 rounded-2xl space-y-1.5 text-xs border border-slate-200/80">
                    <div className="flex justify-between">
                      <span className="text-slate-500">{t('catalog.price')}</span>
                      <span className="font-mono-numbers font-bold text-slate-900">
                        ETB {prod.unitPrice.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-900 font-semibold">
                      <span>{t('catalog.yourCommission')}</span>
                      <span className="font-mono-numbers font-bold text-emerald-800">
                        {prod.commissionTerms.type === 'fixed_per_unit'
                          ? `ETB ${prod.commissionTerms.rateOrAmount.toLocaleString()}/${t('catalog.fixedUnit')}`
                          : `${prod.commissionTerms.rateOrAmount}% ${t('catalog.ofOrder')}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 border-t border-slate-200 pt-1">
                      <span>{t('catalog.deliveryAreas')}</span>
                      <span>{prod.deliveryAreas.slice(0, 3).join(', ')}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50/60 border-t border-slate-200/80 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedProductForModal({ ...prod, name: displayName, description: displayDesc })}
                    className="w-1/3 py-2.5 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 transition-colors shadow-2xs"
                  >
                    {t('catalog.details')}
                  </button>
                  <button
                    onClick={() => setActiveRole('salesperson')}
                    className="w-2/3 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-2xs"
                  >
                    {t('catalog.sellThis')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. FREQUENTLY ASKED QUESTIONS (FAQ & Knowledge Base) */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 text-xs font-semibold text-slate-700">
            <HelpCircle className="w-3.5 h-3.5 text-slate-600" />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Everything You Need to Know About Azwari
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
            Reliable information on agent commissions, 15-minute shelf-stock verification, Telebirr &amp; CBE escrow, and Addis Ababa operations.
          </p>
        </div>

        <div className="space-y-3">
          {/* FAQ 1 */}
          <details className="group glass-card rounded-2xl p-5 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer" open>
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>What is Azwari (azwari.com.et)?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              Azwari (<strong className="text-slate-800">azwari.com.et</strong>) is Ethiopia&apos;s premier multi-party sales agent marketplace and escrow platform based in Addis Ababa. It bridges wholesale merchants and product distributors with an army of independent, freelance sales agents who market products across Telegram, TikTok, Instagram, and word-of-mouth for guaranteed per-sale commissions without holding inventory.
            </p>
          </details>

          {/* FAQ 2 */}
          <details className="group glass-card rounded-2xl p-5 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer">
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>How do independent sales agents make money?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              Agents register for free, browse verified supplier products from Merkato, Bole, and top Addis Ababa distributors, and share their unique product links. When a customer purchases, the merchant fulfills the order, and the agent&apos;s commission (fixed ETB or percentage) is instantly deposited into their Azwari ledger, withdrawable to Telebirr or CBE bank accounts.
            </p>
          </details>

          {/* FAQ 3 */}
          <details className="group glass-card rounded-2xl p-5 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer">
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>How does Azwari ensure products are physically in stock before customers pay?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              To solve the retail walk-in inventory challenge, Azwari never requests payment upfront. When an agent creates an order, the merchant receives an instant alert on Telegram and the web dashboard. The merchant has <strong className="text-slate-800">15 minutes</strong> to physically check shelf availability. Only when confirmed is the customer issued a secure payment link, keeping stock reservations guaranteed and avoiding frustrating refunds.
            </p>
          </details>

          {/* FAQ 4 */}
          <details className="group glass-card rounded-2xl p-5 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer">
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>How are customer payments and merchant funds protected?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              Azwari acts as a trusted escrow intermediary. Payments submitted via Telebirr or Commercial Bank of Ethiopia (CBE) are verified by the platform or merchant and held safely in escrow. Funds are only settled to the supplier and agent once the customer receives the physical item and verifies it with their confidential delivery PIN.
            </p>
          </details>

          {/* FAQ 5 */}
          <details className="group glass-card rounded-2xl p-5 border border-slate-200/90 transition-all [&_summary::-webkit-details-marker]:hidden cursor-pointer">
            <summary className="flex items-center justify-between font-bold text-sm sm:text-base text-slate-900 list-none">
              <span>Where does Azwari operate and deliver?</span>
              <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-3" />
            </summary>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-3 pt-3 border-t border-slate-100">
              Azwari currently operates across all sub-cities of Addis Ababa (including Bole, Merkato, Kazanchis, Piassa, Saris, CMC, and Lebu), partnering with trusted local dispatchers and city couriers for same-day and next-day deliveries, with planned regional expansion across Ethiopia.
            </p>
          </details>
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
