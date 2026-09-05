import Link from 'next/link';

import { redirect } from 'next/navigation';

import MobileBottomNav from '@/components/MobileBottomNav';

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
  Wallet,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';

import { getCurrentBusiness } from '@/lib/business';

type InvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_date: string | null;
  due_date: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total: number | null;
  amount_paid: number | null;
  amount_due: number | null;
  status: string | null;
  customer_id: string | null;
  customers:
    | {
        name: string | null;
      }
    | {
        name: string | null;
      }[]
    | null;
};

type TeamMember = {
  id?: string;
  user_id?: string;
  role?: string;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  created_at?: string | null;
};

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

type InvoiceWithStats = InvoiceRow & {
  calculatedStatus: string;
  calculatedAmountDue: number;
};

type DashboardStats = {
  totalBilled: number;
  totalReceived: number;
  outstanding: number;
  overdue: number;
  paidCount: number;
  partiallyPaidCount: number;
  unpaidCount: number;
  overdueCount: number;
};

function formatCurrency(value: number) {
  return `₦${value.toLocaleString('en-NG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatRelativeTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
  });
}

function getCustomerName(invoice: InvoiceRow) {
  if (Array.isArray(invoice.customers)) {
    return invoice.customers[0]?.name ?? 'Unknown customer';
  }

  return invoice.customers?.name ?? 'Unknown customer';
}

function getInvoiceStatus(invoice: InvoiceRow) {
  const amountDue = Number(invoice.amount_due ?? 0);
  const amountPaid = Number(invoice.amount_paid ?? 0);

  if (amountDue <= 0 && amountPaid > 0) {
    return 'paid';
  }

  if (amountPaid > 0 && amountDue > 0) {
    return 'partially_paid';
  }

  if (invoice.due_date) {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();

    dueDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (dueDate < today && amountDue > 0) {
      return 'overdue';
    }
  }

  return invoice.status?.toLowerCase() ?? 'unpaid';
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'paid':
      return 'Paid';
    case 'partially_paid':
      return 'Partially Paid';
    case 'overdue':
      return 'Overdue';
    case 'unpaid':
      return 'Unpaid';
    default:
      return status
        .replace(/\_/g, ' ')
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/10';
    case 'partially_paid':
      return 'bg-amber-50 text-amber-700 ring-amber-600/10';
    case 'overdue':
      return 'bg-red-50 text-red-700 ring-red-600/10';
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-500/10';
  }
}

function getActivityEntity(log: AuditLog) {
  if (log.entity_type === 'invoice_item') {
    return 'Invoice item';
  }

  if (log.entity_type === 'invoice') {
    return 'Invoice';
  }

  return log.entity_type
    .replace(/\_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getActivityText(log: AuditLog) {
  const entity = getActivityEntity(log);

  switch (log.action) {
    case 'created':
      return `Created ${entity.toLowerCase()}`;

    case 'updated':
      return `Updated ${entity.toLowerCase()}`;

    case 'deleted':
      return `Deleted ${entity.toLowerCase()}`;

    default:
      return `${log.action} ${entity.toLowerCase()}`;
  }
}

function getActivityIcon(log: AuditLog) {
  if (log.action === 'created') {
    return <Plus className="h-4 w-4" />;
  }

  if (log.action === 'deleted') {
    return <AlertTriangle className="h-4 w-4" />;
  }

  return <Activity className="h-4 w-4" />;
}

function getActivityIconClasses(log: AuditLog) {
  if (log.action === 'created') {
    return 'bg-emerald-50 text-emerald-600';
  }

  if (log.action === 'deleted') {
    return 'bg-red-50 text-red-600';
  }

  return 'bg-blue-50 text-blue-600';
}

function getActivityActionClasses(log: AuditLog) {
  if (log.action === 'created') {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (log.action === 'deleted') {
    return 'bg-red-50 text-red-700';
  }

  return 'bg-blue-50 text-blue-700';
}

function getAuditValue(
  value: unknown,
  field: string,
  invoices: InvoiceWithStats[],
) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (field === 'invoice_id' || field === 'entity_id') {
    const invoice = invoices.find((item) => item.id === String(value));

    if (invoice) {
      return invoice.invoice_number;
    }
  }

  if (
    field === 'total' ||
    field === 'amount_paid' ||
    field === 'amount_due' ||
    field === 'subtotal' ||
    field === 'tax_amount' ||
    field === 'unit_price' ||
    field === 'price'
  ) {
    const numericValue = Number(value);

    if (!Number.isNaN(numericValue)) {
      return formatCurrency(numericValue);
    }
  }

  if (
    field === 'invoice_date' ||
    field === 'due_date' ||
    field === 'created_at' ||
    field === 'updated_at'
  ) {
    if (typeof value === 'string') {
      return formatDate(value);
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return 'Updated';
  }

  return String(value);
}

function getInvoiceFromAudit(log: AuditLog, invoices: InvoiceWithStats[]) {
  if (!log.entity_id) {
    return null;
  }

  if (log.entity_type === 'invoice') {
    return invoices.find((invoice) => invoice.id === log.entity_id) ?? null;
  }

  const possibleInvoiceId =
    log.old_data?.invoice_id ?? log.new_data?.invoice_id;

  if (possibleInvoiceId) {
    return (
      invoices.find((invoice) => invoice.id === String(possibleInvoiceId)) ??
      null
    );
  }

  return null;
}

/**
 * Resolves the activity subject.
 *
 * For deleted invoices, the invoice no longer exists in the invoices
 * table, so we use the invoice_number captured in old_data by the
 * DELETE audit trigger.
 */
function getActivitySubject(log: AuditLog, invoices: InvoiceWithStats[]) {
  const invoice = getInvoiceFromAudit(log, invoices);

  if (invoice) {
    return invoice.invoice_number;
  }

  const newData = log.new_data ?? {};
  const oldData = log.old_data ?? {};

  // Deleted invoices no longer exist in the invoices table.
  // Their invoice number is preserved in old_data by the audit trigger.
  if (
    log.entity_type === 'invoice' &&
    typeof oldData.invoice_number === 'string' &&
    oldData.invoice_number.trim()
  ) {
    return oldData.invoice_number;
  }

  // Also support invoice numbers that may exist in either audit payload.
  if (
    typeof newData.invoice_number === 'string' &&
    newData.invoice_number.trim()
  ) {
    return newData.invoice_number;
  }

  if (
    typeof oldData.invoice_number === 'string' &&
    oldData.invoice_number.trim()
  ) {
    return oldData.invoice_number;
  }

  const data = log.new_data ?? log.old_data ?? {};

  if (typeof data.description === 'string' && data.description.trim()) {
    return data.description;
  }

  if (typeof data.name === 'string' && data.name.trim()) {
    return data.name;
  }

  if (log.entity_id) {
    return `ID ${log.entity_id.slice(0, 8)}…`;
  }

  return 'Workspace record';
}

function getActivityDetails(log: AuditLog, invoices: InvoiceWithStats[]) {
  const oldData = log.old_data ?? {};
  const newData = log.new_data ?? {};

  const ignoredFields = new Set([
    'id',
    'business_id',
    'customer_id',
    'invoice_id',
    'created_at',
    'updated_at',
    'user_id',
  ]);

  const fields = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)]),
  ).filter((field) => !ignoredFields.has(field));

  const changes: {
    field: string;
    before: string;
    after: string;
  }[] = [];

  for (const field of fields) {
    const before = oldData[field];
    const after = newData[field];

    if (
      JSON.stringify(before) === JSON.stringify(after) ||
      (before === undefined && after === undefined)
    ) {
      continue;
    }

    changes.push({
      field,
      before: getAuditValue(before, field, invoices),
      after: getAuditValue(after, field, invoices),
    });
  }

  if (log.action === 'created') {
    const data = log.new_data ?? {};

    const usefulFields = [
      'description',
      'quantity',
      'unit_price',
      'price',
      'subtotal',
      'total',
      'amount_due',
      'status',
    ];

    return usefulFields
      .filter((field) => data[field] !== undefined)
      .slice(0, 2)
      .map((field) => ({
        field,
        before: '',
        after: getAuditValue(data[field], field, invoices),
      }));
  }

  if (log.action === 'deleted') {
    const data = log.old_data ?? {};

    return ['description', 'quantity', 'unit_price', 'price', 'total', 'status']
      .filter((field) => data[field] !== undefined)
      .slice(0, 2)
      .map((field) => ({
        field,
        before: getAuditValue(data[field], field, invoices),
        after: '',
      }));
  }

  return changes.slice(0, 3);
}

function formatActivityField(field: string) {
  return field
    .replace(/\_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { business } = await getCurrentBusiness();

  if (!business) {
    redirect('/login');
  }

  const [invoicesResult, customersResult, teamResult, auditResult] =
    await Promise.all([
      supabase
        .from('invoices')
        .select(
          `
          id,
          invoice_number,
          invoice_date,
          due_date,
          subtotal,
          tax_amount,
          total,
          amount_paid,
          amount_due,
          status,
          customer_id,
          customers (
            name
          )
        `,
        )
        .eq('business_id', business.id)
        .order('created_at', { ascending: false }),

      supabase
        .from('customers')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business.id),

      supabase.rpc('get_business_members', {
        p_business_id: business.id,
      }),

      supabase
        .from('audit_logs')
        .select(
          `
          id,
          action,
          entity_type,
          entity_id,
          created_at,
          old_data,
          new_data
        `,
        )
        .eq('business_id', business.id)
        .order('created_at', { ascending: false })
        .limit(6),
    ]);

  const invoices = (invoicesResult.data ?? []) as InvoiceRow[];

  const customersCount = customersResult.count ?? 0;

  const teamMembers = (teamResult.data ?? []) as TeamMember[];

  const recentActivity = (auditResult.data ?? []) as AuditLog[];

  const invoiceStats: InvoiceWithStats[] = invoices.map((invoice) => {
    const total = Number(invoice.total ?? 0);

    const amountPaid = Number(invoice.amount_paid ?? 0);

    const amountDue = Math.max(
      Number(invoice.amount_due ?? total - amountPaid),
      0,
    );

    return {
      ...invoice,
      calculatedStatus: getInvoiceStatus(invoice),
      calculatedAmountDue: amountDue,
    };
  });

  const dashboardStats = invoiceStats.reduce<DashboardStats>(
    (stats, invoice) => {
      const total = Number(invoice.total ?? 0);
      const amountPaid = Number(invoice.amount_paid ?? 0);
      const amountDue = invoice.calculatedAmountDue;
      const status = invoice.calculatedStatus;

      return {
        totalBilled: stats.totalBilled + total,
        totalReceived: stats.totalReceived + amountPaid,
        outstanding: stats.outstanding + amountDue,
        overdue: stats.overdue + (status === 'overdue' ? amountDue : 0),

        paidCount: stats.paidCount + (status === 'paid' ? 1 : 0),

        partiallyPaidCount:
          stats.partiallyPaidCount + (status === 'partially_paid' ? 1 : 0),

        unpaidCount: stats.unpaidCount + (status === 'unpaid' ? 1 : 0),

        overdueCount: stats.overdueCount + (status === 'overdue' ? 1 : 0),
      };
    },
    {
      totalBilled: 0,
      totalReceived: 0,
      outstanding: 0,
      overdue: 0,
      paidCount: 0,
      partiallyPaidCount: 0,
      unpaidCount: 0,
      overdueCount: 0,
    },
  );

  const {
    totalBilled,
    totalReceived,
    outstanding,
    overdue,
    paidCount,
    partiallyPaidCount,
    unpaidCount,
    overdueCount,
  } = dashboardStats;

  const recentInvoices = invoiceStats.slice(0, 6);

  const attentionInvoices = invoiceStats
    .filter(
      (invoice) =>
        invoice.calculatedStatus === 'overdue' ||
        invoice.calculatedStatus === 'partially_paid' ||
        invoice.calculatedStatus === 'unpaid',
    )
    .slice(0, 5);

  // Only show three activities on the dashboard.
  // The complete history remains available from Activity Log.
  const displayedRecentActivity = recentActivity.slice(0, 3);

  const collectionRate =
    totalBilled > 0
      ? Math.min(Math.round((totalReceived / totalBilled) * 100), 100)
      : 0;

  const businessName =
    business.business_name || business.name || 'Business Workspace';

  const handleLogout = async () => {
    'use server';

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============================================================
          STICKY SIDEBAR
      ============================================================ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">
          {/* Business Header */}
          <div className="flex h-20 items-center border-b border-slate-100 px-5">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                <ReceiptText className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {businessName}
                </p>

                <p className="text-xs text-slate-500">Business Workspace</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-900"
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            <Link
              href="/invoices"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText className="h-4 w-4" />
              Invoices
            </Link>

            <Link
              href="/customers"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="h-4 w-4" />
              Customers
            </Link>

            <Link
              href="/team"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="h-4 w-4" />
              Team
            </Link>

            <Link
              href="/audit-log"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Activity className="h-4 w-4" />
              Activity Log
            </Link>

            <div className="my-5 border-t border-slate-100" />

            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Account
            </p>

            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <UserCircle className="h-4 w-4" />
              Profile & Security
            </Link>

            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="h-4 w-4" />
              Business Settings
            </Link>
          </nav>

          {/* Account */}
          <div className="border-t border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                <UserCircle className="h-5 w-5 text-slate-500" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {user.user_metadata?.full_name ||
                    user.user_metadata?.name ||
                    'Account'}
                </p>

                <p className="truncate text-xs text-slate-500">{user.email}</p>
              </div>
            </div>

            <form action={handleLogout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN
      ============================================================ */}
      <main className="lg:ml-64">
        {/* ==========================================================
            STICKY HEADER
        ========================================================== */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-23 items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-500">Welcome back</p>

              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">
                Business Dashboard
              </h1>

              <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                Keep track of invoices, customers, payments and your team.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/settings"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:px-4"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </Link>

              <Link
                href="/invoices/new"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-medium text-white transition hover:bg-slate-800 sm:px-4"
              >
                <Plus className="h-4 w-4" />
                <span>New Invoice</span>
              </Link>
            </div>
          </div>
        </header>

        {/* ==========================================================
            CONTENT
        ========================================================== */}
        <div className="px-5 py-6 pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-6">
          {/* Financial Overview */}
          <section>
            <div className="mb-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Financial Overview
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                A quick view of your business finances.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Total Billed */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Billed
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-600">
                      {formatCurrency(totalBilled)}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Across {invoices.length} invoice
                  {invoices.length === 1 ? '' : 's'}
                </p>
              </div>

              {/* Total Received */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Total Received
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-tight text-emerald-600">
                      {formatCurrency(totalReceived)}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  Payments collected
                </p>
              </div>

              {/* Outstanding */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Outstanding
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-tight text-amber-600">
                      {formatCurrency(outstanding)}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-amber-600">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">Awaiting payment</p>
              </div>

              {/* Overdue */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      Overdue
                    </p>

                    <p className="mt-2 text-2xl font-semibold tracking-tight text-red-600">
                      {formatCurrency(overdue)}
                    </p>
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-500">
                  {overdueCount} overdue invoice
                  {overdueCount === 1 ? '' : 's'}
                </p>
              </div>
            </div>
          </section>

          {/* Secondary Stats */}
          <section className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Paid Invoices
                    </p>

                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {paidCount}
                    </p>
                  </div>

                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Partially Paid Invoices
                    </p>

                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {partiallyPaidCount}
                    </p>
                  </div>

                  <Wallet className="h-5 w-5 text-amber-500" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Unpaid Invoices
                    </p>

                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {unpaidCount}
                    </p>
                  </div>

                  <ReceiptText className="h-5 w-5 text-slate-400" />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Customers
                    </p>

                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      {customersCount}
                    </p>
                  </div>

                  <Users className="h-5 w-5 text-blue-500" />
                </div>
              </div>
            </div>
          </section>

          {/* ========================================================
              MAIN DASHBOARD GRID
          ======================================================== */}
          <div className="mt-6 grid gap-6 xl:grid-cols-3">
            {/* Recent Invoices */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Recent Invoices
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Your latest invoice activity
                  </p>
                </div>

                <Link
                  href="/invoices"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {recentInvoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                    <FileText className="h-6 w-6 text-slate-400" />
                  </div>

                  <h3 className="mt-4 text-sm font-semibold text-slate-900">
                    No invoices yet
                  </h3>

                  <p className="mt-1 max-w-sm text-sm text-slate-500">
                    Create your first invoice to start tracking your business
                    finances.
                  </p>

                  <Link
                    href="/invoices/new"
                    className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    <Plus className="h-4 w-4" />
                    Create Invoice
                  </Link>
                </div>
              ) : (
                <>
                  {/* Desktop Invoice Table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/70">
                          <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Invoice
                          </th>

                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Customer
                          </th>

                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Date
                          </th>

                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Due
                          </th>

                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Amount
                          </th>

                          <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Status
                          </th>

                          <th className="w-10 px-3 py-3" />
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {recentInvoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className="group transition hover:bg-slate-50"
                          >
                            <td className="px-5 py-4">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="flex items-center gap-3"
                              >
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                                  <ReceiptText className="h-4 w-4 text-slate-500" />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900">
                                    {invoice.invoice_number}
                                  </p>

                                  <p className="mt-0.5 text-xs text-slate-400">
                                    Invoice
                                  </p>
                                </div>
                              </Link>
                            </td>

                            <td className="px-4 py-4">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="block max-w-37.5 truncate text-sm font-medium text-slate-700 hover:text-slate-900"
                              >
                                {getCustomerName(invoice)}
                              </Link>
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                              {formatDate(invoice.invoice_date)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">
                              {formatDate(invoice.due_date)}
                            </td>

                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="text-sm font-semibold text-slate-900">
                                {formatCurrency(Number(invoice.total ?? 0))}
                              </p>

                              {invoice.calculatedAmountDue > 0 && (
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                  {formatCurrency(invoice.calculatedAmountDue)}{' '}
                                  due
                                </p>
                              )}
                            </td>

                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${getStatusClasses(
                                  invoice.calculatedStatus,
                                )}`}
                              >
                                {getStatusLabel(invoice.calculatedStatus)}
                              </span>
                            </td>

                            <td className="px-3 py-4">
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition group-hover:bg-white group-hover:text-slate-500"
                                aria-label={`Open ${invoice.invoice_number}`}
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Invoice Cards */}
                  <div className="divide-y divide-slate-100 md:hidden">
                    {recentInvoices.map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="block px-5 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                              <ReceiptText className="h-4 w-4 text-slate-500" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {invoice.invoice_number}
                              </p>

                              <p className="mt-0.5 truncate text-xs text-slate-500">
                                {getCustomerName(invoice)}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${getStatusClasses(
                              invoice.calculatedStatus,
                            )}`}
                          >
                            {getStatusLabel(invoice.calculatedStatus)}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Date
                            </p>

                            <p className="mt-1 text-xs font-medium text-slate-700">
                              {formatDate(invoice.invoice_date)}
                            </p>
                          </div>

                          <div>
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Due
                            </p>

                            <p className="mt-1 text-xs font-medium text-slate-700">
                              {formatDate(invoice.due_date)}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                              Amount
                            </p>

                            <p className="mt-1 text-sm font-semibold text-slate-900">
                              {formatCurrency(Number(invoice.total ?? 0))}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </section>

            {/* Attention Needed */}
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Attention Needed
                    </h2>

                    <p className="mt-0.5 text-xs text-slate-500">
                      Invoices that need follow-up
                    </p>
                  </div>

                  {attentionInvoices.length > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                      {attentionInvoices.length}
                    </span>
                  )}
                </div>
              </div>

              {attentionInvoices.length === 0 ? (
                <div className="flex flex-col items-center px-5 py-12 text-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-900">
                    Everything looks good
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    There are no invoices currently requiring your attention.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {attentionInvoices.map((invoice) => (
                    <Link
                      key={invoice.id}
                      href={`/invoices/${invoice.id}`}
                      className="block px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900">
                            {invoice.invoice_number}
                          </p>

                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {getCustomerName(invoice)}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ring-1 ring-inset ${getStatusClasses(
                            invoice.calculatedStatus,
                          )}`}
                        >
                          {getStatusLabel(invoice.calculatedStatus)}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Amount due
                        </span>

                        <span className="text-sm font-semibold text-slate-900">
                          {formatCurrency(invoice.calculatedAmountDue)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* ========================================================
              BOTTOM GRID
          ======================================================== */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            {/* ======================================================
                RECENT ACTIVITY
            ====================================================== */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Recent Activity
                  </h2>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Latest changes in your workspace
                  </p>
                </div>

                <Link
                  href="/audit-log"
                  className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition hover:text-slate-900"
                >
                  View log
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              {displayedRecentActivity.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-50">
                    <Activity className="h-5 w-5 text-slate-300" />
                  </div>

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No recent activity
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Changes to invoices and items will appear here.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {displayedRecentActivity.map((log, index) => {
                    const invoice = getInvoiceFromAudit(log, invoiceStats);

                    const subject = getActivitySubject(log, invoiceStats);

                    const details = getActivityDetails(log, invoiceStats);

                    return (
                      <div
                        key={log.id}
                        className="group relative px-5 py-4 transition hover:bg-slate-50/60"
                      >
                        <div className="flex items-start gap-3.5">
                          {/* Timeline */}
                          <div className="relative shrink-0">
                            <div
                              className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-lg ${getActivityIconClasses(
                                log,
                              )}`}
                            >
                              {getActivityIcon(log)}
                            </div>

                            {index < displayedRecentActivity.length - 1 && (
                              <div className="absolute left-1/2 top-9 h-[calc(100%+1rem)] w-px -translate-x-1/2 bg-slate-100" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-slate-900">
                                    {getActivityText(log)}
                                  </p>

                                  <span
                                    className={`rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${getActivityActionClasses(
                                      log,
                                    )}`}
                                  >
                                    {log.action}
                                  </span>
                                </div>

                                <p className="mt-1 truncate text-xs text-slate-500">
                                  {subject}
                                </p>
                              </div>

                              <span className="shrink-0 text-[11px] text-slate-400">
                                {formatRelativeTime(log.created_at)}
                              </span>
                            </div>

                            {invoice && (
                              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                <span>
                                  Customer{' '}
                                  <span className="font-medium text-slate-600">
                                    {getCustomerName(invoice)}
                                  </span>
                                </span>

                                <span>
                                  Invoice{' '}
                                  <span className="font-medium text-slate-600">
                                    {invoice.invoice_number}
                                  </span>
                                </span>
                              </div>
                            )}

                            {details.length > 0 && (
                              <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 bg-slate-50/80">
                                {details.map((detail, detailIndex) => (
                                  <div
                                    key={`${log.id}-${detail.field}-${detailIndex}`}
                                    className="flex flex-col gap-1.5 border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                  >
                                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                      {formatActivityField(detail.field)}
                                    </span>

                                    <div className="flex min-w-0 items-center gap-2 text-xs">
                                      {detail.before && (
                                        <span className="max-w-30 truncate text-slate-400">
                                          {detail.before}
                                        </span>
                                      )}

                                      {detail.before && detail.after && (
                                        <ArrowRight className="h-3 w-3 shrink-0 text-slate-300" />
                                      )}

                                      {detail.after && (
                                        <span className="max-w-40 truncate font-medium text-slate-700">
                                          {detail.after}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {log.entity_type === 'invoice' && invoice && (
                              <Link
                                href={`/invoices/${invoice.id}`}
                                className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 transition hover:text-slate-900"
                              >
                                Open invoice
                                <ArrowRight className="h-3 w-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Activity footer */}
              {recentActivity.length > 3 && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
                  <Link
                    href="/audit-log"
                    className="flex items-center justify-between text-xs font-medium text-slate-600 transition hover:text-slate-900"
                  >
                    <span>
                      Showing 3 of {recentActivity.length} recent changes
                    </span>

                    <span className="inline-flex items-center gap-1">
                      See full activity
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                </div>
              )}
            </section>

            {/* ======================================================
                BUSINESS OVERVIEW
            ====================================================== */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        Business Overview
                      </h2>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {businessName}
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/settings"
                    className="shrink-0 text-xs font-medium text-slate-500 transition hover:text-slate-900"
                  >
                    Manage
                  </Link>
                </div>
              </div>

              {/* Business Metrics */}
              <div className="grid grid-cols-2 border-b border-slate-100">
                <div className="border-r border-slate-100 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Customers
                  </p>

                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                    {customersCount}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Active records
                  </p>
                </div>

                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Team
                  </p>

                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                    {teamMembers.length}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Workspace member
                    {teamMembers.length === 1 ? '' : 's'}
                  </p>
                </div>

                <div className="border-r border-t border-slate-100 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Invoices
                  </p>

                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                    {invoices.length}
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">Created</p>
                </div>

                <div className="border-t border-slate-100 px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Collection
                  </p>

                  <p className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
                    {collectionRate}%
                  </p>

                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Of total billed
                  </p>
                </div>
              </div>

              {/* Collection Progress */}
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-700">
                      Collection progress
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {formatCurrency(totalReceived)} collected
                    </p>
                  </div>

                  <span className="text-xs font-semibold text-slate-700">
                    {collectionRate}%
                  </span>
                </div>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all"
                    style={{
                      width: `${collectionRate}%`,
                    }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Received</span>
                  <span>{formatCurrency(outstanding)} outstanding</span>
                </div>
              </div>

              {/* Quick Links */}
              <div className="divide-y divide-slate-100">
                <Link
                  href="/team"
                  className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Users className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Team
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Manage workspace members
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>

                <Link
                  href="/profile"
                  className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <ShieldCheck className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Profile & Security
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Manage account access
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>

                <Link
                  href="/settings"
                  className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Settings className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Business Settings
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Update business information
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>

                <Link
                  href="/audit-log"
                  className="group flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                      <Activity className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        Activity Log
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Review all workspace changes
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
}
