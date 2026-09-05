import Link from 'next/link';
import { ArrowLeft, Pencil } from 'lucide-react';
import PrintButton from './PrintButton';
import PaymentForm from './PaymentForm';

import { createClient } from '@/lib/supabase/server';

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
};

type Customer = {
  name: string;
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type InvoicePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // Get the logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Please log in
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            You need to be logged in to view this invoice.
          </p>
        </div>
      </main>
    );
  }

  // Get the invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .select(
      `
      *,
      customers (
        name,
        company_name,
        address,
        phone,
        email
      ),
      invoice_items (
        id,
        description,
        quantity,
        unit_price,
        total
      )
    `,
    )
    .eq('id', id)
    .single();

  if (invoiceError || !invoice) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Invoice not found
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            The invoice you are looking for does not exist or you do not have
            permission to view it.
          </p>

          <Link
            href="/invoices/new"
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[#1e3a5f] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  // Get business profile
  const { data: business } = await supabase
    .from('business_profiles')
    .select(
      `
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
    default_currency
  `,
    )
    .eq('id', invoice.business_id)
    .single();

  if (!business) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-900">
            Invoice unavailable
          </h1>
        </div>
      </main>
    );
  }

  const customer = invoice.customers as Customer | null;
  const items = (invoice.invoice_items ?? []) as InvoiceItem[];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: business.default_currency || 'NGN',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '—';

    return new Date(`${date}T00:00:00`).toLocaleDateString('en-NG', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <main className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/invoices"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Invoices
            </Link>

            <div className="h-5 w-px bg-slate-200" />

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Invoice Details
              </h1>

              <p className="text-sm text-slate-500">
                View invoice information and details.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Edit Invoice
            </Link>

            <PrintButton />
          </div>
        </div>
      </header>

      {/* Invoice */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="invoice-print-area overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Invoice Header */}
          <div className="border-b border-slate-200 px-10 py-8">
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className="text-2xl font-black tracking-[0.18em] text-[#1e3a5f]">
                  ARIZONA
                </div>

                <div className="text-xs font-semibold tracking-[0.28em] text-slate-500">
                  LOGISTICS
                </div>

                {business.slogan && (
                  <p className="mt-3 text-xs font-medium tracking-wide text-slate-500">
                    {business.slogan}
                  </p>
                )}

                <div className="mt-5 space-y-1 text-sm text-slate-600">
                  {business.address && <p>{business.address}</p>}
                  {business.phone && <p>{business.phone}</p>}
                  {business.email && <p>{business.email}</p>}
                </div>
              </div>

              <div className="text-right">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                  INVOICE
                </h1>

                <p className="mt-2 text-sm font-semibold text-[#1e3a5f]">
                  {invoice.invoice_number}
                </p>

                <div className="mt-5 space-y-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500">Invoice Date</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(invoice.invoice_date)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-8">
                    <span className="text-slate-500">Due Date</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Customer + Total */}
          <div className="invoice-customer-total grid gap-8 border-b border-slate-200 px-10 py-8 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Invoice To
              </p>

              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                {customer?.name}
              </h2>

              {customer?.company_name && (
                <p className="mt-1 text-sm text-slate-600">
                  {customer.company_name}
                </p>
              )}

              <div className="mt-3 space-y-1 text-sm text-slate-600">
                {customer?.address && <p>{customer.address}</p>}
                {customer?.phone && <p>{customer.phone}</p>}
                {customer?.email && <p>{customer.email}</p>}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-6 md:text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Due
              </p>

              <p className="mt-2 text-3xl font-bold text-[#1e3a5f]">
                {formatCurrency(Number(invoice.amount_due))}
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Payment: {invoice.payment_method.replaceAll('_', ' ')}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="px-10 py-8">
            <div className="overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      Description
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Qty
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Unit Price
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 text-sm text-slate-900">
                        {item.description}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {Number(item.quantity)}
                      </td>

                      <td className="px-5 py-4 text-right text-sm text-slate-600">
                        {formatCurrency(Number(item.unit_price))}
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-medium text-slate-900">
                        {formatCurrency(Number(item.total))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-8 flex justify-end">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(invoice.subtotal))}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Discount</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(invoice.discount))}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    Tax ({Number(invoice.tax_rate)}%)
                  </span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(invoice.tax_amount))}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-900">Total</span>

                    <span className="text-xl font-bold text-[#1e3a5f]">
                      {formatCurrency(Number(invoice.total))}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-medium text-slate-900">
                    {formatCurrency(Number(invoice.amount_paid))}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-3">
                  <span className="font-bold text-slate-900">Amount Due</span>

                  <span className="font-bold text-red-600">
                    {formatCurrency(Number(invoice.amount_due))}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {(invoice.notes || invoice.terms) && (
            <div className="grid gap-8 border-t border-slate-200 px-10 py-8 md:grid-cols-2">
              {invoice.notes && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Notes</h3>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {invoice.notes}
                  </p>
                </div>
              )}

              {invoice.terms && (
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Terms & Conditions
                  </h3>

                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Bank Details */}
          {business.bank_name && (
            <div className="border-t border-slate-200 bg-slate-50 px-10 py-8">
              <h3 className="text-sm font-bold text-slate-900">
                Payment Details
              </h3>

              <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-1">
                <p>
                  <span className="font-medium text-slate-900">Bank:</span>{' '}
                  {business.bank_name}
                </p>

                <p>
                  <span className="font-medium text-slate-900">
                    Account Name:
                  </span>{' '}
                  {business.account_name || '—'}
                </p>

                <p>
                  <span className="font-medium text-slate-900">
                    Account Number:
                  </span>{' '}
                  {business.account_number || '—'}
                </p>

                {business.swift_code && (
                  <p>
                    <span className="font-medium text-slate-900">SWIFT:</span>{' '}
                    {business.swift_code}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 px-10 py-8 text-center">
            <p className="text-sm font-semibold text-slate-900">
              Thank you for your business.
            </p>

            {/* <p className="mt-2 text-xs text-slate-400">
              {business.business_name}
            </p> */}
          </div>
        </div>

        {/* Payment Management */}
        <div className="mt-6 print:hidden">
          <PaymentForm
            invoiceId={invoice.id}
            total={Number(invoice.total)}
            amountPaid={Number(invoice.amount_paid)}
            amountDue={Number(invoice.amount_due)}
            currentPaymentMethod={invoice.payment_method}
          />
        </div>
      </div>
    </main>
  );
}
