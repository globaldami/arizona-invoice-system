'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-50 px-4 py-12">
          <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              <p className="mt-4 text-sm text-slate-500">
                Preparing your invitation...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const invitationId = searchParams.get('invitation')?.trim() || '';
  const invitationToken = searchParams.get('token')?.trim() || '';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        router.replace('/login');
        return;
      }

      setEmail(user.email || '');

      const existingName =
        user.user_metadata?.full_name || user.user_metadata?.name || '';

      setFullName(existingName);
      setLoading(false);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError('');

    if (!invitationId || !invitationToken) {
      setError(
        'This invitation link is incomplete or invalid. Please use the invitation email again.',
      );
      return;
    }

    const trimmedName = fullName.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }

    if (password.length < 8) {
      setError('Your password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    setSubmitting(true);

    try {
      /*
       * Update the invited user's account first.
       * The invitation itself is accepted only after this succeeds.
       */
      const { error: updateError } = await supabase.auth.updateUser({
        password,
        data: {
          full_name: trimmedName,
        },
      });

      if (updateError) {
        setError(updateError.message);
        setSubmitting(false);
        return;
      }

      /*
       * Securely validate and accept the invitation.
       * The API hashes the token and calls the database function,
       * which verifies:
       * - invitation exists
       * - invitation is still pending
       * - invitation has not expired
       * - invitation email matches the authenticated user
       * - invitation token is valid
       *
       * It then creates the business membership and marks
       * the invitation as accepted.
       */
      const response = await fetch('/api/team/accept-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invitationId,
          token: invitationToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result?.error ||
            'We could not accept your invitation. Please try again.',
        );
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      /*
       * Give the user a brief success state before entering
       * the business dashboard.
       */
      setTimeout(() => {
        router.replace('/dashboard');
        router.refresh();
      }, 900);
    } catch (err) {
      console.error('Invitation acceptance error:', err);

      setError(
        'Something went wrong while accepting your invitation. Please try again.',
      );
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto flex min-h-[70vh] max-w-md items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
            <p className="mt-4 text-sm text-slate-500">
              Preparing your invitation...
            </p>
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
              Welcome to your team
            </h1>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Complete your account setup to accept your invitation.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-8">
            {success ? (
              <div className="py-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-900">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m5 12 4 4L19 6"
                    />
                  </svg>
                </div>

                <h2 className="mt-5 text-lg font-semibold text-slate-950">
                  Invitation accepted
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Your account is ready. Taking you to your dashboard...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold text-slate-950">
                    Accept your invitation
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Set your profile details and password to finish joining the
                    business workspace.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label
                      htmlFor="fullName"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Full name
                    </label>

                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      autoComplete="name"
                      disabled={submitting}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Email
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 outline-none"
                    />

                    <p className="mt-2 text-xs leading-5 text-slate-400">
                      This is the email address the invitation was sent to.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Password
                    </label>

                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 8 characters"
                        autoComplete="new-password"
                        disabled={submitting}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword((value) => !value)}
                        disabled={submitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed"
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Confirm password
                    </label>

                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        disabled={submitting}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-20 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        disabled={submitting}
                        className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:cursor-not-allowed"
                      >
                        {showConfirmPassword ? 'Hide' : 'Show'}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-700"
                    >
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Accepting invitation...' : 'Join team'}
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-5 text-center">
                  <p className="text-xs leading-5 text-slate-400">
                    Having trouble with your invitation?{' '}
                    <Link
                      href="/login"
                      className="font-medium text-slate-600 transition hover:text-slate-950"
                    >
                      Return to login
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Your invitation is securely linked to your email address.
          </p>
        </div>
      </div>
    </main>
  );
}
