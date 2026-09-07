import Link from 'next/link';

import ScrollToTopButton from '@/components/ScrollToTopButton';
import MobileBottomNav from '@/components/MobileBottomNav';

import { ArrowLeft, FileText, Plus } from 'lucide-react';

import { createClient } from '@/lib/supabase/server';

import { getCurrentBusiness } from '@/lib/business';

import InvoiceTable from './InvoiceTable';

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total: number | string;
  amount_due: number | string;
  status: string;
  customers: {
    name: string;
    company_name: string | null;
  } | null;
};

type InvoiceStat = {
  total: number | string;
  amount_paid: number | string;
  amount_due: number | string;
};

function formatCurrency(value: number | string, currency: string) {
  try {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  } catch {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2,
    }).format(Number(value) || 0);
  }
}

export default async function InvoicesPage() {
  const supabase = await createClient();

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Please log in
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            You need to be logged in to view your invoices.
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex items-center rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f]"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  // Get the business profile
  const { business } = await getCurrentBusiness();

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Business profile unavailable
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            We could not find a business profile associated with your account.
          </p>
        </div>
      </main>
    );
  }

  // Get the current user's role in this business.
  // Only owners and admins are allowed to delete invoices.
  const { data: membership } = await supabase
    .from('business_members')
    .select('role')
    .eq('business_id', business.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const canDelete = ['owner', 'admin'].includes(membership?.role || '');

  // Get invoices
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select(
      `
        id,
        invoice_number,
        invoice_date,
        due_date,
        total,
        amount_due,
        status,
        customers (
          name,
          company_name
        )
      `,
    )
    .eq('business_id', business.id)
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false });

  const invoices = (invoiceData ?? []) as unknown as Invoice[];

  // Get totals for the invoice summary
  const { data: statData } = await supabase
    .from('invoices')
    .select('total, amount_paid, amount_due')
    .eq('business_id', business.id);

  const invoiceStats = (statData ?? []) as InvoiceStat[];

  const totalInvoices = invoiceStats.length;

  const totalAmount = invoiceStats.reduce(
    (sum, invoice) => sum + Number(invoice.total || 0),
    0,
  );

  const totalReceived = invoiceStats.reduce(
    (sum, invoice) => sum + Number(invoice.amount_paid || 0),
    0,
  );

  const totalOutstanding = invoiceStats.reduce(
    (sum, invoice) => sum + Number(invoice.amount_due || 0),
    0,
  );

  const currency = business.default_currency || 'NGN';

  return (
    <main className="min-h-screen bg-slate-100 pb-16 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f]"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </header>

      {/* Page */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Title */}
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-medium text-slate-500">
              {business.business_name}
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">Invoices</h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage all your invoices.
            </p>
          </div>

          <Link
            href="/invoices/new"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f]"
          >
            <Plus className="h-4 w-4" />
            Create Invoice
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <FileText className="h-5 w-5 text-slate-600" />
              </div>

              <p className="text-sm font-medium text-slate-500">
                Total Invoices
              </p>
            </div>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {totalInvoices}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Billed</p>

            <p className="mt-4 text-2xl font-bold text-slate-900">
              {formatCurrency(totalAmount, currency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Amount Received
            </p>

            <p className="mt-4 text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived, currency)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Outstanding</p>

            <p className="mt-4 text-2xl font-bold text-amber-600">
              {formatCurrency(totalOutstanding, currency)}
            </p>
          </div>
        </div>

        {/* Invoice Table */}
        <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-semibold text-slate-900">
              All Invoices
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {totalInvoices === 0
                ? 'No invoices have been created yet.'
                : `${totalInvoices} invoice${
                    totalInvoices === 1 ? '' : 's'
                  } found.`}
            </p>
          </div>

          {invoiceError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600">
                Unable to load invoices at the moment.
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
                <FileText className="h-7 w-7 text-slate-400" />
              </div>

              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                No invoices yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Create your first invoice to start managing your billing
                records.
              </p>

              <Link
                href="/invoices/new"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f]"
              >
                <Plus className="h-4 w-4" />
                Create Invoice
              </Link>
            </div>
          ) : (
            <InvoiceTable
              invoices={invoices}
              currency={currency}
              canDelete={canDelete}
            />
          )}
        </div>
      </div>

      <ScrollToTopButton className="fixed bottom-36 right-5 z-30 lg:bottom-6" />
      <MobileBottomNav />
    </main>
  );
}
