'use client';

import { useState } from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type DeleteInvoiceButtonProps = {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  onDeleted?: (invoiceNumber: string) => void;
};

export default function DeleteInvoiceButton({
  invoiceId,
  invoiceNumber,
  customerName,
  onDeleted,
}: DeleteInvoiceButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');

    try {
      const supabase = createClient();

      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (deleteError) {
        console.error('Delete invoice error:', deleteError);

        if (
          deleteError.code === '42501' ||
          deleteError.message?.toLowerCase().includes('permission')
        ) {
          setError('You do not have permission to delete this invoice.');
        } else {
          setError(deleteError.message || 'Unable to delete this invoice.');
        }

        return;
      }

      setIsOpen(false);

      onDeleted?.(invoiceNumber);
    } catch (error) {
      console.error('Delete invoice request error:', error);

      setError(
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while deleting the invoice.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpen = () => {
    setError('');
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isDeleting) return;

    setError('');
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        title="Delete invoice"
        aria-label={`Delete invoice ${invoiceNumber}`}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isDeleting) {
              handleClose();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-invoice-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="delete-invoice-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Delete invoice?
                </h2>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  This action cannot be undone.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                aria-label="Close"
                className="inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {invoiceNumber}
                </p>

                <p className="mt-1 truncate text-sm text-slate-500">
                  {customerName}
                </p>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-600">
                Deleting this invoice will also remove its invoice items. The
                customer record will not be deleted.
              </p>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isDeleting}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Delete invoice
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
