'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PaymentMethodProvider } from '../../types';
import { 
  X, 
  CheckCircle2, 
  Building2, 
  ArrowRight,
  ShieldCheck,
  CreditCard,
  UserCheck
} from 'lucide-react';

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

export const WaitlistModal: React.FC = () => {
  const { 
    showWaitlistModal, 
    setShowWaitlistModal, 
    waitlistRolePreference, 
    setWaitlistRolePreference,
    registerSupplier,
    registerSalesAgent
  } = useApp();

  // Mode: 'sales_agent' or 'supplier'
  const isSupplier = waitlistRolePreference === 'supplier';

  // Sales Agent Form State
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('+251 9');
  const [agentSubcity, setAgentSubcity] = useState('Bole');
  const [agentTelegram, setAgentTelegram] = useState('');
  const [agentPayoutProvider, setAgentPayoutProvider] = useState<'Telebirr' | 'CBE'>('Telebirr');
  const [agentPayoutAccount, setAgentPayoutAccount] = useState('');
  const [agentAccountName, setAgentAccountName] = useState('');

  // Supplier Form State
  const [supplierName, setSupplierName] = useState('');
  const [supplierTradeName, setSupplierTradeName] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [supplierLicense, setSupplierLicense] = useState('');
  const [supplierSubcity, setSupplierSubcity] = useState('Kirkos');
  const [supplierLocation, setSupplierLocation] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('+251 9');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [bankProvider, setBankProvider] = useState<PaymentMethodProvider>('Telebirr');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountHolder, setBankAccountHolder] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successPayload, setSuccessPayload] = useState<{
    role: 'sales_agent' | 'supplier';
    title: string;
    details: string;
    actionText: string;
  } | null>(null);

  if (!showWaitlistModal) return null;

  const validatePhone = (p: string) => {
    const cleaned = p.replace(/\s+/g, '');
    return /^(?:\+251|0)[79]\d{8}$/.test(cleaned);
  };

  const handleRegisterAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!agentName.trim() || agentName.trim().length < 3) {
      setErrorMsg('Please enter your full official name (minimum 3 characters).');
      return;
    }
    if (!validatePhone(agentPhone)) {
      setErrorMsg('Please enter a valid Ethiopian mobile number (e.g., +251 911 223344 or 0911223344).');
      return;
    }
    if (!agentPayoutAccount.trim()) {
      setErrorMsg('Please provide your Telebirr or CBE payout account number.');
      return;
    }

    const res = await registerSalesAgent({
      fullName: agentName.trim(),
      phone: agentPhone.trim(),
      subcity: agentSubcity,
      telegramUsername: agentTelegram.trim() || undefined,
      payoutProvider: agentPayoutProvider,
      payoutAccountNumber: agentPayoutAccount.trim(),
      payoutAccountName: agentAccountName.trim() || agentName.trim(),
    });

    if (res.success && res.agent) {
      setSuccessPayload({
        role: 'sales_agent',
        title: 'Sales Agent Workspace Activated',
        details: `Welcome, ${res.agent.fullName}! Your agent profile is live with referral code ${res.agent.referralCode}. Commissions will settle to ${res.agent.payoutDestination.provider}.`,
        actionText: 'Enter Agent Portal Now',
      });
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleRegisterSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!supplierName.trim() || supplierName.trim().length < 3) {
      setErrorMsg('Please enter your business or legal company name.');
      return;
    }
    if (!supplierTin.trim() || supplierTin.trim().length < 8) {
      setErrorMsg('Please enter a valid Taxpayer Identification Number (TIN, min 8 digits).');
      return;
    }
    if (!validatePhone(supplierPhone)) {
      setErrorMsg('Please enter a valid official Ethiopian phone number.');
      return;
    }
    if (!bankAccountNumber.trim()) {
      setErrorMsg('Please provide your verified receiving bank or Telebirr merchant account.');
      return;
    }

    const res = await registerSupplier({
      name: supplierName.trim(),
      tradeName: supplierTradeName.trim() || supplierName.trim(),
      tinNumber: supplierTin.trim(),
      licenseNumber: supplierLicense.trim() || `AA/${supplierSubcity.substring(0, 3).toUpperCase()}/2026/01`,
      subcity: supplierSubcity,
      specificLocation: supplierLocation.trim() || 'Addis Ababa',
      phone: supplierPhone.trim(),
      contactEmail: supplierEmail.trim() || `contact@${supplierName.toLowerCase().replace(/[^a-z0-9]/g, '')}.et`,
      primaryBank: {
        provider: bankProvider,
        accountNumber: bankAccountNumber.trim(),
        accountHolderName: bankAccountHolder.trim() || supplierName.trim(),
      },
    });

    if (res.success && res.business) {
      setSuccessPayload({
        role: 'supplier',
        title: 'Merchant Console Activated',
        details: `Congratulations, ${res.business.name}! Your verified merchant profile has been provisioned with 10,000 ETB commission reserve safeguards.`,
        actionText: 'Launch Merchant Console',
      });
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  const handleClose = () => {
    setShowWaitlistModal(false);
    setSuccessPayload(null);
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="w-full max-w-xl bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xs">
              {isSupplier ? <Building2 className="w-4 h-4 text-white" /> : <UserCheck className="w-4 h-4 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {successPayload ? 'Onboarding Complete' : isSupplier ? 'Onboard Merchant Account' : 'Register Sales Agent Profile'}
              </h2>
              <p className="text-xs text-slate-500">
                Azwari Multi-Party Commerce & Escrow Clearinghouse
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {successPayload ? (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                  {successPayload.title}
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  {successPayload.details}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-xs">
                <div className="flex items-center gap-2 font-semibold text-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Production Safeguards Verified</span>
                </div>
                <div className="text-[11px] text-slate-500 leading-relaxed">
                  SMS webhook routing active. Payment evidence inspection window set to 15 minutes. Commission escrow records are locked in database transactions.
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
              >
                <span>{successPayload.actionText}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Role Toggle Selector */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setWaitlistRolePreference('sales_agent')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    !isSupplier 
                      ? 'bg-white text-slate-900 shadow-xs border border-white' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-slate-700" />
                  <span>Independent Agent</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWaitlistRolePreference('supplier')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 ${
                    isSupplier 
                      ? 'bg-white text-slate-900 shadow-xs border border-white' 
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-slate-700" />
                  <span>Merchant / Supplier</span>
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              {/* Form for Independent Sales Agent */}
              {!isSupplier ? (
                <form onSubmit={handleRegisterAgent} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Alazar Mengistu"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Mobile Phone (Ethiopia) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+251 911 234567"
                        value={agentPhone}
                        onChange={(e) => setAgentPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Operational Subcity *
                      </label>
                      <select
                        value={agentSubcity}
                        onChange={(e) => setAgentSubcity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      >
                        {ADDIS_SUBCITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 block">
                      Telegram Username (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="@username"
                      value={agentTelegram}
                      onChange={(e) => setAgentTelegram(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                    />
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                      <span>Commission Payout Destination</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAgentPayoutProvider('Telebirr')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          agentPayoutProvider === 'Telebirr'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Telebirr Mobile
                      </button>
                      <button
                        type="button"
                        onClick={() => setAgentPayoutProvider('CBE')}
                        className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all ${
                          agentPayoutProvider === 'CBE'
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Commercial Bank (CBE)
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder={agentPayoutProvider === 'Telebirr' ? 'Telebirr Phone (09...)' : 'CBE Account Number'}
                        value={agentPayoutAccount}
                        onChange={(e) => setAgentPayoutAccount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Account Holder Full Name"
                        value={agentAccountName}
                        onChange={(e) => setAgentAccountName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Activate Sales Agent Profile</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* Form for Merchant / Supplier */
                <form onSubmit={handleRegisterSupplier} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Enterprise Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g., Entoto Leather Crafts"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Trade Name / PLC
                      </label>
                      <input
                        type="text"
                        placeholder="Entoto Crafts PLC"
                        value={supplierTradeName}
                        onChange={(e) => setSupplierTradeName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        TIN Number (10 Digits) *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="0048192041"
                        value={supplierTin}
                        onChange={(e) => setSupplierTin(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Trade License Code
                      </label>
                      <input
                        type="text"
                        placeholder="AA/KIR/02/008129/2016"
                        value={supplierLicense}
                        onChange={(e) => setSupplierLicense(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Warehouse Subcity *
                      </label>
                      <select
                        value={supplierSubcity}
                        onChange={(e) => setSupplierSubcity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      >
                        {ADDIS_SUBCITIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-700 block">
                        Official Phone *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="+251 911 000000"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  {/* Primary Receiving Bank */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <CreditCard className="w-3.5 h-3.5 text-slate-700" />
                      <span>Primary Receiving Bank (For Customer Payments)</span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Telebirr', 'Commercial Bank of Ethiopia (CBE)', 'Awash Bank'] as PaymentMethodProvider[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBankProvider(p)}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border text-center transition-all truncate ${
                            bankProvider === p
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {p.split(' ')[0]}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        required
                        placeholder="Account Number / Merchant ID"
                        value={bankAccountNumber}
                        onChange={(e) => setBankAccountNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-mono text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                      <input
                        type="text"
                        placeholder="Account Holder Full Name"
                        value={bankAccountHolder}
                        onChange={(e) => setBankAccountHolder(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/20 focus:border-slate-900"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs flex items-center justify-center gap-2"
                  >
                    <span>Activate Merchant Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
