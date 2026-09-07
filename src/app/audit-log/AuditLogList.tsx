'use client';

import { useEffect, useMemo, useState } from 'react';
import MobileBottomNav from '@/components/MobileBottomNav';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowUp,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Filter,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type AuditLog = {
  id: string;
  business_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
  resolved_invoice_number: string | null;
};

type Member = {
  id: string;
  business_id: string;
  user_id: string;
  role: string;
  created_at: string;
  email: string | null;
  full_name: string | null;
};

type ActivityLog = {
  id: string;
  action: string;
  user_id: string | null;
  created_at: string;
  resolved_invoice_number: string | null;
  logs: AuditLog[];
};

type Props = {
  auditLogs: AuditLog[];
  members: Member[];
  businessName: string;
  canRestore: boolean;
};

type CustomerRecord = {
  id: string;
  [key: string]: unknown;
};

const fieldLabels: Record<string, string> = {
  id: 'ID',
  invoice_number: 'Invoice Number',
  invoice_date: 'Invoice Date',
  due_date: 'Due Date',
  account_reference: 'Account Reference',
  payment_method: 'Payment Method',
  subtotal: 'Subtotal',
  tax_rate: 'Tax Rate',
  tax_amount: 'Tax Amount',
  discount: 'Discount',
  total: 'Total',
  amount_paid: 'Amount Paid',
  amount_due: 'Amount Due',
  status: 'Status',
  notes: 'Notes',
  terms: 'Terms',
  customer_id: 'Customer',
  business_id: 'Business',
  created_by: 'Created By',
  created_at: 'Created At',
  updated_at: 'Updated At',
  description: 'Description',
  quantity: 'Quantity',
  unit_price: 'Unit Price',
  invoice_id: 'Invoice',
  items: 'Items',
};

const currencyFields = new Set([
  'subtotal',
  'tax_amount',
  'discount',
  'total',
  'amount_paid',
  'amount_due',
  'unit_price',
  'price',
]);

