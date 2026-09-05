'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function InvitePreviewContent() {
  const searchParams = useSearchParams();
  const confirmationUrl = searchParams.get('confirmation_url');
  const [continuing, setContinuing] = useState(false);

  function handleContinue() {
    if (!confirmationUrl) return;

    setContinuing(true);
    window.location.assign(confirmationUrl);
  }

  if (!confirmationUrl) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
            <h1 className="text-xl font-semibold text-slate-950">
              Invalid invitation
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              This invitation link is incomplete or invalid. Please use the
              invitation email again.
            </p>

            <Link
              href="/login"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Return to login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="w-full">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-6 w-6"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                />

                <circle cx="9" cy="7" r="4" />

                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 8v6m3-3h-6"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
              You&apos;re invited
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              You&apos;ve been invited to join a business team.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8">
            <h2 className="text-lg font-semibold text-slate-950">
              Accept your invitation
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Continue to verify your invitation and finish setting up your
              account.
            </p>

            <button
              type="button"
              onClick={handleContinue}
              disabled={continuing}
              className="mt-7 flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continuing ? 'Continuing...' : 'Continue'}
            </button>

            <div className="mt-5 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs leading-5 text-slate-400">
                If you were not expecting this invitation, you can safely close
                this page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function InvitePreviewPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

            <p className="mt-4 text-sm font-medium text-slate-900">
              Loading invitation...
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Please wait while we prepare your invitation.
            </p>
          </div>
        </main>
      }
    >
      <InvitePreviewContent />
    </Suspense>
  );
}
