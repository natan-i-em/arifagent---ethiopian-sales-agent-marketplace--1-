'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  CreditCard, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Save, 
  MapPin, 
  Phone, 
  Mail, 
  FileText, 
  DollarSign, 
  Lock, 
  ArrowUpRight, 
  Check, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { Business, PaymentMethodProvider, SupplierPaymentAccount } from '../../types';

interface SupplierProfileSettingsProps {
  currentSupplier: Business;
  walletBalance?: number;
  onNavigateToWallet?: () => void;
  onUpdateProfile: (businessId: string, updates: Partial<Business>) => Promise<boolean>;
  onAddPaymentAccount: (businessId: string, account: Omit<SupplierPaymentAccount, 'id' | 'verified'>) => Promise<boolean>;
  onDeletePaymentAccount: (businessId: string, accountId: string) => Promise<boolean>;
}

const ADDIS_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Nifas Silk-Lafto',
  'Kolfe Keranio',
  'Gulele',
  'Akaki Kality',
  'Lemi Kura'
];

export const SupplierProfileSettings: React.FC<SupplierProfileSettingsProps> = ({
  currentSupplier,
  walletBalance,
  onNavigateToWallet,
  onUpdateProfile,
  onAddPaymentAccount,
  onDeletePaymentAccount,
}) => {
  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: currentSupplier.name,
    tradeName: currentSupplier.tradeName || currentSupplier.name,
    tinNumber: currentSupplier.tinNumber,
    licenseNumber: currentSupplier.licenseNumber,
    city: currentSupplier.city || 'Addis Ababa',
    subcity: currentSupplier.subcity || 'Bole',
    specificLocation: currentSupplier.specificLocation || '',
    phone: currentSupplier.phone,
    contactEmail: currentSupplier.contactEmail,
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);


  // Add Payment Account Modal State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccProvider, setNewAccProvider] = useState<PaymentMethodProvider>('Telebirr');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccHolder, setNewAccHolder] = useState(currentSupplier.name);
  const [newAccIsPrimary, setNewAccIsPrimary] = useState(false);
  const [newAccInstructions, setNewAccInstructions] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccess(false);

    const success = await onUpdateProfile(currentSupplier.id, {
      name: profileForm.name,
      tradeName: profileForm.tradeName,
      tinNumber: profileForm.tinNumber,
      licenseNumber: profileForm.licenseNumber,
      city: profileForm.city,
      subcity: profileForm.subcity,
      specificLocation: profileForm.specificLocation,
      phone: profileForm.phone,
      contactEmail: profileForm.contactEmail,
    });

    setSavingProfile(false);
    if (success) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    }
  };


  // Handle Add Payment Account
  const handleAddAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccNumber || !newAccHolder) return;
    setAddingAccount(true);

    await onAddPaymentAccount(currentSupplier.id, {
      provider: newAccProvider,
      accountNumber: newAccNumber,
      accountHolderName: newAccHolder,
      isPrimary: newAccIsPrimary,
      instructions: newAccInstructions,
    });

    setAddingAccount(false);
    setShowAddAccountModal(false);
    setNewAccNumber('');
    setNewAccInstructions('');
  };

  return (
    <div className="space-y-6">
      {/* 1. Profile Header */}
      <div className="glass-card rounded-3xl border border-white/90 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Merchant Settings & Profile</h1>
            <span className="text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Ethiopian Merchant
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain your official business identity, tax credentials, verified payout accounts, and escrow protection reserves.
          </p>
        </div>

        {onNavigateToWallet && (
          <button
            onClick={onNavigateToWallet}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors shrink-0"
          >
            <Lock className="w-4 h-4 text-emerald-200" />
            <span>Open Collateral Wallet</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-200" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Business Information Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-700" />
                <h2 className="text-base font-bold text-slate-900">Legal Business Profile</h2>
              </div>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1.5 animate-fadeIn">
                  <Check className="w-3.5 h-3.5" /> Changes saved successfully!
                </span>
              )}
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Registered Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Trade Name / Brand Name
                  </label>
                  <input
                    type="text"
                    value={profileForm.tradeName}
                    onChange={(e) => setProfileForm({ ...profileForm, tradeName: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              {/* Legal Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Tax Identification Number (TIN) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.tinNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, tinNumber: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Used for Ministry of Revenue compliance</span>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                    Trade License Number (BL) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.licenseNumber}
                    onChange={(e) => setProfileForm({ ...profileForm, licenseNumber: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Registered in Addis Ababa Trade Bureau</span>
                </div>
              </div>

              {/* Location in Addis Ababa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Addis Ababa Subcity *
                  </label>
                  <select
                    value={profileForm.subcity}
                    onChange={(e) => setProfileForm({ ...profileForm, subcity: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    {ADDIS_SUBCITIES.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Specific Landmark / Location Address
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bole Medhanialem, Edna Mall Building 2nd Floor"
                    value={profileForm.specificLocation}
                    onChange={(e) => setProfileForm({ ...profileForm, specificLocation: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Contact Phone Number (Ethiopian) *
                  </label>
                  <input
                    type="text"
                    required
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Official Contact Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={profileForm.contactEmail}
                    onChange={(e) => setProfileForm({ ...profileForm, contactEmail: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
                >
                  <Save className="w-4 h-4 text-amber-400" />
                  <span>{savingProfile ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Payment Destination Accounts Card */}
          <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-slate-700" />
                  Receiving Payment Accounts
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Customers receive these account details via automated SMS upon order placement.
                </p>
              </div>
              <button
                onClick={() => setShowAddAccountModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Account</span>
              </button>
            </div>

            <div className="space-y-3">
              {(!currentSupplier.paymentAccounts || currentSupplier.paymentAccounts.length === 0) ? (
                <div className="p-6 text-center text-slate-500 text-xs glass-card-subtle rounded-2xl border border-slate-200">
                  No payment receiving accounts registered. Add a Telebirr merchant wallet or CBE bank account.
                </div>
              ) : (
                currentSupplier.paymentAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl border border-slate-200/80 glass-card-subtle flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{acc.provider}</span>
                        {acc.isPrimary && (
                          <span className="text-[10px] font-semibold bg-slate-900 text-white px-2 py-0.5 rounded-md">
                            Primary Account
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 text-sm mt-1">
                        {acc.accountNumber}
                      </div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Holder: {acc.accountHolderName}
                      </div>
                      {acc.instructions && (
                        <div className="text-[11px] text-slate-400 mt-1 italic">
                          "{acc.instructions}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onDeletePaymentAccount(currentSupplier.id, acc.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Escrow & Subscription Status Card */}
        <div className="space-y-6">
          {/* Escrow Guarantee Status */}
          <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-4 bg-gradient-to-br from-white to-slate-50/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                Escrow Guarantee
              </span>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                Active
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block">Commission Reserve Balance</span>
              <div className="font-mono-numbers text-2xl font-bold text-slate-900 mt-0.5">
                ETB {Number(walletBalance !== undefined ? walletBalance : (currentSupplier.commissionReserveBalance || 0)).toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Pre-funded reserve funds guarantee that sales agents will receive immediate commission settlements once deliveries are marked completed.
              </p>
            </div>

            {onNavigateToWallet && (
              <button
                onClick={onNavigateToWallet}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <span>Manage in Collateral Wallet</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
              </button>
            )}
          </div>

          {/* Subscription Tier Details */}
          <div className="glass-card rounded-3xl border border-white/90 p-6 space-y-3">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Merchant Tier & Plan
            </span>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-xs">
                  {currentSupplier.subscriptionPlan === 'enterprise_scale'
                    ? 'Enterprise Scale'
                    : currentSupplier.subscriptionPlan === 'starter_pilot'
                    ? 'Starter Pilot'
                    : 'Business Growth Plan'}
                </span>
                <span className="text-[10px] font-semibold text-slate-700 bg-slate-200 px-2 py-0.5 rounded">
                  {currentSupplier.subscriptionStatus || 'Active'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Includes unlimited active sales agents, automated SMS delivery dispatch, and multi-bank settlement reconciliation.
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1">
              <div>Next Renewal: {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
              <div>Platform Commission Rate: 2.5% per verified delivery</div>
            </div>
          </div>
        </div>
      </div>



      {/* ============================================================ */}
      {/* MODAL: ADD PAYMENT ACCOUNT */}
      {/* ============================================================ */}
      {showAddAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-modal w-full max-w-md rounded-3xl shadow-2xl border border-white/90 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-slate-700" />
                Add Receiving Payment Destination
              </h3>
              <button onClick={() => setShowAddAccountModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccountSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Provider *</label>
                <select
                  value={newAccProvider}
                  onChange={(e) => setNewAccProvider(e.target.value as any)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 bg-white text-slate-900"
                >
                  <option value="Telebirr">Telebirr (Mobile Wallet)</option>
                  <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                  <option value="Awash Bank">Awash Bank</option>
                  <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                  <option value="Dashen Bank">Dashen Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Number / Phone *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1000123456789 or 0911000000"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Account Holder Name *</label>
                <input
                  type="text"
                  required
                  value={newAccHolder}
                  onChange={(e) => setNewAccHolder(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="primaryCheckbox"
                  checked={newAccIsPrimary}
                  onChange={(e) => setNewAccIsPrimary(e.target.checked)}
                  className="rounded border-slate-300 text-slate-900"
                />
                <label htmlFor="primaryCheckbox" className="text-xs text-slate-700 cursor-pointer">
                  Set as Primary Default receiving account
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddAccountModal(false)}
                  className="px-3 py-2 text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingAccount}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs"
                >
                  {addingAccount ? 'Saving...' : 'Add Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
