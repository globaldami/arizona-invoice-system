'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type CustomerForm = {
  name: string;
  companyName: string;
  address: string;
  phone: string;
  email: string;
};

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const customerId = params.id as string;

  const [form, setForm] = useState<CustomerForm>({
    name: '',
    companyName: '',
    address: '',
    phone: '',
    email: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCustomer = async () => {
      setLoading(true);
      setError('');

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (businessError || !business) {
        setError('Business profile could not be found.');
        setLoading(false);
        return;
      }

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('name, company_name, address, phone, email')
        .eq('id', customerId)
        .eq('business_id', business.id)
        .single();

      if (customerError || !customer) {
        setError('Customer could not be found.');
        setLoading(false);
        return;
      }

      setForm({
        name: customer.name ?? '',
        companyName: customer.company_name ?? '',
        address: customer.address ?? '',
        phone: customer.phone ?? '',
        email: customer.email ?? '',
      });

      setLoading(false);
    };

    loadCustomer();
  }, [customerId, router, supabase]);

  const handleChange = (field: keyof CustomerForm, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');

    const name = form.name.trim();
    const email = form.email.trim();

    if (!name) {
      setError('Customer name is required.');
      return;
    }

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        setError('Please enter a valid email address.');
        return;
      }
    }

    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('You must be logged in to update a customer.');
      setSaving(false);
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      setError('Business profile could not be found.');
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('customers')
      .update({
        name,
        company_name: form.companyName.trim() || null,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        email: email || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('business_id', business.id);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    router.push(`/customers/${customerId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
            Loading customer...
          </div>
        </div>
      </main>
    );
  }

  if (error && !form.name) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/customers"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/customers/${customerId}`}
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Customer
          </Link>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Edit Customer
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Update the customer information below.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Customer Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Customer Name <span className="text-red-500">*</span>
              </label>

              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(event) => handleChange('name', event.target.value)}
                placeholder="Enter customer name"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
              />
            </div>

            {/* Company Name */}
            <div>
              <label
                htmlFor="companyName"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Company Name
              </label>

              <input
                id="companyName"
                type="text"
                value={form.companyName}
                onChange={(event) =>
                  handleChange('companyName', event.target.value)
                }
                placeholder="Enter company name"
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
              />
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Address
              </label>

              <textarea
                id="address"
                value={form.address}
                onChange={(event) =>
                  handleChange('address', event.target.value)
                }
                placeholder="Enter customer address"
                rows={3}
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
              />
            </div>

            {/* Phone and Email */}
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Phone
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(event) =>
                    handleChange('phone', event.target.value)
                  }
                  placeholder="Enter phone number"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    handleChange('email', event.target.value)
                  }
                  placeholder="customer@example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
            <Link
              href={`/customers/${customerId}`}
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
