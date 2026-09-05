'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    async function handleConfirmation() {
      try {
        const supabase = createClient();

        const invitationId = searchParams.get('invitation')?.trim() || '';

        const invitationToken = searchParams.get('token')?.trim() || '';

        /*
         * Supabase returns the authenticated session in the URL hash
         * after verifying the invitation email.
         *
         * Example:
         *
         * #access_token=...
         * &refresh_token=...
         * &type=invite
         */
        const hash = window.location.hash.replace(/^#/, '');

        const hashParams = new URLSearchParams(hash);

        const accessToken = hashParams.get('access_token') || '';

        const refreshToken = hashParams.get('refresh_token') || '';

        if (!accessToken || !refreshToken) {
          if (mounted) {
            setError(
              'This invitation link is invalid or has expired. Please use the invitation email again.',
            );
          }

          return;
        }

        /*
         * Establish the Supabase session in the browser.
         */
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Invitation session error:', sessionError);

          if (mounted) {
            setError(
              'We could not establish your invitation session. Please use the invitation email again.',
            );
          }

          return;
        }

        /*
         * The Supabase invitation has now been verified.
         *
         * Preserve our own invitation ID and secure invitation token
         * so the acceptance page can validate the invitation against
         * the database.
         */
        if (!invitationId || !invitationToken) {
          if (mounted) {
            setError(
              'This invitation is missing required information. Please ask the business owner to send you a new invitation.',
            );
          }

          return;
        }

        const acceptUrl = new URL(
          '/auth/accept-invite',
          window.location.origin,
        );

        acceptUrl.searchParams.set('invitation', invitationId);

        acceptUrl.searchParams.set('token', invitationToken);

        /*
         * Remove the authentication tokens from the browser URL
         * before continuing to the account setup page.
         */
        window.history.replaceState({}, document.title, '/auth/confirm');

        router.replace(`${acceptUrl.pathname}${acceptUrl.search}`);
      } catch (error) {
        console.error('Invitation confirmation error:', error);

        if (mounted) {
          setError(
            'Something went wrong while verifying your invitation. Please try again.',
          );
        }
      }
    }

    handleConfirmation();

    return () => {
      mounted = false;
    };
  }, [router, searchParams]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_40px_rgba(15,23,42,0.06)]">
          {error ? (
            <>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
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
                    d="M12 9v4"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 17h.01"
                  />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </div>

              <h1 className="mt-5 text-xl font-semibold text-slate-950">
                Invitation unavailable
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">{error}</p>

              <a
                href="/login"
                className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Return to login
              </a>
            </>
          ) : (
            <>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />

              <h1 className="mt-5 text-xl font-semibold text-slate-950">
                Verifying your invitation
              </h1>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Please wait while we securely verify your invitation.
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