function getDisplayLabel(field: string) {
  if (fieldLabels[field]) {
    return fieldLabels[field];
  }

  return field
    .replace(/\_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatCurrency(value: unknown) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value ?? '—');
  }

  return `₦${number.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateValue(value: unknown) {
  if (!value) {
    return '—';
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatValue(value: unknown, field: string) {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (currencyFields.has(field)) {
    return formatCurrency(value);
  }

  if (field === 'invoice_date' || field === 'due_date') {
    return formatDateValue(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return `${value.length} item${value.length === 1 ? '' : 's'}`;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
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
    case 'restored':
      return `Restored ${entity.toLowerCase()}`;
    default:
      return `${log.action} ${entity.toLowerCase()}`;
  }
}

function getUserName(userId: string | null, members: Member[]) {
  if (!userId) {
    return 'System';
  }

  const member = members.find((item) => item.user_id === userId);

  if (!member) {
    return 'Unknown user';
  }

  return member.full_name || member.email || 'Unknown user';
}

function getInvoiceNumber(log: AuditLog) {
  if (log.resolved_invoice_number) {
    return log.resolved_invoice_number;
  }

  const possibleSources = [log.old_data, log.new_data];

  for (const source of possibleSources) {
    const invoiceNumber = source?.invoice_number;

    if (typeof invoiceNumber === 'string' && invoiceNumber.trim()) {
      return invoiceNumber;
    }
  }

  return null;
}

function getCustomerId(log: AuditLog) {
  const sources = [log.old_data, log.new_data];

  for (const source of sources) {
    const customerId = source?.customer_id;

    if (typeof customerId === 'string' && customerId.trim()) {
      return customerId;
    }
  }

  return null;
}

function getCustomerName(
  customerId: string | null,
  customers: Record<string, CustomerRecord>,
) {
  if (!customerId) {
    return '—';
  }

  const customer = customers[customerId];

  if (!customer) {
    return 'Customer';
  }

  const possibleNames = [
    customer.name,
    customer.customer_name,
    customer.full_name,
    customer.company_name,
    customer.business_name,
    customer.display_name,
  ];

  for (const name of possibleNames) {
    if (typeof name === 'string' && name.trim()) {
      return name;
    }
  }

  return 'Customer';
}

function getActivityLogs(auditLogs: AuditLog[]) {
  return auditLogs.map(
    (log): ActivityLog => ({
      id: log.id,
      action: log.action,
      user_id: log.user_id,
      created_at: log.created_at,
      resolved_invoice_number: getInvoiceNumber(log),
      logs: [log],
    }),
  );
}

function getChanges(activity: ActivityLog) {
  const log = activity.logs[0];

  if (!log) {
    return [];
  }

  const oldData = log.old_data ?? {};
  const newData = log.new_data ?? {};

  const fields = Array.from(
    new Set([...Object.keys(oldData), ...Object.keys(newData)]),
  ).filter(
    (field) =>
      field !== 'items' &&
      field !== 'id' &&
      field !== 'business_id' &&
      field !== 'created_by' &&
      field !== 'created_at' &&
      field !== 'updated_at',
  );

  return fields
    .filter(
      (field) =>
        JSON.stringify(oldData[field]) !== JSON.stringify(newData[field]),
    )
    .map((field) => ({
      field,
      before: formatValue(oldData[field], field),
      after: formatValue(newData[field], field),
    }));
}

function getDeletedItemChanges(activity: ActivityLog) {
  const log = activity.logs.find((item) => item.entity_type === 'invoice_item');

  if (!log) {
    return [];
  }

  const data = log.old_data ?? {};

  return ['description', 'quantity', 'unit_price', 'total']
    .filter((field) => data[field] !== undefined)
    .map((field) => ({
      field,
      before: formatValue(data[field], field),
      after: '',
    }));
}

function getDeletedInvoiceDetails(activity: ActivityLog) {
  const log = activity.logs.find((item) => item.entity_type === 'invoice');

  if (!log) {
    return [];
  }

  const data = log.old_data ?? {};

  const fields = [
    'invoice_number',
    'invoice_date',
    'due_date',
    'payment_method',
    'account_reference',
    'subtotal',
    'tax_rate',
    'tax_amount',
    'discount',
    'total',
    'amount_paid',
    'amount_due',
    'status',
    'notes',
    'terms',
  ];

  return fields
    .filter((field) => data[field] !== undefined)
    .map((field) => ({
      field,
      value: formatValue(data[field], field),
    }));
}

function getRestoredAuditIds(auditLogs: AuditLog[]) {
  const ids = new Set<string>();

  for (const log of auditLogs) {
    if (log.action !== 'restored') {
      continue;
    }

    const restoredFrom = log.new_data?.restored_from_audit_log_id;

    if (typeof restoredFrom === 'string' && restoredFrom) {
      ids.add(restoredFrom);
    }
  }

  return ids;
}

function isDeletedInvoiceActivity(activity: ActivityLog) {
  return (
    activity.action === 'deleted' &&
    activity.logs.some((log) => log.entity_type === 'invoice')
  );
}

function isDeletedItemActivity(activity: ActivityLog) {
  return (
    activity.action === 'deleted' &&
    activity.logs.some((log) => log.entity_type === 'invoice_item')
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    created: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    updated: 'border-blue-200 bg-blue-50 text-blue-700',
    deleted: 'border-red-200 bg-red-50 text-red-700',
    restored: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  };

  const labels: Record<string, string> = {
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    restored: 'Restored',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
        styles[action] ?? 'border-slate-200 bg-slate-50 text-slate-600'
      }`}
    >
      {labels[action] ?? action}
    </span>
  );
}

function ActionIcon({ action }: { action: string }) {
  if (action === 'created') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
        <Plus className="h-4 w-4" />
      </div>
    );
  }

  if (action === 'updated') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-blue-100 bg-blue-50 text-blue-600">
        <Pencil className="h-4 w-4" />
      </div>
    );
  }

  if (action === 'deleted') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600">
        <Trash2 className="h-4 w-4" />
      </div>
    );
  }

  if (action === 'restored') {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50 text-emerald-600">
        <RotateCcw className="h-4 w-4" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-500">
      <Activity className="h-4 w-4" />
    </div>
  );
}

