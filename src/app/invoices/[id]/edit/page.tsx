'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type InvoiceItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type Customer = {
  id: string;
  name: string;
  company_name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type Invoice = {
  id: string;
  business_id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  account_reference: string | null;
  payment_method: string;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount: number | string;
  total: number | string;
  amount_paid: number | string;
  amount_due: number | string;
  status: string;
  notes: string | null;
  terms: string | null;
  customer: Customer | null;
  items: {
    id: string;
    description: string;
    quantity: number | string;
    unit_price: number | string;
    total: number | string;
  }[];
};

type InvoiceState = {
  businessId: string;
  invoiceDate: string;
  dueDate: string;
  accountReference: string;
  paymentMethod: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  customerAddress: string;
  customerPhone: string;
  customerEmail: string;
  items: InvoiceItem[];
  discount: number;
  taxRate: number;
  amountPaid: number;
  notes: string;
  terms: string;
};

const inputClass =
  'h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 2,
  }).format(value || 0);
}

/**
 * Normalize an invoice item for comparison.
 *
 * The database ID is intentionally ignored when comparing item content.
 */
function normalizeItems(items: InvoiceItem[]) {
  return items.map((item) => ({
    description: item.description.trim(),
    quantity: Number(item.quantity) || 0,
    unitPrice: Number(item.unitPrice) || 0,
  }));
}

/**
 * Compare invoice items by their actual content rather than their IDs.
 */
function itemsAreEqual(
  originalItems: InvoiceItem[],
  currentItems: InvoiceItem[],
) {
  const original = normalizeItems(originalItems);
  const current = normalizeItems(currentItems);

  if (original.length !== current.length) {
    return false;
  }

  return original.every((originalItem, index) => {
    const currentItem = current[index];

    return (
      originalItem.description === currentItem.description &&
      originalItem.quantity === currentItem.quantity &&
      originalItem.unitPrice === currentItem.unitPrice
    );
  });
}

/**
 * Compare all editable invoice fields.
 *
 * Returns true only when something that can be saved has actually changed.
 */
function invoiceStatesAreEqual(original: InvoiceState, current: InvoiceState) {
  if (original.businessId !== current.businessId) return false;
  if (original.invoiceDate !== current.invoiceDate) return false;
  if (original.dueDate !== current.dueDate) return false;

  if (original.accountReference.trim() !== current.accountReference.trim()) {
    return false;
  }

  if (original.paymentMethod !== current.paymentMethod) return false;
  if (original.customerId !== current.customerId) return false;

  if (original.customerName.trim() !== current.customerName.trim()) {
    return false;
  }

  if (original.customerCompany.trim() !== current.customerCompany.trim()) {
    return false;
  }

  if (original.customerAddress.trim() !== current.customerAddress.trim()) {
    return false;
  }

  if (original.customerPhone.trim() !== current.customerPhone.trim()) {
    return false;
  }

  if (original.customerEmail.trim() !== current.customerEmail.trim()) {
    return false;
  }

  if (original.discount !== current.discount) return false;
  if (original.taxRate !== current.taxRate) return false;
  if (original.amountPaid !== current.amountPaid) return false;

  if (original.notes.trim() !== current.notes.trim()) {
    return false;
  }

  if (original.terms.trim() !== current.terms.trim()) {
    return false;
  }

  if (!itemsAreEqual(original.items, current.items)) {
    return false;
  }

  return true;
}

