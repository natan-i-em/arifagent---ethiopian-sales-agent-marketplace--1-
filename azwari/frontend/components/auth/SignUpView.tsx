'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useApp } from '../../context/AppContext';
import { PaymentMethodProvider } from '../../types';
import {
  Layers,
  UserCheck,
  Building2,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Lock,
  CreditCard
} from 'lucide-react';

const ADDIS_SUBCITIES = [
  'Bole',
  'Kirkos',
  'Yeka',
  'Arada',
  'Lideta',
  'Kolfe Keranio',
  'Gulele',
  'Nifas Silk-Lafto',
  'Akaky Kaliti',
  'Lemi Kura',
];

export const SignUpView: React.FC = () => {
  const {
    registerSalesAgent,
    registerSupplier,
    signInWithGoogle,
    setCurrentView,
    authRolePreference,
    setAuthRolePreference
  } = useApp();

  const [selectedRole, setSelectedRole] = useState<'salesperson' | 'supplier'>(
    authRolePreference === 'supplier' ? 'supplier' : 'salesperson'
  );

  // Salesperson form state
  const [agentName, setAgentName] = useState('');
  const [agentPhone, setAgentPhone] = useState('+251 9');
  const [agentEmail, setAgentEmail] = useState('');
  const [agentSubcity, setAgentSubcity] = useState('Bole');
  const [agentTelegram, setAgentTelegram] = useState('');
  const [agentPayoutProvider, setAgentPayoutProvider] = useState<'Telebirr' | 'CBE'>('Telebirr');
  const [agentPayoutAccount, setAgentPayoutAccount] = useState('');
  const [agentPayoutName, setAgentPayoutName] = useState('');
  const [agentPassword, setAgentPassword] = useState('');

  // Supplier form state
  const [bizName, setBizName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [tinNumber, setTinNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [bizSubcity, setBizSubcity] = useState('Kirkos');
  const [bizLocation, setBizLocation] = useState('');
  const [bizPhone, setBizPhone] = useState('+251 9');
  const [bizEmail, setBizEmail] = useState('');
  const [bizBankProvider, setBizBankProvider] = useState<PaymentMethodProvider>('Commercial Bank of Ethiopia (CBE)');
  const [bizBankAccount, setBizBankAccount] = useState('');
  const [bizAccountHolder, setBizAccountHolder] = useState('');
  const [bizPassword, setBizPassword] = useState('');

  const [termsAgreed, setTermsAgreed] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setErrorMessage(null);
    setGoogleLoading(true);
    const res = await signInWithGoogle(selectedRole);
    if (!res.success) {
      setGoogleLoading(false);
      setErrorMessage(res.error || 'Google Sign-Up failed. Please try again or use the registration form.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!termsAgreed) {
      setErrorMessage('You must accept the Ethiopian commerce compliance and commission terms.');
      return;
    }

    setSubmitting(true);

    try {
      if (selectedRole === 'salesperson') {
        if (!agentName.trim() || !agentPhone.trim() || !agentPayoutAccount.trim()) {
          setErrorMessage('Please fill in your full name, phone number, and payout account details.');
          setSubmitting(false);
          return;
        }

        if (!agentPassword || agentPassword.length < 6) {
          setErrorMessage('Please choose a password of at least 6 characters.');
          setSubmitting(false);
          return;
        }

        const res = await registerSalesAgent({
          fullName: agentName.trim(),
          phone: agentPhone.trim(),
          email: agentEmail.trim() || undefined,
          password: agentPassword,
          subcity: agentSubcity,
          telegramUsername: agentTelegram ? (agentTelegram.startsWith('@') ? agentTelegram : `@${agentTelegram}`) : undefined,
          payoutProvider: agentPayoutProvider,
          payoutAccountNumber: agentPayoutAccount.trim(),
          payoutAccountName: agentPayoutName.trim() || agentName.trim(),
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to complete registration.');
        }
      } else {
        if (!bizName.trim() || !tinNumber.trim() || !bizBankAccount.trim() || !bizPhone.trim() || !bizEmail.trim()) {
          setErrorMessage('Please provide your business name, TIN number, email, phone, and settlement bank details.');
          setSubmitting(false);
          return;
        }

        if (!bizPassword || bizPassword.length < 6) {
          setErrorMessage('Please choose a password of at least 6 characters.');
          setSubmitting(false);
          return;
        }

        const res = await registerSupplier({
          businessName: bizName.trim(),
          tradeName: tradeName.trim() || bizName.trim(),
          tinNumber: tinNumber.trim(),
          licenseNumber: licenseNumber.trim() || `ETH-LIC-${Math.floor(100000 + Math.random() * 900000)}`,
          subcity: bizSubcity,
          specificLocation: bizLocation.trim() || `${bizSubcity}, Addis Ababa`,
          phone: bizPhone.trim(),
          contactEmail: bizEmail.trim(),
          password: bizPassword,
          primaryBank: {
            provider: bizBankProvider,
            accountNumber: bizBankAccount.trim(),
            accountHolderName: bizAccountHolder.trim() || bizName.trim(),
          },
        });

        if (!res.success) {
          setErrorMessage(res.error || 'Failed to complete merchant registration.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[90vh] bg-light-pattern py-12 px-4 sm:px-6 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-900 text-white shadow-xs mb-1">
            <Layers className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Create Your Azwari Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            Choose your role and register directly to the Supabase-backed commerce & escrow platform.
          </p>
        </div>

        {/* Role Selector Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedRole('salesperson')}
            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${selectedRole === 'salesperson'
                ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                : 'bg-white/70 border-slate-200 hover:border-slate-400 hover:bg-white'
              }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedRole === 'salesperson' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                <UserCheck className="w-5 h-5" />
              </div>
              {selectedRole === 'salesperson' && (
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900">Independent Sales Agent</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Market verified products to your customers, create tokenized orders, and receive direct Telebirr/CBE commission payouts.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Up to 20% commission / unit</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('supplier')}
            className={`p-4 rounded-2xl border text-left transition-all relative cursor-pointer ${selectedRole === 'supplier'
                ? 'bg-white border-slate-900 shadow-xs ring-1 ring-slate-900'
                : 'bg-white/70 border-slate-200 hover:border-slate-400 hover:bg-white'
              }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${selectedRole === 'supplier' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                <Building2 className="w-5 h-5" />
              </div>
              {selectedRole === 'supplier' && (
                <span className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded-full">
                  Selected
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900">Product Supplier / Merchant</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              List inventory, connect with active sales agents across Addis, and verify customer bank receipts with escrow protection.
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-blue-700">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Direct CBE & Telebirr Settlements</span>
            </div>
          </button>
        </div>

        {/* Dynamic Registration Form */}
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-white/90 shadow-sm bg-white/95 space-y-6">
          {/* Google Quick Sign-Up */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={googleLoading}
              onClick={handleGoogleSignUp}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition-all shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>{googleLoading ? 'Connecting to Google...' : `Sign up as ${selectedRole === 'salesperson' ? 'Sales Agent' : 'Merchant'} with Google`}</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400">or complete profile registration</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Salesperson Fields */}
            {selectedRole === 'salesperson' && (
              <div className="space-y-4">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Agent Profile & Security Credentials
                  </h3>
                  <p className="text-xs text-slate-500">Provide your personal contact and operational base in Addis Ababa.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="e.g. Yonas Alemu Haile"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={agentPhone}
                      onChange={(e) => setAgentPhone(e.target.value)}
                      placeholder="+251 91 234 5678"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Email and Password for Sales Agent */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Email Address *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder="yonas@example.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Password (min 6 characters) *</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={agentPassword}
                      onChange={(e) => setAgentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Addis Ababa Subcity *</label>
                    <select
                      value={agentSubcity}
                      onChange={(e) => setAgentSubcity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    >
                      {ADDIS_SUBCITIES.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Telegram Handle (Optional)</label>
                    <input
                      type="text"
                      value={agentTelegram}
                      onChange={(e) => setAgentTelegram(e.target.value)}
                      placeholder="@yonas_ethio"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Payout Destination */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Commission Payout Destination</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Payout Provider</label>
                      <select
                        value={agentPayoutProvider}
                        onChange={(e) => setAgentPayoutProvider(e.target.value as 'Telebirr' | 'CBE')}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold shadow-2xs"
                      >
                        <option value="Telebirr">Telebirr (*127#)</option>
                        <option value="CBE">Commercial Bank of Ethiopia (CBE)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-700">Account / Phone Number *</label>
                      <input
                        type="text"
                        required
                        value={agentPayoutAccount}
                        onChange={(e) => setAgentPayoutAccount(e.target.value)}
                        placeholder={agentPayoutProvider === 'Telebirr' ? '+251 9...' : '1000... (CBE Account)'}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Supplier / Merchant Fields */}
            {selectedRole === 'supplier' && (
              <div className="space-y-4">
                <div className="border-b border-slate-200/80 pb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Business Verification & Registration
                  </h3>
                  <p className="text-xs text-slate-500">Provide trade and TIN particulars required under Ethiopian commerce laws.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Business / Legal Name *</label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      placeholder="e.g. Entoto Agro Processing PLC"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Trade / Brand Name</label>
                    <input
                      type="text"
                      value={tradeName}
                      onChange={(e) => setTradeName(e.target.value)}
                      placeholder="e.g. Entoto Coffee & Spices"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tax Identification Number (TIN) *</label>
                    <input
                      type="text"
                      required
                      value={tinNumber}
                      onChange={(e) => setTinNumber(e.target.value)}
                      placeholder="0019283746"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Business License Number</label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="AA/BOL/14/098/3928"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                {/* Email and Password for Supplier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>Official Contact Email *</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={bizEmail}
                      onChange={(e) => setBizEmail(e.target.value)}
                      placeholder="ops@habeshaleather.et"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Password (min 6 characters) *</span>
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={bizPassword}
                      onChange={(e) => setBizPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Subcity Base *</label>
                    <select
                      value={bizSubcity}
                      onChange={(e) => setBizSubcity(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    >
                      {ADDIS_SUBCITIES.map((sub) => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Specific Shop / Warehouse Address *</label>
                    <input
                      type="text"
                      required
                      value={bizLocation}
                      onChange={(e) => setBizLocation(e.target.value)}
                      placeholder="e.g. Merkato, Somale Tera, Bldg 4, Shop #18"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Business Phone *</label>
                  <input
                    type="text"
                    required
                    value={bizPhone}
                    onChange={(e) => setBizPhone(e.target.value)}
                    placeholder="+251 91 122 3344"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900 shadow-2xs"
                  />
                </div>

                {/* Primary Bank Settlement Account */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-slate-700" />
                    <span className="text-xs font-bold text-slate-900">Primary Bank Settlement Account</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Financial Institution</label>
                      <select
                        value={bizBankProvider}
                        onChange={(e) => setBizBankProvider(e.target.value as PaymentMethodProvider)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-semibold shadow-2xs"
                      >
                        <option value="Commercial Bank of Ethiopia (CBE)">Commercial Bank of Ethiopia (CBE)</option>
                        <option value="Telebirr">Telebirr Merchant (*127#)</option>
                        <option value="Awash Bank">Awash Bank</option>
                        <option value="Bank of Abyssinia">Bank of Abyssinia</option>
                        <option value="Dashen Bank">Dashen Bank</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Account Number *</label>
                      <input
                        type="text"
                        required
                        value={bizBankAccount}
                        onChange={(e) => setBizBankAccount(e.target.value)}
                        placeholder="100029384756"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono shadow-2xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Agreements */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={termsAgreed}
                  onChange={(e) => setTermsAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to Azwari's verified commerce terms, commission escrow safeguards, and Ethiopian regulatory standards.
                </span>
              </label>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-70 cursor-pointer"
            >
              {submitting ? (
                <span>Registering on Supabase...</span>
              ) : (
                <>
                  <span>Complete {selectedRole === 'salesperson' ? 'Sales Agent' : 'Merchant'} Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Switch to Sign In */}
          <div className="border-t border-slate-200/80 pt-4 text-center">
            <p className="text-xs text-slate-600">
              Already have an account?{' '}
              <Link
                href="/signin"
                onClick={() => setAuthRolePreference(selectedRole)}
                className="font-bold text-slate-900 hover:underline cursor-pointer"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