export default function AuditLogList({
  auditLogs,
  members,
  businessName,
  canRestore,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [expandedActivities, setExpandedActivities] = useState<Set<string>>(
    new Set(),
  );

  const [restoreActivity, setRestoreActivity] = useState<ActivityLog | null>(
    null,
  );

  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [restoredIds, setRestoredIds] = useState<Set<string>>(new Set());

  const [customers, setCustomers] = useState<Record<string, CustomerRecord>>(
    {},
  );

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 100; // 100px threshold before actual bottom

      setShowScrollTop(scrolledToBottom);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // check on mount in case page is short

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const customerIds = useMemo(() => {
    const ids = new Set<string>();

    for (const log of auditLogs) {
      const oldCustomerId = log.old_data?.customer_id;
      const newCustomerId = log.new_data?.customer_id;

      if (typeof oldCustomerId === 'string' && oldCustomerId) {
        ids.add(oldCustomerId);
      }

      if (typeof newCustomerId === 'string' && newCustomerId) {
        ids.add(newCustomerId);
      }
    }

    return Array.from(ids);
  }, [auditLogs]);

  useEffect(() => {
    let cancelled = false;

    async function loadCustomers() {
      if (customerIds.length === 0) {
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .in('id', customerIds);

      if (error) {
        console.error('Customer lookup error:', error);
        return;
      }

      if (cancelled) {
        return;
      }

      const map: Record<string, CustomerRecord> = {};

      for (const customer of data ?? []) {
        if (customer && typeof customer.id === 'string') {
          map[customer.id] = customer as CustomerRecord;
        }
      }

      setCustomers(map);
    }

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [customerIds, supabase]);

  const activities = useMemo(() => getActivityLogs(auditLogs), [auditLogs]);

  const restoredAuditIds = useMemo(() => {
    const ids = getRestoredAuditIds(auditLogs);

    for (const id of restoredIds) {
      ids.add(id);
    }

    return ids;
  }, [auditLogs, restoredIds]);

  const filteredActivities = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return activities.filter((activity) => {
      if (actionFilter !== 'all' && activity.action !== actionFilter) {
        return false;
      }

      if (userFilter !== 'all' && activity.user_id !== userFilter) {
        return false;
      }

      if (!search) {
        return true;
      }

      const invoiceNumber =
        activity.resolved_invoice_number ??
        activity.logs.map((log) => getInvoiceNumber(log)).find(Boolean) ??
        '';

      const userName = getUserName(activity.user_id, members);

      const searchableText = [
        invoiceNumber,
        userName,
        ...activity.logs.flatMap((log) => [
          log.entity_type,
          log.old_data?.description,
          log.new_data?.description,
          log.old_data?.invoice_number,
          log.new_data?.invoice_number,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [activities, actionFilter, userFilter, searchTerm, members]);

  const toggleExpanded = (id: string) => {
    setExpandedActivities((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const openRestore = (activity: ActivityLog) => {
    setRestoreError('');
    setRestoreActivity(activity);
  };

  const closeRestore = () => {
    if (restoreLoading) {
      return;
    }

    setRestoreActivity(null);
    setRestoreError('');
  };

  const handleRestore = async () => {
    if (!restoreActivity) {
      return;
    }

    setRestoreLoading(true);
    setRestoreError('');

    const { error } = await supabase.rpc('restore_deleted_invoice', {
      p_audit_log_id: restoreActivity.id,
    });

    if (error) {
      console.error('Restore invoice error:', error);

      setRestoreError(error.message || 'Unable to restore this invoice.');

      setRestoreLoading(false);
      return;
    }

    setRestoredIds((current) => {
      const next = new Set(current);
      next.add(restoreActivity.id);
      return next;
    });

    setRestoreActivity(null);
    setRestoreLoading(false);

    const invoiceNumber =
      restoreActivity.resolved_invoice_number ??
      getInvoiceNumber(restoreActivity.logs[0]) ??
      'invoice';

    setSuccessMessage(`Invoice ${invoiceNumber} was successfully restored.`);

    router.refresh();

    window.setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

  const actionCounts = useMemo(() => {
    return {
      all: activities.length,
      created: activities.filter((item) => item.action === 'created').length,
      updated: activities.filter((item) => item.action === 'updated').length,
      deleted: activities.filter((item) => item.action === 'deleted').length,
      restored: activities.filter((item) => item.action === 'restored').length,
    };
  }, [activities]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-6">
        {/* Page Header */}
        <div className="mb-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Link
                  href="/dashboard"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Back to Dashboard"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                      Activity Log
                    </h1>
                  </div>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    Track activity and changes across {businessName}.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-3 text-sm text-slate-500 sm:border-t-0 sm:pt-0">
                <Activity className="h-4 w-4 shrink-0" />
                <span>
                  {activities.length} activit
                  {activities.length === 1 ? 'y' : 'ies'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />

            <span className="flex-1">{successMessage}</span>

            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="rounded-md p-1 text-emerald-700 transition hover:bg-emerald-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search invoice or user..."
                className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Action filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 shrink-0 text-slate-400" />

              <select
                value={actionFilter}
                onChange={(event) => setActionFilter(event.target.value)}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              >
                <option value="all">All activity ({actionCounts.all})</option>

                <option value="created">
                  Created ({actionCounts.created})
                </option>

                <option value="updated">
                  Updated ({actionCounts.updated})
                </option>

                <option value="deleted">
                  Deleted ({actionCounts.deleted})
                </option>

                <option value="restored">
                  Restored ({actionCounts.restored})
                </option>
              </select>
            </div>

            {/* User filter */}
            <select
              value={userFilter}
              onChange={(event) => setUserFilter(event.target.value)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
            >
              <option value="all">All users</option>

              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.full_name || member.email || 'Unknown user'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity list */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {filteredActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Activity className="h-5 w-5" />
              </div>

              <h2 className="text-sm font-semibold text-slate-900">
                No activity found
              </h2>

              <p className="mt-1 max-w-sm text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredActivities.map((activity) => {
                const firstLog = activity.logs[0];

                const invoiceNumber =
                  activity.resolved_invoice_number ??
                  getInvoiceNumber(firstLog);

                const userName = getUserName(activity.user_id, members);

                const isExpanded = expandedActivities.has(activity.id);

                const deletedInvoice = isDeletedInvoiceActivity(activity);

                const deletedItem = isDeletedItemActivity(activity);

                const invoiceDetails = deletedInvoice
                  ? getDeletedInvoiceDetails(activity)
                  : [];

                const deletedItemChanges = deletedItem
                  ? getDeletedItemChanges(activity)
                  : [];

                const changes =
                  activity.action === 'updated' ? getChanges(activity) : [];

                const customerId = getCustomerId(firstLog);

                const customerName = getCustomerName(customerId, customers);

                const isRestored = restoredAuditIds.has(activity.id);

                const canShowRestore =
                  canRestore && deletedInvoice && !isRestored;

                let displayCount = 0;

                if (deletedInvoice) {
                  displayCount = invoiceDetails.length;
                } else if (deletedItem) {
                  displayCount = deletedItemChanges.length;
                } else {
                  displayCount = changes.length;
                }

                return (
                  <div key={activity.id} className="p-5 sm:p-6">
                    <div className="flex gap-4">
                      <ActionIcon
                        action={isRestored ? 'restored' : activity.action}
                      />

                      <div className="min-w-0 flex-1">
                        {/* Top row */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <ActionBadge
                                action={
                                  isRestored ? 'restored' : activity.action
                                }
                              />

                              <span className="text-sm font-medium text-slate-500">
                                {getActivityEntity(firstLog)}
                              </span>

                              {invoiceNumber && (
                                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                  {invoiceNumber}
                                </span>
                              )}
                            </div>

                            <div className="mt-2 text-sm font-medium text-slate-900">
                              {isRestored
                                ? 'Invoice restored'
                                : getActivityText(firstLog)}
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                              <span className="inline-flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                {activity.action === 'deleted'
                                  ? 'Deleted by'
                                  : activity.action === 'restored'
                                    ? 'Restored by'
                                    : 'By'}{' '}
                                <span className="font-medium text-slate-700">
                                  {userName}
                                </span>
                              </span>

                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 className="h-3.5 w-3.5" />

                                {formatDateTime(activity.created_at)}
                              </span>
                            </div>

                            {deletedInvoice && (
                              <p className="mt-3 text-sm text-slate-500">
                                {isRestored
                                  ? 'This invoice has been restored to the business.'
                                  : 'This invoice was completely deleted from the business.'}
                              </p>
                            )}

                            {deletedItem && (
                              <p className="mt-3 text-sm text-slate-500">
                                This invoice item was deleted.
                              </p>
                            )}
                          </div>

                          {/* Details button */}
                          {displayCount > 0 && (
                            <button
                              type="button"
                              onClick={() => toggleExpanded(activity.id)}
                              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              {deletedInvoice
                                ? 'View invoice details'
                                : `View ${displayCount} ${
                                    displayCount === 1 ? 'change' : 'changes'
                                  }`}

                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>

                        {/* Restore button */}
                        {canShowRestore && (
                          <button
                            type="button"
                            onClick={() => openRestore(activity)}
                            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore Invoice
                          </button>
                        )}

                        {/* Restored indicator */}
                        {deletedInvoice && isRestored && (
                          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Invoice restored
                          </div>
                        )}

                        {/* Expanded details */}
                        {isExpanded && displayCount > 0 && (
                          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
                            {deletedInvoice ? (
                              <div>
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-slate-500" />

                                    <h3 className="text-sm font-semibold text-slate-800">
                                      Deleted Invoice Information
                                    </h3>
                                  </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {invoiceDetails.map((detail) => (
                                    <div
                                      key={detail.field}
                                      className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:gap-6"
                                    >
                                      <div className="text-sm font-medium text-slate-600">
                                        {getDisplayLabel(detail.field)}
                                      </div>

                                      <div
                                        className={`text-sm ${
                                          detail.field === 'status'
                                            ? 'font-medium text-red-600'
                                            : 'text-slate-800'
                                        }`}
                                      >
                                        {detail.value}
                                      </div>
                                    </div>
                                  ))}

                                  {/* Customer */}
                                  {customerId && (
                                    <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:gap-6">
                                      <div className="text-sm font-medium text-slate-600">
                                        Customer
                                      </div>

                                      <div className="text-sm text-slate-800">
                                        {customerName}
                                      </div>
                                    </div>
                                  )}

                                  {/* Deleted status */}
                                  <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:gap-6">
                                    <div className="text-sm font-medium text-slate-600">
                                      Status
                                    </div>

                                    <div className="text-sm font-medium text-red-600">
                                      Deleted
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : deletedItem ? (
                              <div>
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-red-500" />

                                    <h3 className="text-sm font-semibold text-slate-800">
                                      Deleted Item Information
                                    </h3>
                                  </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {deletedItemChanges.map((change) => (
                                    <div
                                      key={change.field}
                                      className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:gap-6"
                                    >
                                      <div className="text-sm font-medium text-slate-600">
                                        {getDisplayLabel(change.field)}
                                      </div>

                                      <div className="text-sm text-slate-800">
                                        {change.before}
                                      </div>
                                    </div>
                                  ))}

                                  <div className="grid grid-cols-1 gap-2 px-4 py-3 sm:grid-cols-[minmax(180px,0.7fr)_1fr] sm:gap-6">
                                    <div className="text-sm font-medium text-slate-600">
                                      Status
                                    </div>

                                    <div className="text-sm font-medium text-red-600">
                                      Deleted
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                  <h3 className="text-sm font-semibold text-slate-800">
                                    Changes
                                  </h3>
                                </div>

                                <div className="hidden grid-cols-[minmax(180px,0.7fr)_1fr_1fr] border-b border-slate-200 bg-white text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
                                  <div className="px-4 py-3">Field</div>

                                  <div className="border-l border-slate-200 px-4 py-3">
                                    Before
                                  </div>

                                  <div className="border-l border-slate-200 px-4 py-3">
                                    After
                                  </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                  {changes.map((change) => (
                                    <div
                                      key={change.field}
                                      className="grid grid-cols-1 sm:grid-cols-[minmax(180px,0.7fr)_1fr_1fr]"
                                    >
                                      <div className="px-4 py-3 text-sm font-medium text-slate-600">
                                        {getDisplayLabel(change.field)}
                                      </div>

                                      <div className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500 sm:border-l sm:border-t-0">
                                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                          Before
                                        </span>

                                        {change.before}
                                      </div>

                                      <div className="border-t border-slate-100 px-4 py-3 text-sm font-medium text-slate-800 sm:border-l">
                                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400 sm:hidden">
                                          After
                                        </span>

                                        {change.after}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Customer preview for invoice activity */}
                        {!isExpanded &&
                          firstLog.entity_type === 'invoice' &&
                          customerId && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                              <User className="h-3.5 w-3.5" />

                              <span>
                                Customer:{' '}
                                <span className="font-medium text-slate-700">
                                  {customerName}
                                </span>
                              </span>
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Restore confirmation modal */}
      {restoreActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-invoice-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                  <RotateCcw className="h-5 w-5" />
                </div>

                <h2
                  id="restore-invoice-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  Restore invoice?
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {restoreActivity.resolved_invoice_number ??
                    getInvoiceNumber(restoreActivity.logs[0]) ??
                    'This invoice'}
                </p>
              </div>

              <button
                type="button"
                onClick={closeRestore}
                disabled={restoreLoading}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="text-sm leading-6 text-slate-600">
                This will recreate the invoice and all of its invoice items
                exactly as they were when it was deleted.
              </p>

              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Deleted
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-800">
                      {formatDateTime(restoreActivity.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              {restoreError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700">
                  {restoreError}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRestore}
                disabled={restoreLoading}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRestore}
                disabled={restoreLoading}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw className="h-4 w-4" />

                {restoreLoading ? 'Restoring...' : 'Restore Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-24 right-5 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 lg:bottom-6"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      )}

      <MobileBottomNav />
    </div>
  );
}
