'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, FileText, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type InvoiceItem = {
  id: number;
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

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const inputClass =
  'w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3.5 py-[0.7rem] text-sm text-slate-900 placeholder:text-slate-300 outline-none transition hover:border-slate-600 focus:border-[#1e3a5f] focus:ring-4 focus:ring-[#1e3a5f]/10 disabled:bg-slate-100 disabled:text-slate-500';

const selectClass = `${inputClass} cursor-pointer`;

export default function NewInvoicePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  // --------------------------------------------------
  // Customer state
  // --------------------------------------------------
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // --------------------------------------------------
  // Invoice information
  // --------------------------------------------------
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceNumberLoading, setInvoiceNumberLoading] = useState(true);
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');

  // --------------------------------------------------
  // Invoice items
  // --------------------------------------------------
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: 1,
      description: '',
      quantity: 1,
      unitPrice: 0,
    },
  ]);

  // --------------------------------------------------
  // Invoice defaults loaded from Business Settings
  // --------------------------------------------------
  const [discount, setDiscount] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [taxRate, setTaxRate] = useState(0);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [amountPaid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');

  // --------------------------------------------------
  // Save state
  // --------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);

  // --------------------------------------------------
  // Load invoice number preview
  //
  // IMPORTANT:
  // This function MUST NOT reserve or advance the sequence.
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const loadInvoiceNumberPreview = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('You must be logged in.');
        }

        const { data: business, error: businessError } = await supabase
          .from('business_profiles')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (businessError || !business) {
          throw new Error('Business profile not found.');
        }

        // Preview only.
        // This must NOT update invoice_sequences.
        const { data, error } = await supabase.rpc(
          'get_invoice_number_preview',
          {
            p_business_id: business.id,
          },
        );

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setInvoiceNumber(data || 'Automatic');
        }
      } catch (error) {
        console.error('Unable to load invoice number preview:', error);

        if (!cancelled) {
          setInvoiceNumber('Automatic');
        }
      } finally {
        if (!cancelled) {
          setInvoiceNumberLoading(false);
        }
      }
    };

    loadInvoiceNumberPreview();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // --------------------------------------------------
  // Load currency and tax rate from Business Settings
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const loadInvoiceDefaults = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('You must be logged in.');
        }

        const { data: business, error: businessError } = await supabase
          .from('business_profiles')
          .select('default_currency, default_tax_rate')
          .limit(1)
          .maybeSingle();

        if (businessError || !business) {
          throw new Error('Business profile not found.');
        }

        if (!cancelled) {
          setCurrency(business.default_currency || 'NGN');
          setTaxRate(Number(business.default_tax_rate ?? 0));
        }
      } catch (error) {
        console.error('Unable to load invoice defaults:', error);
      } finally {
        if (!cancelled) {
          setSettingsLoading(false);
        }
      }
    };

    loadInvoiceDefaults();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // --------------------------------------------------
  // Load customers
  // --------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    const loadCustomers = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error('You must be logged in.');
        }

        const { data: business, error: businessError } = await supabase
          .from('business_profiles')
          .select('id')
          .limit(1)
          .maybeSingle();

        if (businessError || !business) {
          throw new Error('Business profile not found.');
        }

        const { data, error } = await supabase
          .from('customers')
          .select('id, name, company_name, address, phone, email')
          .eq('business_id', business.id)
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setCustomers((data ?? []) as Customer[]);
        }
      } catch (error) {
        console.error('Unable to load customers:', error);
      } finally {
        if (!cancelled) {
          setCustomersLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  // --------------------------------------------------
  // Calculations
  // --------------------------------------------------
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

  const isOverpayment = amountPaid > total;

  // --------------------------------------------------
  // Customer selection
  // --------------------------------------------------
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);

    if (!customerId) {
      setCustomerName('');
      setCustomerCompany('');
      setCustomerAddress('');
      setCustomerPhone('');
      setCustomerEmail('');
      return;
    }

    const customer = customers.find((item) => item.id === customerId);

    if (!customer) return;

    setCustomerName(customer.name);
    setCustomerCompany(customer.company_name ?? '');
    setCustomerAddress(customer.address ?? '');
    setCustomerPhone(customer.phone ?? '');
    setCustomerEmail(customer.email ?? '');
  };

  // --------------------------------------------------
  // Invoice items
  // --------------------------------------------------
  const addItem = () => {
    setItems((current) => [
      ...current,
      {
        id: Date.now(),
        description: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const removeItem = (id: number) => {
    if (items.length === 1) return;

    setItems((current) => current.filter((item) => item.id !== id));
  };

  const updateItem = (
    id: number,
    field: keyof InvoiceItem,
    value: string | number,
  ) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]:
                field === 'quantity' || field === 'unitPrice'
                  ? Number(value)
                  : value,
            }
          : item,
      ),
    );
  };

  // --------------------------------------------------
  // Error display
  // --------------------------------------------------
  useEffect(() => {
    if (!saveError || !errorRef.current) return;

    const element = errorRef.current;

    requestAnimationFrame(() => {
      const y = element.getBoundingClientRect().top + window.scrollY - 120;

      window.scrollTo({
        top: Math.max(0, y),
        behavior: 'smooth',
      });
    });
  }, [saveError]);

  const showError = (message: string) => {
    setSaveError(message);
  };

  // --------------------------------------------------
  // Save invoice
  //
  // IMPORTANT:
  // Overpayments are NOT allowed.
  //
  // amount_paid must never exceed calculatedTotal.
  // This validation happens BEFORE:
  // - customer creation
  // - invoice number generation
  // - invoice creation
  // --------------------------------------------------
  const handleSaveInvoice = async () => {
    setSaveError('');

    if (saving) return;

    setSaving(true);

    try {
      // --------------------------------------------------
      // 1. Make sure the user is logged in
      // --------------------------------------------------
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('You must be logged in to create an invoice.');
      }

      // --------------------------------------------------
      // 2. Get the business available to this member
      // --------------------------------------------------
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, default_currency, default_tax_rate')
        .limit(1)
        .maybeSingle();

      if (businessError || !business) {
        throw new Error('Business profile not found.');
      }

      // --------------------------------------------------
      // 3. Validate customer
      // --------------------------------------------------
      if (!customerName.trim()) {
        throw new Error('Please enter the customer name.');
      }

      // --------------------------------------------------
      // 4. Validate invoice date
      // --------------------------------------------------
      if (!invoiceDate) {
        throw new Error('Please enter the invoice date.');
      }

      // --------------------------------------------------
      // 5. Validate invoice items
      // --------------------------------------------------
      if (items.length === 0) {
        throw new Error('Please add at least one invoice item.');
      }

      const hasInvalidItem = items.some(
        (item) =>
          !item.description.trim() ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0 ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice < 0,
      );

      if (hasInvalidItem) {
        throw new Error('Please complete all invoice items.');
      }

      const validItems = items.filter((item) => item.description.trim() !== '');

      if (validItems.length === 0) {
        throw new Error('Please add at least one invoice item.');
      }

      // --------------------------------------------------
      // 6. Validate discount
      // --------------------------------------------------
      if (!Number.isFinite(discount) || discount < 0) {
        throw new Error('Please enter a valid discount.');
      }

      if (discount > subtotal) {
        throw new Error('Discount cannot be greater than the subtotal.');
      }

      // --------------------------------------------------
      // 7. Validate amount paid
      // --------------------------------------------------
      if (!Number.isFinite(amountPaid) || amountPaid < 0) {
        throw new Error('Please enter a valid amount paid.');
      }

      // --------------------------------------------------
      // 8. Get latest saved tax rate
      // --------------------------------------------------
      const invoiceTaxRate = Number(business.default_tax_rate ?? taxRate);

      // --------------------------------------------------
      // 9. Calculate final invoice amounts
      // --------------------------------------------------
      const calculatedSubtotal = validItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0,
      );

      const calculatedTaxAmount = Math.max(
        0,
        (calculatedSubtotal - discount) * (invoiceTaxRate / 100),
      );

      const calculatedTotal = Math.max(
        0,
        calculatedSubtotal - discount + calculatedTaxAmount,
      );

      // --------------------------------------------------
      // 10. HARD STOP: overpayments are not allowed
      //
      // This MUST happen before creating a customer
      // or calling the invoice RPC.
      // --------------------------------------------------
      if (amountPaid > calculatedTotal) {
        throw new Error(
          `Amount paid cannot exceed the invoice total of ${formatCurrency(
            calculatedTotal,
            business.default_currency || currency,
          )}.`,
        );
      }

      const calculatedAmountDue = calculatedTotal - amountPaid;

      // --------------------------------------------------
      // 11. Get existing customer OR create a new customer
      // --------------------------------------------------
      let customerId = selectedCustomerId;

      if (!customerId) {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            business_id: business.id,
            name: customerName.trim(),
            company_name: customerCompany.trim() || null,
            address: customerAddress.trim() || null,
            phone: customerPhone.trim() || null,
            email: customerEmail.trim() || null,
          })
          .select('id')
          .single();

        if (customerError || !newCustomer) {
          throw new Error(
            customerError?.message || 'Unable to create customer.',
          );
        }

        customerId = newCustomer.id;
      }

      // --------------------------------------------------
      // 12. Determine invoice status
      // --------------------------------------------------
      const status =
        amountPaid === calculatedTotal
          ? 'PAID'
          : amountPaid > 0
            ? 'PARTIALLY_PAID'
            : 'UNPAID';

      // --------------------------------------------------
      // 13. Prepare invoice items for PostgreSQL
      // --------------------------------------------------
      const invoiceItems = validItems.map((item) => ({
        description: item.description.trim(),
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.quantity * item.unitPrice,
      }));

      // --------------------------------------------------
      // 14. Create invoice + items + invoice number
      //
      // PostgreSQL handles this as ONE transaction.
      // --------------------------------------------------
      const { data: createdInvoice, error: createInvoiceError } =
        await supabase.rpc('create_invoice_with_number', {
          p_business_id: business.id,
          p_customer_id: customerId,
          p_invoice_date: invoiceDate,
          p_due_date: dueDate || null,
          p_payment_method: paymentMethod,
          p_subtotal: calculatedSubtotal,
          p_tax_rate: invoiceTaxRate,
          p_tax_amount: calculatedTaxAmount,
          p_discount: discount,
          p_total: calculatedTotal,
          p_amount_paid: amountPaid,
          p_amount_due: calculatedAmountDue,
          p_status: status,
          p_notes: notes.trim() || null,
          p_terms: terms.trim() || null,
          p_items: invoiceItems,
        });

      if (
        createInvoiceError ||
        !createdInvoice ||
        createdInvoice.length === 0
      ) {
        throw new Error(
          createInvoiceError?.message || 'Unable to create invoice.',
        );
      }

      // --------------------------------------------------
      // 15. Get the newly created invoice
      // --------------------------------------------------
      const createdInvoiceId = createdInvoice[0].invoice_id;
      const createdInvoiceNumber = createdInvoice[0].invoice_number;

      console.log('Invoice created successfully:', createdInvoiceNumber);

      // --------------------------------------------------
      // 16. Redirect
      // --------------------------------------------------
      router.push(`/invoices/${createdInvoiceId}`);
    } catch (err) {
      console.error('Unable to save invoice:', err);

      showError(
        err instanceof Error
          ? err.message
          : 'Something went wrong while saving the invoice.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900">
                Create Invoice
              </h1>

              <p className="text-sm text-slate-500">
                Create a new invoice for your customer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveInvoice}
            disabled={saving || invoiceNumberLoading || settingsLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:py-2.5"
          >
            <Save size={17} />

            {saving
              ? 'Saving...'
              : settingsLoading
                ? 'Loading Settings...'
                : 'Save Invoice'}
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] gap-6 px-4 py-4 sm:px-6 sm:py-6 xl:grid-cols-[1fr_700px]">
        {/* ======================================================
            LEFT - FORM
        ====================================================== */}

        <section className="min-w-0 space-y-6">
          {saveError && (
            <div
              ref={errorRef}
              className="scroll-mt-24 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {saveError}
            </div>
          )}

          {/* Invoice Information */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex min-w-0 items-center gap-3">
              <div className="shrink-0 rounded-lg bg-slate-100 p-2">
                <FileText size={19} className="text-slate-700" />
              </div>

              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">
                  Invoice Information
                </h2>

                <p className="text-sm text-slate-500">
                  Basic information about this invoice
                </p>
              </div>
            </div>

            <div className="grid min-w-0 gap-5 md:grid-cols-3">
              <Field label="Invoice Number">
                <input
                  type="text"
                  value={invoiceNumberLoading ? 'Loading...' : invoiceNumber}
                  readOnly
                  className={inputClass}
                />
              </Field>

              <Field label="Invoice Date">
                <input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Due Date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* Customer */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Customer Information
              </h2>

              <p className="text-sm text-slate-500">
                Enter the customer&apos;s billing information
              </p>
            </div>

            <div className="mb-6">
              <Field label="Select Existing Customer">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className={selectClass}
                  disabled={customersLoading}
                >
                  <option value="">
                    {customersLoading
                      ? 'Loading customers...'
                      : 'Enter customer manually'}
                  </option>

                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.company_name
                        ? ` — ${customer.company_name}`
                        : ''}
                    </option>
                  ))}
                </select>
              </Field>

              <p className="mt-2 text-xs text-slate-500">
                Select an existing customer to automatically fill their
                information, or leave this blank to create a new customer.
              </p>
            </div>

            <div className="grid min-w-0 gap-5 md:grid-cols-2">
              <Field label="Customer Name">
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </Field>

              <Field label="Company Name">
                <input
                  value={customerCompany}
                  onChange={(e) => setCustomerCompany(e.target.value)}
                  className={inputClass}
                  placeholder="Company Name Ltd."
                />
              </Field>

              <Field label="Phone">
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+234 800 000 0000"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={inputClass}
                  placeholder="customer@example.com"
                />
              </Field>

              <div className="min-w-0 md:col-span-2">
                <Field label="Address">
                  <textarea
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className={`${inputClass} min-h-22.5 resize-none`}
                    placeholder="Customer address"
                  />
                </Field>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Payment Information
              </h2>

              <p className="text-sm text-slate-500">
                Specify how the customer will pay
              </p>
            </div>

            <Field label="Payment Method">
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={selectClass}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </Field>
          </div>

          {/* Items */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex min-w-0 items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-900">Invoice Items</h2>

                <p className="text-sm text-slate-500">
                  Add the products or services being billed
                </p>
              </div>

              <button
                type="button"
                onClick={addItem}
                className="flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">
                      Item {index + 1}
                    </span>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={17} />
                      </button>
                    )}
                  </div>

                  <div className="grid min-w-0 gap-4 md:grid-cols-[1fr_100px_160px]">
                    <Field label="Description">
                      <input
                        value={item.description}
                        onChange={(e) =>
                          updateItem(item.id, 'description', e.target.value)
                        }
                        className={inputClass}
                        placeholder="Rail freight transportation"
                      />
                    </Field>

                    <Field label="Qty">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, 'quantity', e.target.value)
                        }
                        className={inputClass}
                      />
                    </Field>

                    <Field label="Unit Price">
                      <input
                        type="number"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, 'unitPrice', e.target.value)
                        }
                        className={inputClass}
                        placeholder="0"
                      />
                    </Field>
                  </div>

                  <div className="mt-3 wrap-break-word text-right text-sm text-slate-500">
                    Item total:{' '}
                    <span className="font-semibold text-slate-900">
                      {formatCurrency(item.quantity * item.unitPrice, currency)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">Payment Summary</h2>

              <p className="text-sm text-slate-500">
                Apply discount, tax and payment information
              </p>
            </div>

            <div className="grid min-w-0 gap-5 md:grid-cols-3">
              <Field label="Discount">
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  className={inputClass}
                />
              </Field>

              <Field label="Tax Rate (%)">
                <input
                  type="number"
                  min="0"
                  value={taxRate}
                  readOnly
                  disabled={settingsLoading}
                  className={inputClass}
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Automatically loaded from Business Settings.
                </p>
              </Field>

              <Field label="Amount Paid">
                <input
                  type="number"
                  min="0"
                  max={total}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(Number(e.target.value))}
                  className={`${inputClass} ${
                    isOverpayment
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                      : ''
                  }`}
                />

                {isOverpayment && (
                  <p className="mt-1.5 text-xs font-medium text-red-600">
                    Amount paid cannot exceed {formatCurrency(total, currency)}.
                  </p>
                )}
              </Field>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
              <div className="ml-auto w-full max-w-sm space-y-3">
                <SummaryRow
                  label="Subtotal"
                  value={formatCurrency(subtotal, currency)}
                />

                <SummaryRow
                  label="Discount"
                  value={`- ${formatCurrency(discount, currency)}`}
                />

                <SummaryRow
                  label={`Tax (${taxRate}%)`}
                  value={formatCurrency(taxAmount, currency)}
                />

                <div className="border-t border-slate-200 pt-3">
                  <SummaryRow
                    label="Total"
                    value={formatCurrency(total, currency)}
                    bold
                  />
                </div>

                <SummaryRow
                  label="Amount Paid"
                  value={formatCurrency(amountPaid, currency)}
                />

                <SummaryRow
                  label="Amount Due"
                  value={formatCurrency(amountDue, currency)}
                  bold
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="grid min-w-0 gap-6 md:grid-cols-2">
              <Field label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`${inputClass} min-h-30 resize-none`}
                  placeholder="Thank you for your business."
                />
              </Field>

              <Field label="Terms & Conditions">
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className={`${inputClass} min-h-30 resize-none`}
                  placeholder="Payment is due according to the agreed terms."
                />
              </Field>
            </div>
          </div>
        </section>

        {/* ======================================================
            RIGHT - LIVE PREVIEW
        ====================================================== */}

        <section className="min-w-0 xl:sticky xl:top-25 xl:self-start">
          <div className="mb-3 flex min-w-0 items-center justify-between">
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">Live Preview</h2>

              <p className="text-sm text-slate-500">
                This is how your invoice will appear
              </p>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
            <div className="min-w-0 overflow-hidden p-5 text-[12px] text-slate-900 sm:p-8">
              {/* Top */}
              <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 text-xl font-black tracking-wide">
                    ARIZONA
                  </div>

                  <div className="text-[9px] tracking-[0.3em] text-red-600">
                    LOGISTICS
                  </div>

                  <div className="mt-2 text-[9px] text-slate-500">
                    MOVE. CONNECT. DELIVER.
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <h1 className="text-3xl font-black tracking-tight">
                    INVOICE
                  </h1>
                </div>
              </div>

              {/* Invoice meta */}
              <div className="mt-7 grid grid-cols-1 gap-3 bg-slate-100 p-4 sm:grid-cols-3">
                <PreviewMeta label="Invoice No." value={invoiceNumber || '-'} />

                <PreviewMeta label="Invoice Date" value={invoiceDate || '-'} />

                <PreviewMeta label="Due Date" value={dueDate || '-'} />
              </div>

              {/* Customer / total */}
              <div className="mt-7 grid min-w-0 grid-cols-1 gap-6 sm:grid-cols-[1fr_220px]">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900">INVOICE TO:</p>

                  <div className="mt-3 min-w-0">
                    <p className="wrap-break-word font-bold">
                      {customerName || 'Customer Name'}
                    </p>

                    {customerCompany && (
                      <p className="mt-1 wrap-break-word font-semibold">
                        {customerCompany}
                      </p>
                    )}

                    <p className="mt-2 whitespace-pre-line wrap-break-word text-slate-600">
                      {customerAddress || 'Customer address'}
                    </p>

                    {customerPhone && (
                      <p className="mt-1 wrap-break-word text-slate-600">
                        {customerPhone}
                      </p>
                    )}

                    {customerEmail && (
                      <p className="break-all text-slate-600">
                        {customerEmail}
                      </p>
                    )}
                  </div>
                </div>

                <div className="min-w-0 bg-slate-800 p-5 text-white">
                  <p className="text-[10px] uppercase tracking-wide text-slate-300">
                    Total Due
                  </p>

                  <p className="mt-2 wrap-break-word text-2xl font-black">
                    {formatCurrency(amountDue, currency)}
                  </p>
                </div>
              </div>

              {/* Payment */}
              <div className="mt-6 border-t border-slate-200 pt-4">
                <p className="font-bold">PAYMENT METHOD</p>

                <p className="mt-2 text-slate-600">
                  {paymentMethod.replace('_', ' ')}
                </p>

                <p className="mt-1 text-slate-600">Arizona Logistics Limited</p>
              </div>

              {/* Items */}
              <div className="mt-7 min-w-0 overflow-hidden">
                <div className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_65px_45px_75px] bg-slate-800 px-2 py-3 font-bold text-white sm:grid-cols-[35px_1fr_70px_60px_80px] sm:px-3">
                  <div>No</div>
                  <div>Product / Service</div>
                  <div className="text-right">Price</div>
                  <div className="text-right">Qty</div>
                  <div className="text-right">Total</div>
                </div>

                {items.map((item, index) => (
                  <div
                    key={item.id}
                    className="grid min-w-0 grid-cols-[28px_minmax(0,1fr)_65px_45px_75px] border-b border-slate-200 px-2 py-4 sm:grid-cols-[35px_1fr_70px_60px_80px] sm:px-3"
                  >
                    <div>{index + 1}.</div>

                    <div className="min-w-0 pr-2">
                      <p className="wrap-break-word font-semibold">
                        {item.description || 'Product / Service'}
                      </p>
                    </div>

                    <div className="wrap-break-word text-right">
                      {formatCurrency(item.unitPrice, currency)}
                    </div>

                    <div className="text-right">{item.quantity}</div>

                    <div className="wrap-break-word text-right font-semibold">
                      {formatCurrency(item.quantity * item.unitPrice, currency)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-6 flex justify-end">
                <div className="w-full max-w-64 space-y-2">
                  <SummaryRow
                    label="Subtotal"
                    value={formatCurrency(subtotal, currency)}
                  />

                  <SummaryRow
                    label="Discount"
                    value={formatCurrency(discount, currency)}
                  />

                  <SummaryRow
                    label={`Tax ${taxRate}%`}
                    value={formatCurrency(taxAmount, currency)}
                  />

                  <div className="border-t border-slate-300 pt-2">
                    <SummaryRow
                      label="GRAND TOTAL"
                      value={formatCurrency(total, currency)}
                      bold
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mt-10 grid min-w-0 grid-cols-1 gap-8 sm:grid-cols-2">
                <div className="min-w-0">
                  <p className="font-bold">NOTES</p>

                  <p className="mt-3 whitespace-pre-line wrap-break-word text-slate-600">
                    {notes || 'Thank you for your business.'}
                  </p>

                  {terms && (
                    <div className="mt-6">
                      <p className="font-bold">TERMS & CONDITIONS</p>

                      <p className="mt-3 whitespace-pre-line wrap-break-word text-slate-600">
                        {terms}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-end">
                  <div className="mb-3 h-12 w-32 border-b border-slate-400" />

                  <p className="font-semibold">Authorized Signature</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-10 border-t-4 border-slate-900 pt-4">
                <div className="flex flex-col gap-2 text-[10px] text-slate-500 sm:flex-row sm:justify-between">
                  <span>Arizona Logistics Limited</span>
                  <span>Thank you for your business.</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

// ======================================================
// REUSABLE COMPONENTS
// ======================================================

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 items-center justify-between gap-4 ${
        bold ? 'font-bold text-slate-900' : 'text-slate-600'
      }`}
    >
      <span className="min-w-0">{label}</span>
      <span className="shrink-0">{value}</span>
    </div>
  );
}

function PreviewMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="font-bold">{label}</p>
      <p className="mt-1 wrap-break-word text-slate-600">{value}</p>
    </div>
  );
}
