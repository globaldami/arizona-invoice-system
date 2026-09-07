import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/server';
import { getCurrentBusiness } from '@/lib/business';

import MobileBottomNav from '@/components/MobileBottomNav';

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const params = await searchParams;

  const supabase = await createClient();

  // --------------------------------------------------
  // Get authenticated user
  // --------------------------------------------------
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // --------------------------------------------------
  // Get current business
  // --------------------------------------------------
  const { business } = await getCurrentBusiness();

  if (!business) {
    redirect('/signup');
  }

  // --------------------------------------------------
  // User information
  // --------------------------------------------------
  const fullName =
    user.user_metadata?.full_name || user.user_metadata?.name || 'Account User';

  const email = user.email || 'No email address';

  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part.charAt(0).toUpperCase())
    .join('');

  const businessName =
    business.business_name || business.name || 'Business Workspace';

  // --------------------------------------------------
  // Update profile
  // --------------------------------------------------
  const updateProfile = async (formData: FormData) => {
    'use server';

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect('/login');
    }

    const fullName = String(formData.get('full_name') || '').trim();

    if (!fullName) {
      redirect('/profile');
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: fullName,
      },
    });

    if (error) {
      console.error('Profile update error:', error);
      redirect('/profile?updated=error');
    }

    redirect('/profile?updated=success');
  };

  // --------------------------------------------------
  // Logout
  // --------------------------------------------------
  const handleLogout = async () => {
    'use server';

    const supabase = await createClient();

    await supabase.auth.signOut();

    redirect('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ============================================================
          DESKTOP SIDEBAR
      ============================================================ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        <div className="flex h-full flex-col">
          {/* Business Header */}
          <div className="flex h-20 items-center border-b border-slate-100 px-5">
            <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900">
                <ReceiptText className="h-5 w-5 text-white" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {businessName}
                </p>

                <p className="text-xs text-slate-500">Business Workspace</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            {/* Dashboard */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LayoutDashboard className="h-4.5 w-4.5" />
              <span>Dashboard</span>
            </Link>

            {/* Invoices */}
            <Link
              href="/invoices"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <FileText className="h-4.5 w-4.5" />
              <span>Invoices</span>
            </Link>

            {/* Customers */}
            <Link
              href="/customers"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="h-4.5 w-4.5" />
              <span>Customers</span>
            </Link>

            {/* Team */}
            <Link
              href="/team"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Users className="h-4.5 w-4.5" />
              <span>Team</span>
            </Link>

            {/* Activity */}
            <Link
              href="/audit-log"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Activity className="h-4.5 w-4.5" />
              <span>Activity</span>
            </Link>

            {/* Profile */}
            <Link
              href="/profile"
              className="flex items-center gap-3 rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white"
            >
              <UserCircle className="h-4.5 w-4.5" />
              <span>Profile</span>
            </Link>

            {/* Settings */}
            <Link
              href="/settings"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <Settings className="h-4.5 w-4.5" />
              <span>Settings</span>
            </Link>
          </nav>

          {/* Account */}
          <div className="border-t border-slate-100 p-3">
            <div className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                {initials || 'U'}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {fullName}
                </p>

                <p className="truncate text-xs text-slate-500">{email}</p>
              </div>
            </div>

            <form action={handleLogout}>
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4.5 w-4.5" />
                <span>Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* ============================================================
          MAIN AREA
      ============================================================ */}
      <div className="lg:pl-64">
        {/* ============================================================
    STICKY HEADER
============================================================ */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex min-h-29 items-center justify-between gap-4 px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
            {/* Back + Header Text */}
            <div className="flex min-w-0 items-center gap-4">
              {/* Back to Dashboard */}
              <Link
                href="/dashboard"
                aria-label="Back to Dashboard"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              {/* Header Text */}
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500">Account</p>

                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
                  Profile
                </h1>

                <p className="mt-1.5 hidden text-sm text-slate-500 sm:block">
                  Manage your personal account information and security.
                </p>
              </div>
            </div>

            {/* Header Action */}
            <Link
              href="/settings"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          </div>
        </header>

        {/* ============================================================
            CONTENT
        ============================================================ */}
        <main className="px-5 py-6 pb-28 sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-5xl">
            {/* ============================================================
    PROFILE UPDATE MESSAGE
============================================================ */}
            {params.updated === 'success' && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>

                <div>
                  <p className="font-semibold">Profile updated successfully.</p>

                  <p className="mt-0.5 text-xs text-emerald-700">
                    Your name has been updated successfully.
                  </p>
                </div>
              </div>
            )}

            {params.updated === 'error' && (
              <div className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                  <span className="text-sm font-bold text-red-600">!</span>
                </div>

                <div>
                  <p className="font-semibold">
                    Unable to update your profile.
                  </p>

                  <p className="mt-0.5 text-xs text-red-700">
                    Please try again.
                  </p>
                </div>
              </div>
            )}
            {/* ========================================================
                PROFILE HERO
            ======================================================== */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-6 sm:px-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-lg font-semibold text-white shadow-sm">
                      {initials || 'U'}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Personal profile
                      </p>

                      <h2 className="mt-1 truncate text-xl font-semibold text-slate-900">
                        {fullName}
                      </h2>

                      <p className="mt-1 truncate text-sm text-slate-500">
                        {email}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Account active
                  </div>
                </div>
              </div>

              {/* ======================================================
                  PERSONAL INFORMATION
              ====================================================== */}
              <div className="px-5 py-6 sm:px-6">
                <div className="mb-5">
                  <h3 className="text-base font-semibold text-slate-900">
                    Personal information
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Keep your account details up to date.
                  </p>
                </div>

                <form action={updateProfile} className="space-y-5">
                  <div>
                    <label
                      htmlFor="full_name"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Full name
                    </label>

                    <input
                      id="full_name"
                      name="full_name"
                      type="text"
                      defaultValue={fullName}
                      autoComplete="name"
                      placeholder="Enter your full name"
                      className="block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-slate-700"
                    >
                      Email address
                    </label>

                    <input
                      id="email"
                      type="email"
                      value={email}
                      disabled
                      className="block w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      Your login email is managed through your account security
                      settings.
                    </p>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
                    >
                      Save changes
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* ========================================================
                ACCOUNT / SECURITY
            ======================================================== */}
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              {/* Security */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Security
                      </h3>

                      <p className="text-xs text-slate-500">
                        Manage access to your account.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <Link
                    href="/change-password"
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Password
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Update your account password
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>

                  <div className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Account email
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {email}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                      Verified
                    </div>
                  </div>
                </div>
              </section>

              {/* Workspace */}
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Workspace
                      </h3>

                      <p className="text-xs text-slate-500">
                        Your current business workspace.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  <div className="px-5 py-4 sm:px-6">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                      Business
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {businessName}
                    </p>
                  </div>

                  <Link
                    href="/team"
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Workspace members
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Manage your team and access
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>

                  <Link
                    href="/settings"
                    className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Business settings
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Update workspace information
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                  </Link>
                </div>
              </section>
            </div>

            {/* ========================================================
                ACCOUNT INFORMATION
            ======================================================== */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <UserCircle className="h-4 w-4" />
                  </div>

                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      Account information
                    </h3>

                    <p className="text-xs text-slate-500">
                      Basic information about your account.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                <div className="px-5 py-4 sm:px-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Account ID
                  </p>

                  <p className="mt-1 truncate font-mono text-xs text-slate-600">
                    {user.id}
                  </p>
                </div>

                <div className="px-5 py-4 sm:px-6">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Account created
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-700">
                    {new Date(user.created_at).toLocaleDateString('en-NG', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </section>

            {/* ========================================================
                DANGER / SIGN OUT
            ======================================================== */}
            <section className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Sign out of your account
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    End your current session on this device.
                  </p>
                </div>

                <form action={handleLogout}>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </form>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* ============================================================
          MOBILE BOTTOM NAVIGATION
      ============================================================ */}

      <MobileBottomNav />
    </div>
  );
}
