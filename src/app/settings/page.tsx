'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, CreditCard, Save, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type BusinessProfile = {
  id: string;
  business_name: string;
  slogan: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  bank_name: string | null;
  account_number: string | null;
  account_name: string | null;
  swift_code: string | null;
  default_currency: string;
  default_tax_rate: number;
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200';

const labelClass = 'mb-1.5 block text-sm font-medium text-slate-700';

export default function SettingsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  const [businessName, setBusinessName] = useState('');
  const [slogan, setSlogan] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [swiftCode, setSwiftCode] = useState('');

  const [currency, setCurrency] = useState('NGN');
  const [taxRate, setTaxRate] = useState('0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadBusinessProfile = async () => {
      setLoading(true);
      setError('');

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select(
          `
            id,
            business_name,
            slogan,
            address,
            phone,
            email,
            logo_url,
            bank_name,
            account_number,
            account_name,
            swift_code,
            default_currency,
            default_tax_rate
          `,
        )
        .eq('user_id', user.id)
        .single();

      if (businessError || !business) {
        setError(
          businessError?.message || 'Unable to load your business profile.',
        );
        setLoading(false);
        return;
      }

      const businessProfile = business as BusinessProfile;

      setProfile(businessProfile);

      setBusinessName(businessProfile.business_name || '');
      setSlogan(businessProfile.slogan || '');
      setAddress(businessProfile.address || '');
      setPhone(businessProfile.phone || '');
      setEmail(businessProfile.email || '');

      setBankName(businessProfile.bank_name || '');
      setAccountNumber(businessProfile.account_number || '');
      setAccountName(businessProfile.account_name || '');
      setSwiftCode(businessProfile.swift_code || '');

      setCurrency(businessProfile.default_currency || 'NGN');
      setTaxRate(String(businessProfile.default_tax_rate ?? 0));

      setLoading(false);
    };

    loadBusinessProfile();
  }, [supabase, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    if (!businessName.trim()) {
      setError('Business name is required.');
      setSaving(false);
      return;
    }

    const parsedTaxRate = Number(taxRate);

    if (
      Number.isNaN(parsedTaxRate) ||
      parsedTaxRate < 0 ||
      parsedTaxRate > 100
    ) {
      setError('Tax rate must be between 0 and 100.');
      setSaving(false);
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError('Your session has expired. Please log in again.');
      setSaving(false);
      return;
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('business_profiles')
      .update({
        business_name: businessName.trim(),
        slogan: slogan.trim() || null,
        address: address.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        bank_name: bankName.trim() || null,
        account_number: accountNumber.trim() || null,
        account_name: accountName.trim() || null,
        swift_code: swiftCode.trim() || null,
        default_currency: currency,
        default_tax_rate: parsedTaxRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile?.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError || !updatedProfile) {
      setError(
        updateError?.message || 'Unable to save your business settings.',
      );
      setSaving(false);
      return;
    }

    setProfile(updatedProfile as BusinessProfile);
    setSuccess('Business settings saved successfully.');
    setSaving(false);

    requestAnimationFrame(() => {
      successRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    });
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-6">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading business settings...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pb-22 lg:pb-0 min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-5 w-5" />
            Business Settings
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the business information that appears on your invoices.
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div
            ref={successRef}
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Business Information */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <Building2 className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Business Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Basic information about your business.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label htmlFor="businessName" className={labelClass}>
                  Business Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="businessName"
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className={inputClass}
                  placeholder="Arizona Logistics Limited"
                  required
                />
              </div>

              <div>
                <label htmlFor="slogan" className={labelClass}>
                  Slogan
                </label>

                <input
                  id="slogan"
                  type="text"
                  value={slogan}
                  onChange={(e) => setSlogan(e.target.value)}
                  className={inputClass}
                  placeholder="MOVE. CONNECT. DELIVER."
                />
              </div>

              <div className="md:col-span-2">
                <label htmlFor="address" className={labelClass}>
                  Business Address
                </label>

                <textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className={inputClass}
                  placeholder="Enter your business address"
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+234..."
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
                  Business Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="info@example.com"
                />
              </div>
            </div>
          </section>

          {/* Banking Information */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <CreditCard className="h-5 w-5 text-slate-700" />
                </div>

                <div>
                  <h2 className="font-semibold text-slate-900">
                    Banking Information
                  </h2>
                  <p className="text-sm text-slate-500">
                    Payment details displayed on your invoices.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label htmlFor="bankName" className={labelClass}>
                  Bank Name
                </label>

                <input
                  id="bankName"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                  placeholder="Enter bank name"
                />
              </div>

              <div>
                <label htmlFor="accountName" className={labelClass}>
                  Account Name
                </label>

                <input
                  id="accountName"
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className={inputClass}
                  placeholder="Enter account name"
                />
              </div>

              <div>
                <label htmlFor="accountNumber" className={labelClass}>
                  Account Number
                </label>

                <input
                  id="accountNumber"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className={inputClass}
                  placeholder="Enter account number"
                />
              </div>

              <div>
                <label htmlFor="swiftCode" className={labelClass}>
                  SWIFT Code
                </label>

                <input
                  id="swiftCode"
                  type="text"
                  value={swiftCode}
                  onChange={(e) => setSwiftCode(e.target.value)}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
            </div>
          </section>

          {/* Invoice Defaults */}
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-5">
              <h2 className="font-semibold text-slate-900">Invoice Defaults</h2>

              <p className="text-sm text-slate-500">
                Default settings used when creating new invoices.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              <div>
                <label htmlFor="currency" className={labelClass}>
                  Default Currency
                </label>

                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  <option value="NGN">NGN — Nigerian Naira</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="EUR">EUR — Euro</option>
                </select>
              </div>

              <div>
                <label htmlFor="taxRate" className={labelClass}>
                  Default Tax Rate (%)
                </label>

                <input
                  id="taxRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className={inputClass}
                  placeholder="0"
                />
              </div>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-end gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      <MobileBottomNav />
    </main>
  );
}
