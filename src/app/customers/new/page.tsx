'use client';

import { FormEvent, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ArrowLeft, Save, UserPlus } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

export default function NewCustomerPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSaveCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');

    const trimmedName = name.trim();
    const trimmedCompanyName = companyName.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim();

    // Basic validation
    if (!trimmedName) {
      setError('Customer name is required.');
      return;
    }

    if (trimmedEmail) {
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

      if (!emailIsValid) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    try {
      setSaving(true);

      // Get authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('You must be logged in to add a customer.');
        return;
      }

      // Get business profile
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (businessError || !business) {
        setError(
          'No business profile was found. Please set up your business profile in Settings first.',
        );
        return;
      }

      // Create customer
      const { error: customerError } = await supabase.from('customers').insert({
        business_id: business.id,
        name: trimmedName,
        company_name: trimmedCompanyName || null,
        address: trimmedAddress || null,
        phone: trimmedPhone || null,
        email: trimmedEmail || null,
      });

      if (customerError) {
        console.error('Customer creation error:', customerError);
        setError(
          'Unable to create customer. Please check your information and try again.',
        );
        return;
      }

      // Return to customers list
      router.push('/customers');
      router.refresh();
    } catch (error) {
      console.error('Unexpected customer creation error:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Customers
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Add Customer
              </h1>

              <p className="text-sm text-slate-500">
                Create a new customer record.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Customer Information
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter the customer&#39;s contact and business details below.
          </p>
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleSaveCustomer}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <UserPlus size={19} className="text-slate-700" />
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">
                  Customer Details
                </h3>

                <p className="mt-0.5 text-sm text-slate-500">
                  Fields marked with * are required.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            {/* Error */}
            {error && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {/* Customer Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Customer Name <span className="text-red-500">*</span>
              </label>

              <input
                id="name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter customer name"
                disabled={saving}
                autoComplete="name"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Company Name */}
            <div>
              <label
                htmlFor="companyName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Company Name
              </label>

              <input
                id="companyName"
                type="text"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Enter company name"
                disabled={saving}
                autoComplete="organization"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>

            {/* Phone + Email */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="Enter phone number"
                  disabled={saving}
                  autoComplete="tel"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter email address"
                  disabled={saving}
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Address
              </label>

              <textarea
                id="address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Enter customer address"
                rows={4}
                disabled={saving}
                autoComplete="street-address"
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
            <Link
              href="/customers"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={17} />

              {saving ? 'Saving...' : 'Save Customer'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