export default function EditInvoicePage() {
  const params = useParams();
  const router = useRouter();

  /**
   * Keep the browser Supabase client stable.
   */
  const supabase = useMemo(() => createClient(), []);

  const invoiceId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  /**
   * The business this invoice belongs to.
   *
   * This comes from invoices.business_id, not business_profiles.user_id,
   * so admins/staff can work with invoices belonging to their business.
   */
  const [businessId, setBusinessId] = useState('');

  /**
   * Original state captured when the invoice is loaded.
   *
   * The Save button is enabled/disabled by comparing the current state
   * against this snapshot.
   */
  const [originalState, setOriginalState] = useState<InvoiceState | null>(null);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [accountReference, setAccountReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  const [items, setItems] = useState<InvoiceItem[]>([]);

  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);

  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  const currentState = useMemo<InvoiceState>(
    () => ({
      businessId,
      invoiceDate,
      dueDate,
      accountReference,
      paymentMethod,
      customerId,
      customerName,
      customerCompany,
      customerAddress,
      customerPhone,
      customerEmail,
      items,
      discount,
      taxRate,
      amountPaid,
      notes,
      terms,
    }),
    [
      businessId,
      invoiceDate,
      dueDate,
      accountReference,
      paymentMethod,
      customerId,
      customerName,
      customerCompany,
      customerAddress,
      customerPhone,
      customerEmail,
      items,
      discount,
      taxRate,
      amountPaid,
      notes,
      terms,
    ],
  );

  const hasChanges = useMemo(() => {
    if (!originalState) {
      return false;
    }

    return !invoiceStatesAreEqual(originalState, currentState);
  }, [originalState, currentState]);

  const subtotal = useMemo(() => {
    return items.reduce(
      (total, item) => total + item.quantity * item.unitPrice,
      0,
    );
  }, [items]);

  const taxAmount = useMemo(() => {
    return Math.max(0, (subtotal - discount) * (taxRate / 100));
  }, [subtotal, discount, taxRate]);

  const total = useMemo(() => {
    return Math.max(0, subtotal - discount + taxAmount);
  }, [subtotal, discount, taxAmount]);

  const amountDue = useMemo(() => {
    return Math.max(0, total - amountPaid);
  }, [total, amountPaid]);

  useEffect(() => {
    const loadInvoice = async () => {
      setError('');

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) {
          throw authError;
        }

        if (!user) {
          router.push('/login');
          return;
        }

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .select(
            `
            id,
            business_id,
            invoice_number,
            invoice_date,
            due_date,
            account_reference,
            payment_method,
            subtotal,
            tax_rate,
            tax_amount,
            discount,
            total,
            amount_paid,
            amount_due,
            status,
            notes,
            terms,
            customer:customers (
              id,
              name,
              company_name,
              address,
              phone,
              email
            ),
            items:invoice_items (
              id,
              description,
              quantity,
              unit_price,
              total
            )
          `,
          )
          .eq('id', invoiceId)
          .single();

        if (invoiceError) {
          throw invoiceError;
        }

        if (!invoiceData) {
          throw new Error('Invoice not found.');
        }

        const invoice = invoiceData as unknown as Invoice;

        const loadedItems: InvoiceItem[] = invoice.items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
        }));

        const loadedCustomer = invoice.customer;

        const loadedBusinessId = invoice.business_id;

        const loadedInvoiceDate = invoice.invoice_date;

        const loadedDueDate = invoice.due_date || '';

        const loadedAccountReference = invoice.account_reference || '';

        const loadedPaymentMethod = invoice.payment_method;

        const loadedCustomerId = loadedCustomer?.id || '';

        const loadedCustomerName = loadedCustomer?.name || '';

        const loadedCustomerCompany = loadedCustomer?.company_name || '';

        const loadedCustomerAddress = loadedCustomer?.address || '';

        const loadedCustomerPhone = loadedCustomer?.phone || '';

        const loadedCustomerEmail = loadedCustomer?.email || '';

        const loadedDiscount = Number(invoice.discount);

        const loadedTaxRate = Number(invoice.tax_rate);

        const loadedAmountPaid = Number(invoice.amount_paid);

        const loadedNotes = invoice.notes || '';

        const loadedTerms = invoice.terms || '';

        setBusinessId(loadedBusinessId);
        setInvoiceNumber(invoice.invoice_number);
        setInvoiceDate(loadedInvoiceDate);
        setDueDate(loadedDueDate);
        setAccountReference(loadedAccountReference);
        setPaymentMethod(loadedPaymentMethod);

        setCustomerId(loadedCustomerId);
        setCustomerName(loadedCustomerName);
        setCustomerCompany(loadedCustomerCompany);
        setCustomerAddress(loadedCustomerAddress);
        setCustomerPhone(loadedCustomerPhone);
        setCustomerEmail(loadedCustomerEmail);

        setItems(loadedItems);

        setDiscount(loadedDiscount);
        setTaxRate(loadedTaxRate);
        setAmountPaid(loadedAmountPaid);

        setNotes(loadedNotes);
        setTerms(loadedTerms);

        setOriginalState({
          businessId: loadedBusinessId,
          invoiceDate: loadedInvoiceDate,
          dueDate: loadedDueDate,
          accountReference: loadedAccountReference,
          paymentMethod: loadedPaymentMethod,
          customerId: loadedCustomerId,
          customerName: loadedCustomerName,
          customerCompany: loadedCustomerCompany,
          customerAddress: loadedCustomerAddress,
          customerPhone: loadedCustomerPhone,
          customerEmail: loadedCustomerEmail,
          items: loadedItems.map((item) => ({
            ...item,
          })),
          discount: loadedDiscount,
          taxRate: loadedTaxRate,
          amountPaid: loadedAmountPaid,
          notes: loadedNotes,
          terms: loadedTerms,
        });
      } catch (err) {
        console.error('Unable to load invoice:', err);

        setError('Unable to load this invoice.');
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId, router, supabase]);

  const updateItem = (
    id: string,
    field: keyof Omit<InvoiceItem, 'id'>,
    value: string | number,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: field === 'description' ? value : Number(value) || 0,
            }
          : item,
      ),
    );
  };

  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!hasChanges) {
      return;
    }

    if (!businessId) {
      setError('Unable to determine the business for this invoice.');
      return;
    }

    if (!customerName.trim()) {
      setError('Please enter the customer name.');
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.description.trim() && item.quantity > 0 && item.unitPrice >= 0,
    );

    if (validItems.length === 0) {
      setError('Please add at least one valid invoice item.');
      return;
    }

    if (amountPaid > total) {
      setError('Amount paid cannot be greater than the invoice total.');
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.push('/login');
        return;
      }

      let newCustomerId = customerId;

      /*
       * Update existing customer.
       */
      if (newCustomerId) {
        const { error: customerError } = await supabase
          .from('customers')
          .update({
            name: customerName.trim(),
            company_name: customerCompany.trim() || null,
            address: customerAddress.trim() || null,
            phone: customerPhone.trim() || null,
            email: customerEmail.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', newCustomerId)
          .eq('business_id', businessId);

        if (customerError) {
          throw customerError;
        }
      } else {
        /*
         * Create a new customer.
         */
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: businessId,
            name: customerName.trim(),
            company_name: customerCompany.trim() || null,
            address: customerAddress.trim() || null,
            phone: customerPhone.trim() || null,
            email: customerEmail.trim() || null,
          })
          .select('id')
          .single();

        if (customerError) {
          throw customerError;
        }

        if (!customer) {
          throw new Error('Unable to create customer.');
        }

        newCustomerId = customer.id;
      }

      /*
       * Determine invoice status.
       */
      let status = 'UNPAID';

      if (amountPaid >= total) {
        status = 'PAID';
      } else if (amountPaid > 0) {
        status = 'PARTIALLY_PAID';
      }

      if (dueDate && new Date(`${dueDate}T00:00:00`) < new Date()) {
        if (amountDue > 0) {
          status = 'OVERDUE';
        }
      }

      /*
       * Update invoice itself.
       *
       * Your existing invoice UPDATE audit trigger
       * will capture this change.
       */
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          customer_id: newCustomerId,
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          account_reference: accountReference.trim() || null,
          payment_method: paymentMethod,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount,
          total,
          amount_paid: amountPaid,
          amount_due: amountDue,
          status,
          notes: notes.trim() || null,
          terms: terms.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .eq('business_id', businessId);

      if (invoiceError) {
        throw invoiceError;
      }

      /*
       * ============================================================
       * INVOICE ITEM AUDIT-FRIENDLY SAVE
       * ============================================================
       *
       * IMPORTANT:
       *
       * We intentionally do NOT delete every invoice item and then
       * recreate everything.
       *
       * Instead:
       *
       *   Existing item -> UPDATE
       *   New item      -> INSERT
       *   Removed item  -> DELETE
       *
       * This allows database audit triggers on invoice_items to
       * correctly record Created / Updated / Deleted activity.
       */

      const originalItems = originalState?.items ?? [];

      /*
       * IDs that existed when the invoice was loaded.
       *
       * These represent actual database rows.
       */
      const originalItemIds = new Set(originalItems.map((item) => item.id));

      /*
       * IDs currently present in the form.
       *
       * Newly-added items use crypto.randomUUID()
       * and therefore will NOT exist in originalItemIds.
       */
      const currentItemIds = new Set(validItems.map((item) => item.id));

      /*
       * Existing database items that are still present.
       */
      const itemsToUpdate = validItems.filter((item) =>
        originalItemIds.has(item.id),
      );

      /*
       * Items that were added during this edit.
       */
      const itemsToInsert = validItems.filter(
        (item) => !originalItemIds.has(item.id),
      );

      /*
       * Original database items that are no longer
       * present in the current form.
       */
      const itemIdsToDelete = originalItems
        .filter((item) => !currentItemIds.has(item.id))
        .map((item) => item.id);

      /*
       * ------------------------------------------------------------
       * UPDATE EXISTING ITEMS
       * ------------------------------------------------------------
       *
       * This is what makes description, quantity, and price changes
       * appear as UPDATE events in audit_logs.
       */
      for (const item of itemsToUpdate) {
        const { error: itemUpdateError } = await supabase
          .from('invoice_items')
          .update({
            description: item.description.trim(),
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })
          .eq('id', item.id)
          .eq('invoice_id', invoiceId);

        if (itemUpdateError) {
          throw itemUpdateError;
        }
      }

      /*
       * ------------------------------------------------------------
       * INSERT NEW ITEMS
       * ------------------------------------------------------------
       *
       * New items get INSERT events in audit_logs.
       */
      if (itemsToInsert.length > 0) {
        const { error: itemInsertError } = await supabase
          .from('invoice_items')
          .insert(
            itemsToInsert.map((item) => ({
              invoice_id: invoiceId,
              description: item.description.trim(),
              quantity: item.quantity,
              unit_price: item.unitPrice,
              total: item.quantity * item.unitPrice,
            })),
          );

        if (itemInsertError) {
          throw itemInsertError;
        }
      }

      /*
       * ------------------------------------------------------------
       * DELETE REMOVED ITEMS
       * ------------------------------------------------------------
       *
       * Removed items get DELETE events in audit_logs.
       */
      if (itemIdsToDelete.length > 0) {
        const { error: itemDeleteError } = await supabase
          .from('invoice_items')
          .delete()
          .in('id', itemIdsToDelete)
          .eq('invoice_id', invoiceId);

        if (itemDeleteError) {
          throw itemDeleteError;
        }
      }

      /*
       * Update the original state after a successful save.
       *
       * We keep the current client IDs here so that the page state
       * remains consistent until navigation happens.
       */
      setOriginalState({
        businessId,
        invoiceDate,
        dueDate,
        accountReference,
        paymentMethod,
        customerId: newCustomerId,
        customerName,
        customerCompany,
        customerAddress,
        customerPhone,
        customerEmail,
        items: validItems.map((item) => ({
          ...item,
        })),
        discount,
        taxRate,
        amountPaid,
        notes,
        terms,
      });

      router.push(`/invoices/${invoiceId}`);

      router.refresh();
    } catch (err) {
      console.error('Unable to save invoice:', err);

      setError('Unable to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading invoice...
          </div>
        </div>
      </main>
    );
  }

  if (error && !invoiceNumber) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {error}
          </div>

          <Link
            href={`/invoices/${invoiceId}`}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to invoice
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href={`/invoices/${invoiceId}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <h1 className="text-lg font-bold text-slate-900">Edit Invoice</h1>

              <p className="text-xs text-slate-500">{invoiceNumber}</p>
            </div>
          </div>

          <button
            type="submit"
            form="edit-invoice-form"
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </header>

      <form
        id="edit-invoice-form"
        onSubmit={handleSave}
        className="mx-auto max-w-7xl px-6 py-8"
      >
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            {/* Invoice Information */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                Invoice Information
              </h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Invoice Number
                  </label>

                  <input
                    value={invoiceNumber}
                    readOnly
                    className={`${inputClass} bg-slate-50 text-slate-500`}
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Invoice number cannot be changed.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Account Reference
                  </label>

                  <input
                    value={accountReference}
                    onChange={(e) => setAccountReference(e.target.value)}
                    className={inputClass}
                    placeholder="Optional reference"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Invoice Date
                  </label>

                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Due Date
                  </label>

                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className={inputClass}
                  >
                    <option value="BANK_TRANSFER">Bank Transfer</option>

                    <option value="CASH">Cash</option>

                    <option value="CARD">Card</option>

                    <option value="CHEQUE">Cheque</option>

                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>
            </section>

            {/* Customer */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">Customer</h2>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Customer Name
                  </label>

                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={inputClass}
                    placeholder="Customer name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Company Name
                  </label>

                  <input
                    value={customerCompany}
                    onChange={(e) => setCustomerCompany(e.target.value)}
                    className={inputClass}
                    placeholder="Company name"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Phone
                  </label>

                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={inputClass}
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={inputClass}
                    placeholder="Email address"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Address
                  </label>

                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="Customer address"
                  />
                </div>
              </div>
            </section>

            {/* Items */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Invoice Items
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Add the products or services being billed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  Add Item
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">
                        Item {index + 1}
                      </p>

                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={items.length === 1}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-[1fr_120px_160px]">
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-500">
                          Description
                        </label>

                        <input
                          value={item.description}
                          onChange={(e) =>
                            updateItem(item.id, 'description', e.target.value)
                          }
                          className={inputClass}
                          placeholder="Item description"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-500">
                          Quantity
                        </label>

                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(item.id, 'quantity', e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-500">
                          Unit Price
                        </label>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateItem(item.id, 'unitPrice', e.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="mt-3 text-right text-sm font-semibold text-slate-700">
                      {formatCurrency(item.quantity * item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Additional Information */}
            <section className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                Additional Information
              </h2>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </label>

                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="Additional notes..."
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Terms & Conditions
                  </label>

                  <textarea
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                    rows={4}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    placeholder="Payment terms and conditions..."
                  />
                </div>
              </div>
            </section>
          </div>

          {/* Summary */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-bold text-slate-900">
                Invoice Summary
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Subtotal</span>

                  <span className="font-medium text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Discount
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) =>
                      setDiscount(Math.max(0, Number(e.target.value) || 0))
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Tax Rate (%)
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={taxRate}
                    onChange={(e) =>
                      setTaxRate(Math.max(0, Number(e.target.value) || 0))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tax</span>

                  <span className="font-medium text-slate-900">
                    {formatCurrency(taxAmount)}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-4">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-900">Total</span>

                    <span className="text-lg font-bold text-slate-900">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Amount Paid
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    max={total}
                    value={amountPaid}
                    onChange={(e) =>
                      setAmountPaid(Math.max(0, Number(e.target.value) || 0))
                    }
                    className={inputClass}
                  />
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-slate-600">
                      Amount Due
                    </span>

                    <span className="font-bold text-slate-900">
                      {formatCurrency(amountDue)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || !hasChanges}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}
