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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm sm:p-8">
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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm sm:p-8">
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
      <main className="min-h-screen overflow-x-hidden bg-slate-50 p-4 sm:p-8">
        <div className="mx-auto max-w-4xl rounded-xl bg-white p-6 shadow-sm sm:p-8">
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
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 7mm;
          }

          html,
          body {
            width: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .no-print,
          .print\\:hidden {
            display: none !important;
          }

          main {
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }

          .invoice-print-wrapper {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          .invoice-print-area {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          /*
           * IMPORTANT:
           * The screen version uses flex-col before the md breakpoint.
           * Chrome's print viewport can cause the md breakpoint not to
           * behave as expected. Force the invoice header to stay horizontal
           * while printing.
           */
          .invoice-print-area .invoice-header-layout {
            display: flex !important;
            flex-direction: row !important;
            align-items: flex-start !important;
            justify-content: space-between !important;
            gap: 24px !important;
          }

          .invoice-print-area .invoice-header-left {
            width: 55% !important;
            min-width: 0 !important;
          }

          .invoice-print-area .invoice-header-right {
            width: 45% !important;
            min-width: 0 !important;
            text-align: right !important;
          }

          .invoice-print-area .invoice-header-right .invoice-date-block {
            margin-left: auto !important;
          }

          /*
           * Keep customer and total side-by-side.
           */
          .invoice-print-area .invoice-customer-total {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) !important;
            gap: 24px !important;
          }

          /*
           * Tighten spacing only. Fonts remain close to their normal
           * screen sizes so the printed invoice stays readable.
           */
          .invoice-print-area .print-tight-y {
            padding-top: 14px !important;
            padding-bottom: 14px !important;
          }

          .invoice-print-area .print-tight-y-sm {
            padding-top: 10px !important;
            padding-bottom: 10px !important;
          }

          .invoice-print-area .print-tight-top {
            margin-top: 10px !important;
          }

          .invoice-print-area .print-tight-small {
            margin-top: 6px !important;
          }

          .invoice-print-area .print-table-cell {
            padding-top: 7px !important;
            padding-bottom: 7px !important;
          }

          .invoice-print-area .print-summary {
            margin-top: 12px !important;
          }

          .invoice-print-area .print-summary-row {
            margin-top: 4px !important;
          }

          /*
           * Prevent sections from being split between pages.
           */
          .invoice-print-area > div,
          .invoice-print-area table,
          .invoice-print-area tbody,
          .invoice-print-area tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /*
           * Keep notes, payment details and footer together as much
           * as possible.
           */
          .invoice-print-area .print-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          /*
           * Slightly reduce only the larger headings in print.
           * This is intentionally much less aggressive than the previous
           * version.
           */
          .invoice-print-area .text-4xl {
            font-size: 32px !important;
            line-height: 1 !important;
          }

          .invoice-print-area .text-3xl {
            font-size: 27px !important;
            line-height: 1.1 !important;
          }

          .invoice-print-area .text-2xl {
            font-size: 22px !important;
          }

          /*
           * Keep the invoice itself readable.
           */
          .invoice-print-area .text-sm {
            font-size: 12px !important;
            line-height: 1.35 !important;
          }

          .invoice-print-area .text-xs {
            font-size: 9px !important;
            line-height: 1.25 !important;
          }

          /*
           * Print table should not introduce horizontal overflow.
           */
          .invoice-print-area .overflow-x-auto {
            overflow: visible !important;
          }

          .invoice-print-area table {
            width: 100% !important;
            min-width: 0 !important;
          }
        }
      `}</style>

      <main className="min-h-screen bg-slate-100">
        {/* Header */}
        <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:items-center sm:gap-4">
              <Link
                href="/invoices"
                className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Invoices</span>
              </Link>

              <div className="h-5 w-px bg-slate-200 sm:block" />

              <div className="min-w-0">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Invoice Details
                </h1>

                <p className="text-sm text-slate-500">
                  View invoice information and details.
                </p>
              </div>
            </div>

            <div className="flex w-full items-center justify-end gap-3 md:w-auto">
              <Link
                href={`/invoices/${invoice.id}/edit`}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                <span>Edit Invoice</span>
              </Link>

              <div className="shrink-0">
                <PrintButton />
              </div>
            </div>
          </div>
        </header>

        {/* Invoice */}
        <div className="invoice-print-wrapper mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-10">
          <div className="invoice-print-area w-full min-w-0 overflow-hidden rounded-xl bg-white shadow-sm">
            {/* Invoice Header */}
            <div className="print-tight-y border-b border-slate-200 px-5 py-6 sm:px-10 sm:py-8">
              <div className="invoice-header-layout flex min-w-0 flex-col gap-7 md:flex-row md:items-start md:justify-between md:gap-8">
                <div className="invoice-header-left min-w-0">
                  <div className="text-3xl font-black tracking-[0.18em] text-[#1e3a5f]">
                    ARIZONA
                  </div>

                  <div className="text-sm font-semibold tracking-[0.28em] text-slate-500">
                    LOGISTICS
                  </div>

                  {business.slogan && (
                    <p className="mt-3 text-xs font-medium tracking-wide text-slate-500">
                      {business.slogan}
                    </p>
                  )}

                  <div className="mt-5 space-y-1 text-sm text-slate-600">
                    {business.address && (
                      <p className="wrap-break-word">{business.address}</p>
                    )}

                    {business.phone && (
                      <p className="wrap-break-word">{business.phone}</p>
                    )}

                    {business.email && (
                      <p className="break-all">{business.email}</p>
                    )}
                  </div>
                </div>

                <div className="invoice-header-right min-w-0 text-left md:text-right">
                  <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                    INVOICE
                  </h1>

                  <p className="mt-2 wrap-break-word text-sm font-semibold text-[#1e3a5f]">
                    {invoice.invoice_number}
                  </p>

                  <div className="invoice-date-block mt-5 w-full max-w-sm space-y-2 text-sm md:ml-auto">
                    <div className="flex items-center justify-between gap-5">
                      <span className="text-slate-500">Invoice Date</span>

                      <span className="font-medium text-slate-900">
                        {formatDate(invoice.invoice_date)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-5">
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
            <div className="invoice-customer-total print-tight-y grid min-w-0 gap-6 border-b border-slate-200 px-5 py-6 sm:gap-8 sm:px-10 sm:py-8 md:grid-cols-2">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Invoice To
                </p>

                <h2 className="mt-2 wrap-break-word text-lg font-semibold text-slate-900">
                  {customer?.name}
                </h2>

                {customer?.company_name && (
                  <p className="mt-1 wrap-break-word text-sm text-slate-600">
                    {customer.company_name}
                  </p>
                )}

                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  {customer?.address && (
                    <p className="wrap-break-word">{customer.address}</p>
                  )}

                  {customer?.phone && (
                    <p className="wrap-break-word">{customer.phone}</p>
                  )}

                  {customer?.email && (
                    <p className="break-all">{customer.email}</p>
                  )}
                </div>
              </div>

              <div className="min-w-0 rounded-xl bg-slate-50 p-5 sm:p-6 md:text-right">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Total Due
                </p>

                <p className="mt-2 wrap-break-word text-2xl font-bold text-[#1e3a5f] sm:text-3xl">
                  {formatCurrency(Number(invoice.amount_due))}
                </p>

                <p className="mt-2 wrap-break-word text-sm text-slate-500">
                  Payment: {invoice.payment_method.replaceAll('_', ' ')}
                </p>
              </div>
            </div>

            {/* Items */}
            <div className="print-tight-y min-w-0 px-4 py-6 sm:px-10 sm:py-8">
              <div className="w-full min-w-0 overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full min-w-140">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="print-table-cell px-4 py-4 text-left text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-5">
                        Description
                      </th>

                      <th className="print-table-cell px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-5">
                        Qty
                      </th>

                      <th className="print-table-cell px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-5">
                        Unit Price
                      </th>

                      <th className="print-table-cell px-4 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500 sm:px-5">
                        Amount
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="print-table-cell wrap-break-word px-4 py-4 text-sm text-slate-900 sm:px-5">
                          {item.description}
                        </td>

                        <td className="print-table-cell px-4 py-4 text-right text-sm text-slate-600 sm:px-5">
                          {Number(item.quantity)}
                        </td>

                        <td className="print-table-cell px-4 py-4 text-right text-sm text-slate-600 sm:px-5">
                          {formatCurrency(Number(item.unit_price))}
                        </td>

                        <td className="print-table-cell px-4 py-4 text-right text-sm font-medium text-slate-900 sm:px-5">
                          {formatCurrency(Number(item.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="print-summary mt-8 flex justify-end">
                <div className="w-full max-w-sm space-y-3">
                  <div className="print-summary-row flex justify-between gap-5 text-sm">
                    <span className="text-slate-500">Subtotal</span>

                    <span className="shrink-0 font-medium text-slate-900">
                      {formatCurrency(Number(invoice.subtotal))}
                    </span>
                  </div>

                  <div className="print-summary-row flex justify-between gap-5 text-sm">
                    <span className="text-slate-500">Discount</span>

                    <span className="shrink-0 font-medium text-slate-900">
                      {formatCurrency(Number(invoice.discount))}
                    </span>
                  </div>

                  <div className="print-summary-row flex justify-between gap-5 text-sm">
                    <span className="text-slate-500">
                      Tax ({Number(invoice.tax_rate)}%)
                    </span>

                    <span className="shrink-0 font-medium text-slate-900">
                      {formatCurrency(Number(invoice.tax_amount))}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between gap-5">
                      <span className="font-bold text-slate-900">Total</span>

                      <span className="shrink-0 text-xl font-bold text-[#1e3a5f]">
                        {formatCurrency(Number(invoice.total))}
                      </span>
                    </div>
                  </div>

                  <div className="print-summary-row flex justify-between gap-5 text-sm">
                    <span className="text-slate-500">Amount Paid</span>

                    <span className="shrink-0 font-medium text-slate-900">
                      {formatCurrency(Number(invoice.amount_paid))}
                    </span>
                  </div>

                  <div className="flex justify-between gap-5 border-t border-slate-200 pt-3">
                    <span className="font-bold text-slate-900">Amount Due</span>

                    <span className="shrink-0 font-bold text-red-600">
                      {formatCurrency(Number(invoice.amount_due))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {(invoice.notes || invoice.terms) && (
              <div className="print-section print-tight-y grid min-w-0 gap-8 border-t border-slate-200 px-5 py-6 sm:px-10 sm:py-8 md:grid-cols-2">
                {invoice.notes && (
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Notes</h3>

                    <p className="print-tight-small mt-2 wrap-break-word whitespace-pre-line text-sm leading-6 text-slate-600">
                      {invoice.notes}
                    </p>
                  </div>
                )}

                {invoice.terms && (
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">
                      Terms & Conditions
                    </h3>

                    <p className="print-tight-small mt-2 wrap-break-word whitespace-pre-line text-sm leading-6 text-slate-600">
                      {invoice.terms}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Bank Details */}
            {business.bank_name && (
              <div className="print-section print-tight-y min-w-0 border-t border-slate-200 bg-slate-50 px-5 py-6 sm:px-10 sm:py-8">
                <h3 className="text-sm font-bold text-slate-900">
                  Payment Details
                </h3>

                <div className="print-tight-small mt-3 grid gap-2 text-sm text-slate-600">
                  <p className="wrap-break-word">
                    <span className="font-medium text-slate-900">Bank:</span>{' '}
                    {business.bank_name}
                  </p>

                  <p className="wrap-break-word">
                    <span className="font-medium text-slate-900">
                      Account Name:
                    </span>{' '}
                    {business.account_name || '—'}
                  </p>

                  <p className="wrap-break-word">
                    <span className="font-medium text-slate-900">
                      Account Number:
                    </span>{' '}
                    {business.account_number || '—'}
                  </p>

                  {business.swift_code && (
                    <p className="wrap-break-word">
                      <span className="font-medium text-slate-900">SWIFT:</span>{' '}
                      {business.swift_code}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="print-section print-tight-y border-t border-slate-200 px-5 py-6 text-center sm:px-10 sm:py-8">
              <p className="text-sm font-semibold text-slate-900">
                Thank you for your business.
              </p>
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
    </>
  );
}
