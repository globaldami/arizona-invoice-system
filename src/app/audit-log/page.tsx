import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/business';
import { redirect } from 'next/navigation';
import AuditLogList from './AuditLogList';

export default async function AuditLogPage() {
  const supabase = await createClient();

  const { business, user, error } = await getCurrentBusiness();

  if (error || !user) {
    redirect('/login');
  }

  if (!business) {
    redirect('/dashboard');
  }

  const [
    { data: auditLogs, error: auditError },
    { data: members, error: membersError },
    { data: membership, error: membershipError },
  ] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false }),

    supabase.rpc('get_business_members', {
      p_business_id: business.id,
    }),

    supabase
      .from('business_members')
      .select('role')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  if (auditError) {
    console.error('Audit log error:', auditError);
  }

  if (membersError) {
    console.error('Members error:', membersError);
  }

  if (membershipError) {
    console.error('Membership error:', membershipError);
  }

  /*
   * Only owners and admins can restore deleted invoices.
   *
   * The database RPC also enforces this permission, so this
   * is only controlling what the UI displays.
   */
  const canRestore = ['owner', 'admin'].includes(membership?.role ?? '');

  const logs = auditLogs ?? [];

  /*
   * Resolve invoice numbers for invoice audit records.
   */
  const invoiceIds = [
    ...new Set(
      logs
        .filter(
          (log) =>
            log.entity_type === 'invoice' && typeof log.entity_id === 'string',
        )
        .map((log) => log.entity_id as string),
    ),
  ];

  /*
   * Resolve invoice IDs for invoice-item audit records.
   */
  const itemIds = [
    ...new Set(
      logs
        .filter(
          (log) =>
            log.entity_type === 'invoice_item' &&
            typeof log.entity_id === 'string',
        )
        .map((log) => log.entity_id as string),
    ),
  ];

  const invoiceNumberMap: Record<string, string> = {};
  const itemInvoiceMap: Record<string, string> = {};

  /*
   * Resolve invoice numbers directly from invoices.
   *
   * This works for invoices that still exist.
   */
  if (invoiceIds.length > 0) {
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number')
      .eq('business_id', business.id)
      .in('id', invoiceIds);

    if (invoicesError) {
      console.error('Invoice lookup error:', invoicesError);
    } else {
      for (const invoice of invoices ?? []) {
        invoiceNumberMap[invoice.id] = invoice.invoice_number;
      }
    }
  }

  /*
   * Resolve invoice numbers for invoice-item audit records.
   *
   * Deleted invoice items may no longer exist, so in those cases
   * AuditLogList can fall back to invoice information stored in
   * old_data by the delete audit trigger.
   */
  if (itemIds.length > 0) {
    const { data: items, error: itemsError } = await supabase
      .from('invoice_items')
      .select('id, invoice_id')
      .in('id', itemIds);

    if (itemsError) {
      console.error('Invoice item lookup error:', itemsError);
    } else {
      const parentInvoiceIds = [
        ...new Set((items ?? []).map((item) => item.invoice_id)),
      ];

      if (parentInvoiceIds.length > 0) {
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, invoice_number')
          .eq('business_id', business.id)
          .in('id', parentInvoiceIds);

        if (invoicesError) {
          console.error('Invoice lookup for items error:', invoicesError);
        } else {
          const numbersById: Record<string, string> = {};

          for (const invoice of invoices ?? []) {
            numbersById[invoice.id] = invoice.invoice_number;
          }

          for (const item of items ?? []) {
            const invoiceNumber = numbersById[item.invoice_id];

            if (invoiceNumber) {
              itemInvoiceMap[item.id] = invoiceNumber;
            }
          }
        }
      }
    }
  }

  /*
   * Enrich audit logs with a resolved invoice number.
   *
   * For deleted invoices, the invoice no longer exists in the
   * invoices table. AuditLogList handles that case by reading
   * invoice_number from old_data.
   */
  const enrichedAuditLogs = logs.map((log) => ({
    ...log,
    resolved_invoice_number:
      log.entity_type === 'invoice'
        ? log.entity_id
          ? (invoiceNumberMap[log.entity_id] ?? null)
          : null
        : log.entity_type === 'invoice_item'
          ? log.entity_id
            ? (itemInvoiceMap[log.entity_id] ?? null)
            : null
          : null,
  }));

  return (
    <AuditLogList
      auditLogs={enrichedAuditLogs}
      members={members ?? []}
      businessName={business.business_name}
      canRestore={canRestore}
    />
  );
}
