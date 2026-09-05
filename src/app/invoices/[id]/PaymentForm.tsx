'use client';

import { FormEvent, useState } from 'react';

import { useRouter } from 'next/navigation';

import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type Props = {
  invoiceId: string;
  total: number;
  amountPaid: number;
  amountDue: number;
  currentPaymentMethod: string;
};

export default function PaymentForm({
  invoiceId,
  total,
  amountPaid,
  amountDue,
  currentPaymentMethod,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(
    currentPaymentMethod || 'BANK_TRANSFER',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handlePayment = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setError('');
    setSuccessMessage('');

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    if (paymentAmount > amountDue) {
      setError('Payment cannot be greater than the outstanding amount.');
      return;
    }

    setSaving(true);

    try {
      const newAmountPaid = amountPaid + paymentAmount;
      const newAmountDue = Math.max(0, total - newAmountPaid);

      let newStatus = 'PARTIALLY_PAID';

      if (newAmountPaid >= total) {
        newStatus = 'PAID';
      }

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          amount_due: newAmountDue,
          payment_method: paymentMethod,
          status: newStatus,
        })
        .eq('id', invoiceId);

      if (updateError) {
        throw updateError;
      }

      // Payment was successfully saved.
      setAmount('');

      setSuccessMessage(
        'Payment recorded successfully. The invoice balance has been updated.',
      );

      // Refresh the server-rendered invoice data while
      // preserving the success message above.
      router.refresh();

      // Automatically remove the success message after 5 seconds.
      window.setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Unable to record payment:', err);

      setError('Unable to record payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (amountDue <= 0) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CreditCard className="h-5 w-5 text-green-700" />
          </div>

          <div>
            <p className="font-semibold text-green-800">Invoice fully paid</p>

            <p className="mt-1 text-sm text-green-700">
              This invoice has no outstanding balance.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <CreditCard className="h-5 w-5 text-slate-700" />
        </div>

        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Record Payment
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Record a payment received for this invoice.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Invoice Total
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {total.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Amount Paid
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {amountPaid.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>

        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
            Amount Due
          </p>

          <p className="mt-1 text-lg font-bold text-red-700">
            {amountDue.toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      <form onSubmit={handlePayment} className="mt-6 space-y-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label
              htmlFor="paymentAmount"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment Amount
            </label>

            <input
              id="paymentAmount"
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
                setSuccessMessage('');
              }}
              placeholder="Enter amount received"
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              disabled={saving}
            />
          </div>

          <div>
            <label
              htmlFor="paymentMethod"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Payment Method
            </label>

            <select
              id="paymentMethod"
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                setError('');
                setSuccessMessage('');
              }}
              className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
              disabled={saving}
            >
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {/* Success message */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />

            <div>
              <p className="font-semibold text-emerald-800">Payment recorded</p>

              <p className="mt-0.5 text-emerald-700">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#16304f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                Record Payment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
