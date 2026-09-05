'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  Check,
  Eye,
  EyeOff,
  FileText,
  LayoutDashboard,
  Lock,
  LogOut,
  Settings,
  ShieldCheck,
  Users,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';
import MobileBottomNav from '@/components/MobileBottomNav';

export default function ChangePasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [userEmail, setUserEmail] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace('/login');
        return;
      }

      setUserEmail(user.email ?? '');
      setCheckingSession(false);
    };

    checkSession();
  }, [router, supabase.auth]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError('');
    setSuccess(false);

    const trimmedCurrentPassword = currentPassword;
    const trimmedNewPassword = newPassword;

    if (!trimmedCurrentPassword) {
      setError('Please enter your current password.');
      return;
    }

    if (trimmedNewPassword.length < 8) {
      setError('Your new password must be at least 8 characters long.');
      return;
    }

    if (trimmedNewPassword !== confirmPassword) {
      setError('Your new passwords do not match.');
      return;
    }

    if (trimmedCurrentPassword === trimmedNewPassword) {
      setError(
        'Your new password must be different from your current password.',
      );
      return;
    }

    if (!userEmail) {
      setError('We could not verify your account. Please sign in again.');
      return;
    }

    setLoading(true);

    try {
      /*
       * Verify the current password before allowing the change.
       * Supabase requires the user's email + current password
       * for password authentication.
       */
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: trimmedCurrentPassword,
      });

      if (verifyError) {
        setError('Your current password is incorrect.');
        setLoading(false);
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: trimmedNewPassword,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(true);
      setLoading(false);
    } catch {
      setError(
        'Something went wrong while changing your password. Please try again.',
      );
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          <p className="text-sm text-slate-600">Verifying your account...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-20 items-center border-b border-slate-200 px-6">
          <Link href="/dashboard" className="block">
            <div className="text-sm font-semibold text-slate-900">
              Business Workspace
            </div>
            <div className="mt-0.5 text-xs text-slate-500">
              Management Dashboard
            </div>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/invoices"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <FileText className="h-4 w-4" />
            Invoices
          </Link>

          <Link
            href="/customers"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Users className="h-4 w-4" />
            Customers
          </Link>

          <Link
            href="/team"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Users className="h-4 w-4" />
            Team
          </Link>

          <Link
            href="/audit-log"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Activity className="h-4 w-4" />
            Activity
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <ShieldCheck className="h-4 w-4" />
            Profile
          </Link>

          <Link
            href="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-3">
            <div className="truncate text-sm font-medium text-slate-900">
              {userEmail}
            </div>
            <div className="mt-0.5 text-xs text-slate-500">Account</div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 min-h-[116px] border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-[116px] items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <Link
                href="/profile"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Back to profile"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Account
                </p>
                <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  Change Password
                </h1>
                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Update your account password securely.
                </p>
              </div>
            </div>

            <Link
              href="/settings"
              className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:flex"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          </div>
        </header>

        <main className="px-5 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-8">
          <div className="mx-auto max-w-3xl">
            {/* Page Intro */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Password security
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a strong password that you do not use elsewhere.
              </p>
            </div>

            {/* Success */}
            {success && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="h-4 w-4 text-emerald-700" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-emerald-900">
                      Password updated successfully
                    </p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Your account password has been changed.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              {/* Password Form */}
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                      <Lock className="h-5 w-5 text-slate-700" />
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Update password
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Verify your current password first.
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 px-5 py-6 sm:px-6"
                >
                  {/* Current Password */}
                  <div>
                    <label
                      htmlFor="currentPassword"
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      Current Password
                    </label>

                    <div className="relative">
                      <input
                        id="currentPassword"
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter your current password"
                        autoComplete="current-password"
                        disabled={loading || success}
                        required
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        disabled={loading || success}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                        aria-label={
                          showCurrentPassword
                            ? 'Hide current password'
                            : 'Show current password'
                        }
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-700">
                        New password
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Use at least 8 characters.
                      </p>
                    </div>

                    {/* New Password */}
                    <div className="mb-5">
                      <label
                        htmlFor="newPassword"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        New Password
                      </label>

                      <div className="relative">
                        <input
                          id="newPassword"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(event) =>
                            setNewPassword(event.target.value)
                          }
                          placeholder="Enter your new password"
                          autoComplete="new-password"
                          disabled={loading || success}
                          minLength={8}
                          required
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />

                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          disabled={loading || success}
                          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                          aria-label={
                            showNewPassword
                              ? 'Hide new password'
                              : 'Show new password'
                          }
                        >
                          {showNewPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label
                        htmlFor="confirmPassword"
                        className="mb-1.5 block text-sm font-medium text-slate-700"
                      >
                        Confirm New Password
                      </label>

                      <div className="relative">
                        <input
                          id="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(event) =>
                            setConfirmPassword(event.target.value)
                          }
                          placeholder="Confirm your new password"
                          autoComplete="new-password"
                          disabled={loading || success}
                          minLength={8}
                          required
                          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          disabled={loading || success}
                          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 transition hover:text-slate-700 disabled:cursor-not-allowed"
                          aria-label={
                            showConfirmPassword
                              ? 'Hide password confirmation'
                              : 'Show password confirmation'
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      disabled={loading || success}
                      className="w-full rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loading ? 'Updating Password...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </section>

              {/* Security Help */}
              <aside className="space-y-4">
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                    <ShieldCheck className="h-4 w-4 text-slate-700" />
                  </div>

                  <h3 className="text-sm font-semibold text-slate-900">
                    Keep your account secure
                  </h3>

                  <ul className="mt-3 space-y-2.5 text-xs leading-5 text-slate-500">
                    <li>• Use at least 8 characters.</li>
                    <li>• Avoid passwords you use on other websites.</li>
                    <li>• Do not share your password with anyone.</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Forgot your current password?
                  </h3>

                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Use the password recovery process instead of changing it
                    from this page.
                  </p>

                  <Link
                    href="/forgot-password"
                    className="mt-4 inline-flex text-sm font-medium text-slate-700 transition hover:text-slate-900"
                  >
                    Reset your password
                  </Link>
                </div>

                <Link
                  href="/profile"
                  className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  Back to Profile
                </Link>
              </aside>
            </div>
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}
