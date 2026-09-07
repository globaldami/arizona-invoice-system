'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import MobileBottomNav from '@/components/MobileBottomNav';

import {
  ArrowLeft,
  Loader2,
  Mail,
  Shield,
  Trash2,
  UserPlus,
  Users,
  X,
  AlertTriangle,
} from 'lucide-react';

import { createClient } from '@/lib/supabase/client';

type MemberRole = 'owner' | 'admin' | 'staff' | 'viewer';

type Member = {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'staff' | 'viewer';
  created_at: string;
  email: string | null;
  full_name: string | null;
};

export default function TeamPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [businessId, setBusinessId] = useState('');
  const [currentUserId, setCurrentUserId] = useState('');

  const [members, setMembers] = useState<Member[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Member selected for removal confirmation
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null);

  /*
   * -------------------------------------------------------
   * Load the team
   * -------------------------------------------------------
   */
  const loadTeam = async () => {
    setError('');

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push('/login');
      return;
    }

    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (businessError || !business) {
      setError(businessError?.message || 'Unable to find your business.');
      setLoading(false);
      return;
    }

    const { data, error: membersError } = await supabase.rpc(
      'get_business_members',
      {
        p_business_id: business.id,
      },
    );

    if (membersError) {
      setError(membersError.message);
      setLoading(false);
      return;
    }

    setCurrentUserId(user.id);
    setBusinessId(business.id);
    setMembers((data || []) as Member[]);
    setLoading(false);
  };

  /*
   * -------------------------------------------------------
   * Initial page load
   * -------------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const initializeTeam = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (userError || !user) {
        router.push('/login');
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (businessError || !business) {
        setError(businessError?.message || 'Unable to find your business.');
        setLoading(false);
        return;
      }

      const { data, error: membersError } = await supabase.rpc(
        'get_business_members',
        {
          p_business_id: business.id,
        },
      );

      if (cancelled) return;

      if (membersError) {
        setError(membersError.message);
        setLoading(false);
        return;
      }

      setCurrentUserId(user.id);
      setBusinessId(business.id);
      setMembers((data || []) as Member[]);
      setLoading(false);
    };

    initializeTeam();

    return () => {
      cancelled = true;
    };
  }, [supabase, router]);

  /*
   * -------------------------------------------------------
   * Current user / permissions
   * -------------------------------------------------------
   */
  const currentMember = members.find(
    (member) => member.user_id === currentUserId,
  );

  const canManageTeam =
    currentMember?.role === 'owner' || currentMember?.role === 'admin';

  /*
   * -------------------------------------------------------
   * Invite / add member
   * -------------------------------------------------------
   */
  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setSaving(true);
    setError('');
    setSuccess('');

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError('Enter an email address.');
      setSaving(false);
      return;
    }

    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: normalizedEmail,
          role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Unable to invite team member.');
        setSaving(false);
        return;
      }

      setEmail('');

      setSuccess(result.message || 'Team member added successfully.');

      await loadTeam();
    } catch (inviteError) {
      setError(
        inviteError instanceof Error
          ? inviteError.message
          : 'Unable to invite team member.',
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * -------------------------------------------------------
   * Change member role
   * -------------------------------------------------------
   */
  const handleRoleChange = async (member: Member, newRole: MemberRole) => {
    if (
      !businessId ||
      !canManageTeam ||
      member.role === 'owner' ||
      newRole === 'owner'
    ) {
      return;
    }

    setError('');
    setSuccess('');

    const { error: updateError } = await supabase.rpc(
      'update_business_member_role',
      {
        p_business_id: businessId,
        p_user_id: member.user_id,
        p_role: newRole,
      },
    );

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMembers((current) =>
      current.map((item) =>
        item.id === member.id
          ? {
              ...item,
              role: newRole,
            }
          : item,
      ),
    );

    setSuccess('Member role updated.');
  };

  /*
   * -------------------------------------------------------
   * Open remove confirmation modal
   * -------------------------------------------------------
   */
  const handleRemove = (member: Member) => {
    if (!businessId || !canManageTeam || member.role === 'owner') {
      return;
    }

    setError('');
    setSuccess('');
    setMemberToRemove(member);
  };

  /*
   * -------------------------------------------------------
   * Confirm member removal
   * -------------------------------------------------------
   */
  const confirmRemove = async () => {
    if (
      !memberToRemove ||
      !businessId ||
      !canManageTeam ||
      memberToRemove.role === 'owner'
    ) {
      return;
    }

    setRemoving(true);
    setError('');
    setSuccess('');

    try {
      const { error: removeError } = await supabase.rpc(
        'remove_business_member',
        {
          p_business_id: businessId,
          p_user_id: memberToRemove.user_id,
        },
      );

      if (removeError) {
        setError(removeError.message);
        return;
      }

      const removedName =
        memberToRemove.full_name || memberToRemove.email || 'Team member';

      setMembers((current) =>
        current.filter((item) => item.id !== memberToRemove.id),
      );

      setMemberToRemove(null);

      setSuccess(`${removedName} was removed from the business.`);
    } catch (removeError) {
      console.error('Unable to remove team member:', removeError);

      setError('Unable to remove team member. Please try again.');
    } finally {
      setRemoving(false);
    }
  };

  /*
   * -------------------------------------------------------
   * Close remove modal
   * -------------------------------------------------------
   */
  const cancelRemove = () => {
    if (removing) return;

    setMemberToRemove(null);
  };

  /*
   * -------------------------------------------------------
   * Loading state
   * -------------------------------------------------------
   */
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading team...
          </div>
        </div>
      </main>
    );
  }

  /*
   * -------------------------------------------------------
   * Page
   * -------------------------------------------------------
   */
  return (
    <main className="min-h-screen bg-slate-50 pb-20 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="h-5 w-5" />
            Team
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Team Members
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage the people who have access to your business.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Success */}
        {success && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
          >
            {success}
          </div>
        )}

        {/* Add member */}
        {canManageTeam && (
          <section className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <UserPlus className="h-5 w-5 text-slate-700" />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Add Team Member
                </h2>

                <p className="text-sm text-slate-500">
                  Invite someone to work with this business.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleInvite}
              className="grid gap-4 md:grid-cols-[1fr_180px_auto]"
            >
              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>

                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="employee@example.com"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(event) =>
                    setRole(event.target.value as 'admin' | 'staff' | 'viewer')
                  }
                  disabled={saving}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              {/* Submit */}
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4" />
                  )}

                  {saving ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Members */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Section heading */}
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">Current Members</h2>
          </div>

          {/* Member list */}
          <div className="divide-y divide-slate-200">
            {members.map((member) => {
              const isCurrentUser = member.user_id === currentUserId;

              const displayName =
                member.full_name?.trim() || member.email || 'Team Member';

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between"
                >
                  {/* Member information */}
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                      <Users className="h-5 w-5 text-slate-500" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {displayName}
                        </span>

                        {isCurrentUser && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            You
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {member.email || 'No email available'}
                        {' · '}
                        Joined{' '}
                        {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Role + remove */}
                  <div className="flex items-center gap-3">
                    {member.role === 'owner' ? (
                      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                        <Shield className="h-4 w-4" />
                        Owner
                      </div>
                    ) : (
                      <select
                        value={member.role}
                        disabled={!canManageTeam}
                        onChange={(event) =>
                          handleRoleChange(
                            member,
                            event.target.value as MemberRole,
                          )
                        }
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    )}

                    {canManageTeam && member.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member)}
                        disabled={removing}
                        className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Remove member"
                        aria-label={`Remove ${displayName}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty state */}
            {!members.length && (
              <div className="px-6 py-12 text-center">
                <Users className="mx-auto mb-3 h-8 w-8 text-slate-300" />

                <p className="text-sm font-medium text-slate-700">
                  No team members found.
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Add someone to start building your team.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      <MobileBottomNav />

      {/* -------------------------------------------------------
          Remove Member Confirmation Modal
          ------------------------------------------------------- */}
      {memberToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelRemove();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-member-title"
            aria-describedby="remove-member-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>

                <div>
                  <h2
                    id="remove-member-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    Remove team member?
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    This action will revoke their access to this business.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={cancelRemove}
                disabled={removing}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  You are about to remove
                </p>

                <p className="mt-1 font-semibold text-slate-900">
                  {memberToRemove.full_name ||
                    memberToRemove.email ||
                    'this team member'}
                </p>

                {memberToRemove.email && memberToRemove.full_name && (
                  <p className="mt-0.5 text-xs text-slate-500">
                    {memberToRemove.email}
                  </p>
                )}
              </div>

              <p
                id="remove-member-description"
                className="mt-4 text-sm leading-6 text-slate-600"
              >
                They will no longer be able to access this business or its team
                resources. This does not delete any invoices, customers, or
                business data.
              </p>
            </div>

            {/* Modal actions */}
            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelRemove}
                disabled={removing}
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmRemove}
                disabled={removing}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Remove Member
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
