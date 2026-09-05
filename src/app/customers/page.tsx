import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/business';
import { redirect } from 'next/navigation';
import MobileBottomNav from '@/components/MobileBottomNav';
import Link from 'next/link';

import {
  ArrowLeft,
  Plus,
  Users,
  Mail,
  Phone,
  Building2,
  Eye,
} from 'lucide-react';

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

export default async function CustomersPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Get the business profile for the logged-in user
  const { business } = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto flex max-w-7xl items-center px-6 py-5">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Back to Dashboard
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5">
            <h2 className="font-semibold text-amber-900">
              No business profile found
            </h2>

            <p className="mt-1 text-sm text-amber-700">
              Please set up your business profile in Settings before managing
              customers.
            </p>

            <Link
              href="/settings"
              className="mt-4 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Go to Settings
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Get customers belonging only to this business
  const { data: customers, error } = await supabase
    .from('customers')
    .select('id, name, company_name, address, phone, email, created_at')
    .eq('business_id', business.id)
    .order('created_at', { ascending: false });

  const customerList = (customers || []) as Customer[];

  return (
    <main className="pb-14 lg:pb-0 min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Dashboard
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Customers
              </h1>

              <p className="text-sm text-slate-500">{business.business_name}</p>
            </div>
          </div>

          <Link
            href="/customers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <Plus size={17} />
            Add Customer
          </Link>
        </div>
      </header>

      {/* Main */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        {/* Page heading */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Customer Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Manage your customers and their contact information.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Unable to load customers. Please refresh the page and try again.
          </div>
        )}

        {/* Customer count */}
        <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-slate-100 p-2.5">
                <Users size={20} className="text-slate-700" />
              </div>
            </div>

            <p className="mt-5 text-sm text-slate-500">Total Customers</p>

            <p className="mt-1 text-2xl font-bold text-slate-900">
              {customerList.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">Registered customers</p>
          </div>
        </div>

        {/* Customers table */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="font-semibold text-slate-900">All Customers</h3>

              <p className="mt-1 text-sm text-slate-500">
                Your registered customers.
              </p>
            </div>
          </div>

          {customerList.length === 0 ? (
            /* Empty state */
            <div className="flex min-h-72 items-center justify-center px-6">
              <div className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Users size={22} className="text-slate-500" />
                </div>

                <h4 className="mt-4 font-medium text-slate-900">
                  No customers yet
                </h4>

                <p className="mt-1 text-sm text-slate-500">
                  Add your first customer to get started.
                </p>

                <Link
                  href="/customers/new"
                  className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus size={17} />
                  Add Customer
                </Link>
              </div>
            </div>
          ) : (
            /* Customer list */
            <div className="overflow-x-auto">
              <table className="w-full min-w-200">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Customer
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Company
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Contact
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Address
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {customerList.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* Customer */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <Users size={18} className="text-slate-600" />
                          </div>

                          <div>
                            <p className="font-medium text-slate-900">
                              {customer.name}
                            </p>

                            {customer.email && (
                              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                                <Mail size={12} />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Company */}
                      <td className="px-6 py-4">
                        {customer.company_name ? (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Building2 size={15} className="text-slate-400" />
                            {customer.company_name}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="px-6 py-4">
                        {customer.phone ? (
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Phone size={15} className="text-slate-400" />
                            {customer.phone}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td className="max-w-xs px-6 py-4">
                        {customer.address ? (
                          <p className="truncate text-sm text-slate-600">
                            {customer.address}
                          </p>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={15} />
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
      <MobileBottomNav />
    </main>
  );
}
