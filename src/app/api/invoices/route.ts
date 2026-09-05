import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

type InvoiceItemInput = {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceRequest = {
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;
  customerName: string;
  customerCompany?: string;
  customerAddress?: string;
  customerPhone?: string;
  customerEmail?: string;
  paymentMethod: 'BANK_TRANSFER' | 'CASH' | 'CARD' | 'CHEQUE' | 'OTHER';
  items: InvoiceItemInput[];
  discount: number;
  taxRate: number;
  amountPaid: number;
  notes?: string;
  terms?: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  try {
    // 1. Check authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'You must be logged in to create an invoice.' },
        { status: 401 },
      );
    }

    // 2. Read request body
    const body = (await request.json()) as InvoiceRequest;

    // 3. Basic validation
    if (!body.invoiceNumber?.trim()) {
      return NextResponse.json(
        { error: 'Invoice number is required.' },
        { status: 400 },
      );
    }

    if (!body.invoiceDate) {
      return NextResponse.json(
        { error: 'Invoice date is required.' },
        { status: 400 },
      );
    }

    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { error: 'Customer name is required.' },
        { status: 400 },
      );
    }

    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'At least one invoice item is required.' },
        { status: 400 },
      );
    }

    // 4. Find the user's business
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (businessError || !business) {
      console.error('Business lookup error:', businessError);

      return NextResponse.json(
        { error: 'Business profile not found.' },
        { status: 404 },
      );
    }

    // 5. Validate invoice items
    for (const item of body.items) {
      if (!item.description?.trim()) {
        return NextResponse.json(
          { error: 'Every invoice item must have a description.' },
          { status: 400 },
        );
      }

      if (
        !Number.isFinite(Number(item.quantity)) ||
        Number(item.quantity) <= 0
      ) {
        return NextResponse.json(
          { error: 'Item quantity must be greater than zero.' },
          { status: 400 },
        );
      }

      if (
        !Number.isFinite(Number(item.unitPrice)) ||
        Number(item.unitPrice) < 0
      ) {
        return NextResponse.json(
          { error: 'Item unit price cannot be negative.' },
          { status: 400 },
        );
      }
    }

    // 6. Calculate totals on the server
    const subtotal = body.items.reduce((sum, item) => {
      return sum + Number(item.quantity) * Number(item.unitPrice);
    }, 0);

    const discount = Math.max(0, Number(body.discount) || 0);
    const taxRate = Math.max(0, Number(body.taxRate) || 0);
    const amountPaid = Math.max(0, Number(body.amountPaid) || 0);

    const taxableAmount = Math.max(0, subtotal - discount);

    const taxAmount = taxableAmount * (taxRate / 100);

    const total = Math.max(0, subtotal - discount + taxAmount);

    const amountDue = Math.max(0, total - amountPaid);

    // 7. Determine invoice status
    let status: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' = 'UNPAID';

    if (amountPaid >= total && total > 0) {
      status = 'PAID';
    } else if (amountPaid > 0) {
      status = 'PARTIALLY_PAID';
    }

    // 8. Create customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        name: body.customerName.trim(),
        company_name: body.customerCompany?.trim() || null,
        address: body.customerAddress?.trim() || null,
        phone: body.customerPhone?.trim() || null,
        email: body.customerEmail?.trim() || null,
      })
      .select('id')
      .single();

    if (customerError || !customer) {
      console.error('Customer creation error:', customerError);

      return NextResponse.json(
        { error: 'Failed to create customer.' },
        { status: 500 },
      );
    }

    // 9. Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: business.id,
        customer_id: customer.id,
        invoice_number: body.invoiceNumber.trim(),
        invoice_date: body.invoiceDate,
        due_date: body.dueDate || null,
        payment_method: body.paymentMethod,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount,
        total,
        amount_paid: amountPaid,
        amount_due: amountDue,
        status,
        notes: body.notes?.trim() || null,
        terms: body.terms?.trim() || null,
      })
      .select('id, invoice_number')
      .single();

    if (invoiceError || !invoice) {
      console.error('Invoice creation error:', invoiceError);

      // Remove the customer we just created if invoice creation fails.
      await supabase.from('customers').delete().eq('id', customer.id);

      if (invoiceError?.code === '23505') {
        return NextResponse.json(
          {
            error: `Invoice number "${body.invoiceNumber.trim()}" already exists.`,
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { error: 'Failed to create invoice.' },
        { status: 500 },
      );
    }

    // 10. Create invoice items
    const invoiceItems = body.items.map((item) => ({
      invoice_id: invoice.id,
      description: item.description.trim(),
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      total: Number(item.quantity) * Number(item.unitPrice),
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(invoiceItems);

    if (itemsError) {
      console.error('Invoice items creation error:', itemsError);

      // Clean up the invoice and customer if items fail.
      await supabase.from('invoices').delete().eq('id', invoice.id);

      await supabase.from('customers').delete().eq('id', customer.id);

      return NextResponse.json(
        { error: 'Failed to save invoice items.' },
        { status: 500 },
      );
    }

    // 11. Return success
    return NextResponse.json(
      {
        success: true,
        invoice: {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          subtotal,
          taxAmount,
          total,
          amountPaid,
          amountDue,
          status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('Create invoice error:', error);

    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the invoice.' },
      { status: 500 },
    );
  }
}
