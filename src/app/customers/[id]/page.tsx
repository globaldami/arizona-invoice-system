import Link from 'next/link';

import {
  ArrowLeft,
  Pencil,
  FileText,
  Mail,
  Phone,
  MapPin,
  Building2,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/business';

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
};

type Invoice = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  total: number;
  amount_paid: number;
  amount_due: number;
  status: string;
};

type CustomerPageProps = {
  params: Promise<{ id: string }>;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string | null) {
  if (!date) return '—';

  return new Intl.DateTimeFormat('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getStatusLabel(status: string) {
  return status.replace('_', ' ');
}

function getStatusClass(status: string) {
  switch (status) {
    case 'PAID':
      return 'bg-green-50 text-green-700';

    case 'PARTIALLY_PAID':
      return 'bg-yellow-50 text-yellow-700';

    case 'OVERDUE':
      return 'bg-red-50 text-red-700';

    case 'CANCELLED':
      return 'bg-slate-100 text-slate-600';

    case 'DRAFT':
      return 'bg-slate-100 text-slate-600';

    case 'UNPAID':
    default:
      return 'bg-blue-50 text-blue-700';
  }
}

export default async function CustomerDetailsPage({
  params,
}: CustomerPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">
            You must be logged in
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please log in to view this customer.
          </p>
        </div>
      </main>
    );
  }

  // Get the user's business profile
  const { business, error: businessError } = await getCurrentBusiness();

  if (businessError || !business) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Business profile not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please set up your business profile in Settings first.
          </p>
        </div>
      </main>
    );
  }

  // Get customer
  const { data: customerData, error: customerError } = await supabase
    .from('customers')
    .select('id, name, company_name, address, phone, email, created_at')
    .eq('id', id)
    .eq('business_id', business.id)
    .single();

  if (customerError || !customerData) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-6 py-5">
            <Link
              href="/customers"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft size={17} />
              Customers
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-7xl px-6 py-16">
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">
              Customer not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This customer does not exist or does not belong to your business.
            </p>

            <Link
              href="/customers"
              className="mt-6 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Customers
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const customer = customerData as Customer;

  // Get customer's invoices
  const { data: invoiceData, error: invoiceError } = await supabase
    .from('invoices')
    .select(
      'id, invoice_number, invoice_date, due_date, total, amount_paid, amount_due, status',
    )
    .eq('business_id', business.id)
    .eq('customer_id', customer.id)
    .order('invoice_date', { ascending: false });

  if (invoiceError) {
    console.error('Customer invoice error:', invoiceError);
  }

  const invoices = (invoiceData ?? []) as Invoice[];

  // Customer statistics
  const totalInvoices = invoices.length;

  const totalBilled = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.total || 0),
    0,
  );

  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount_paid || 0),
    0,
  );

  const totalOutstanding = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount_due || 0),
    0,
  );

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
                Customer Details
              </h1>

              <p className="text-sm text-slate-500">
                View customer information and invoice history.
              </p>
            </div>
          </div>

          <Link
            href={`/customers/${customer.id}/edit`}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Pencil size={16} />
            Edit Customer
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-8">
        {/* Customer Information */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-lg font-bold text-slate-900">
              Customer Information
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Contact and business information for this customer.
            </p>
          </div>

          <div className="grid gap-8 px-6 py-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Customer Name
              </p>

              <p className="mt-1 text-base font-semibold text-slate-900">
                {customer.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Company
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" />

                <p className="text-sm text-slate-700">
                  {customer.company_name || '—'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Phone
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Phone size={16} className="text-slate-400" />

                {customer.phone ? (
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-sm text-slate-700 hover:text-slate-900"
                  >
                    {customer.phone}
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Email
              </p>

              <div className="mt-1 flex items-center gap-2">
                <Mail size={16} className="text-slate-400" />

                {customer.email ? (
                  <a
                    href={`mailto:${customer.email}`}
                    className="break-all text-sm text-slate-700 hover:text-slate-900"
                  >
                    {customer.email}
                  </a>
                ) : (
                  <p className="text-sm text-slate-500">—</p>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Address
              </p>

              <div className="mt-1 flex items-start gap-2">
                <MapPin size={16} className="mt-0.5 shrink-0 text-slate-400" />

                <p className="whitespace-pre-line text-sm text-slate-700">
                  {customer.address || '—'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Invoices</p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {totalInvoices}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Billed</p>

            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(totalBilled)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Total Paid</p>

            <p className="mt-2 text-2xl font-bold text-green-600">
              {formatCurrency(totalPaid)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Outstanding</p>

            <p className="mt-2 text-2xl font-bold text-red-600">
              {formatCurrency(totalOutstanding)}
            </p>
          </div>
        </div>

        {/* Invoice History */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Invoice History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All invoices associated with this customer.
              </p>
            </div>

            <FileText size={20} className="text-slate-400" />
          </div>

          {invoices.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <FileText size={34} className="mx-auto text-slate-300" />

              <h3 className="mt-4 text-base font-semibold text-slate-900">
                No invoices yet
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                There are no invoices associated with this customer.
              </p>

              <Link
                href="/invoices/new"
                className="mt-5 inline-flex items-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Create Invoice
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Invoice
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Date
                    </th>

                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Due Date
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Total
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Paid
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Outstanding
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-slate-900">
                          {invoice.invoice_number}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(invoice.invoice_date)}
                      </td>

                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatDate(invoice.due_date)}
                      </td>

                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(Number(invoice.total))}
                      </td>

                      <td className="px-6 py-4 text-right text-sm text-green-600">
                        {formatCurrency(Number(invoice.amount_paid))}
                      </td>

                      <td className="px-6 py-4 text-right text-sm text-red-600">
                        {formatCurrency(Number(invoice.amount_due))}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${getStatusClass(
                            invoice.status,
                          )}`}
                        >
                          {getStatusLabel(invoice.status)}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
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
    </main>
  );
}
