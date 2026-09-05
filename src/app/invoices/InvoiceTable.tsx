'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Edit,
  Eye,
  FileText,
  Search,
  SlidersHorizontal,
} from 'lucide-react';

import DeleteInvoiceButton from './DeleteInvoiceButton';

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

type InvoiceTableProps = {
  invoices: Invoice[];
  currency?: string;
  canDelete?: boolean;
};

function formatCurrency(amount: number | string, currency: string) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(date: string | null) {
  if (!date) return '—';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getEffectiveStatus(invoice: Invoice) {
  const amountDue = Number(invoice.amount_due) || 0;
  const total = Number(invoice.total) || 0;
  const rawStatus = invoice.status?.toUpperCase() || 'UNPAID';

  if (amountDue <= 0 && total > 0) {
    return 'PAID';
  }

  if (rawStatus === 'PAID') {
    return 'PAID';
  }

  if (rawStatus === 'PARTIALLY_PAID') {
    return 'PARTIALLY_PAID';
  }

  if (amountDue > 0 && amountDue < total) {
    return 'PARTIALLY_PAID';
  }

  return 'UNPAID';
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'PAID':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'PARTIALLY_PAID':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'OVERDUE':
      return 'border-red-200 bg-red-50 text-red-700';

    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
}

function formatStatus(status: string) {
  switch (status) {
    case 'PARTIALLY_PAID':
      return 'Partially Paid';

    case 'PAID':
      return 'Paid';

    case 'OVERDUE':
      return 'Overdue';

    case 'UNPAID':
      return 'Unpaid';

    default:
      return status
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

export default function InvoiceTable({
  invoices,
  currency = 'NGN',
  canDelete = false,
}: InvoiceTableProps) {
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successMessage, setSuccessMessage] = useState('');

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const effectiveStatus = getEffectiveStatus(invoice);

      const customerName = invoice.customers?.name?.toLowerCase() || '';

      const companyName = invoice.customers?.company_name?.toLowerCase() || '';

      const invoiceNumber = invoice.invoice_number?.toLowerCase() || '';

      const matchesSearch =
        !normalizedSearch ||
        invoiceNumber.includes(normalizedSearch) ||
        customerName.includes(normalizedSearch) ||
        companyName.includes(normalizedSearch);

      const matchesStatus =
        statusFilter === 'ALL' || effectiveStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const handleDeleted = (invoiceNumber: string) => {
    setSuccessMessage(`Invoice ${invoiceNumber} was successfully deleted.`);

    router.refresh();

    window.setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-3 border-b border-emerald-200 bg-emerald-50 px-5 py-3.5 text-sm text-emerald-800"
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoices or customers..."
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:flex-none">
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-9 pr-9 text-sm font-medium text-slate-700 outline-none transition hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:w-44"
              >
                <option value="ALL">All statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1050px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Invoice Date
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Due Date
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Amount Due
              </th>

              <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Status
              </th>

              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                Action
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {filteredInvoices.map((invoice) => {
              const effectiveStatus = getEffectiveStatus(invoice);

              const customerName =
                invoice.customers?.name || 'Unknown customer';

              const customerCompany = invoice.customers?.company_name || '';

              return (
                <tr
                  key={invoice.id}
                  className="group transition hover:bg-slate-50/70"
                >
                  <td className="px-5 py-4">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="inline-flex items-center gap-2 font-semibold text-slate-900 transition hover:text-slate-600"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-white">
                        <FileText className="h-4 w-4" />
                      </span>

                      {invoice.invoice_number}
                    </Link>
                  </td>

                  <td className="px-5 py-4">
                    <div className="max-w-[220px]">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {customerName}
                      </p>

                      {customerCompany && (
                        <p className="mt-0.5 truncate text-xs text-slate-500">
                          {customerCompany}
                        </p>
                      )}
                    </div>
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {formatDate(invoice.invoice_date)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                    {formatDate(invoice.due_date)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-800">
                    {formatCurrency(invoice.total, currency)}
                  </td>

                  <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold text-slate-800">
                    {formatCurrency(invoice.amount_due, currency)}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                        effectiveStatus,
                      )}`}
                    >
                      {formatStatus(effectiveStatus)}
                    </span>
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        title="View invoice"
                        aria-label={`View ${invoice.invoice_number}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      <Link
                        href={`/invoices/${invoice.id}/edit`}
                        title="Edit invoice"
                        aria-label={`Edit ${invoice.invoice_number}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <Edit className="h-4 w-4" />
                      </Link>

                      {canDelete && (
                        <DeleteInvoiceButton
                          invoiceId={invoice.id}
                          invoiceNumber={invoice.invoice_number}
                          customerName={customerName}
                          onDeleted={handleDeleted}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredInvoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-16 text-center">
                  <div className="mx-auto flex max-w-sm flex-col items-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                      <FileText className="h-5 w-5" />
                    </div>

                    <h3 className="mt-4 text-sm font-semibold text-slate-900">
                      No invoices found
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {search || statusFilter !== 'ALL'
                        ? 'Try adjusting your search or status filter.'
                        : 'Create your first invoice to get started.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile/tablet cards */}
      <div className="divide-y divide-slate-100 lg:hidden">
        {filteredInvoices.map((invoice) => {
          const effectiveStatus = getEffectiveStatus(invoice);

          const customerName = invoice.customers?.name || 'Unknown customer';

          const customerCompany = invoice.customers?.company_name || '';

          return (
            <div key={invoice.id} className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/invoices/${invoice.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-slate-600"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <FileText className="h-4 w-4" />
                    </span>

                    <span className="truncate">{invoice.invoice_number}</span>
                  </Link>

                  <div className="mt-3">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {customerName}
                    </p>

                    {customerCompany && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {customerCompany}
                      </p>
                    )}
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                    effectiveStatus,
                  )}`}
                >
                  {formatStatus(effectiveStatus)}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Invoice Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDate(invoice.invoice_date)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Due Date
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {formatDate(invoice.due_date)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Total
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.total, currency)}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Amount Due
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatCurrency(invoice.amount_due, currency)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-1">
                <Link
                  href={`/invoices/${invoice.id}`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>

                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>

                {canDelete && (
                  <DeleteInvoiceButton
                    invoiceId={invoice.id}
                    invoiceNumber={invoice.invoice_number}
                    customerName={customerName}
                    onDeleted={handleDeleted}
                  />
                )}
              </div>
            </div>
          );
        })}

        {filteredInvoices.length === 0 && (
          <div className="px-5 py-16 text-center">
            <div className="mx-auto flex max-w-sm flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                <FileText className="h-5 w-5" />
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No invoices found
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                {search || statusFilter !== 'ALL'
                  ? 'Try adjusting your search or status filter.'
                  : 'Create your first invoice to get started.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
