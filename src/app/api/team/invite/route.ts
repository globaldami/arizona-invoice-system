import { NextResponse } from 'next/server';
import { createHash, randomBytes } from 'crypto';

import { createClient } from '@/lib/supabase/server';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

const ALLOWED_ROLES = ['admin', 'staff', 'viewer'] as const;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated.' },
        { status: 401 },
      );
    }

    const body = await request.json();

    const email = String(body.email || '')
      .trim()
      .toLowerCase();

    const role = String(body.role || 'staff')
      .trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required.' },
        { status: 400 },
      );
    }

    if (!email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 });
    }

    /*
     * Find the business belonging to the current owner/admin.
     *
     * The database permission function remains the authority
     * for deciding whether this user may invite.
     */
    const { data: membership, error: membershipError } = await supabase
      .from('business_members')
      .select('business_id, role')
      .eq('user_id', user.id)
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        {
          error: 'You are not authorized to invite team members.',
        },
        { status: 403 },
      );
    }

    const businessId = membership.business_id;

    /*
     * Prevent inviting yourself.
     */
    if (email === user.email?.trim().toLowerCase()) {
      return NextResponse.json(
        {
          error: 'You cannot invite yourself to your own business.',
        },
        { status: 400 },
      );
    }

    /*
     * Check whether the person is already a member.
     *
     * We use the service-role client only on the server because
     * auth.users cannot be queried through the normal browser client.
     */
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        {
          error: 'Supabase server configuration is missing.',
        },
        { status: 500 },
      );
    }

    const { createClient: createAdminClient } =
      await import('@supabase/supabase-js');

    const admin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    /*
     * Find an existing Supabase account.
     */
    let existingUser = null;
    let page = 1;

    while (!existingUser) {
      const { data: usersPage, error: usersError } =
        await admin.auth.admin.listUsers({
          page,
          perPage: 1000,
        });

      if (usersError) {
        console.error('List users error:', usersError);

        return NextResponse.json(
          { error: 'Unable to check the invited email.' },
          { status: 500 },
        );
      }

      existingUser =
        usersPage.users.find(
          (candidate) => candidate.email?.toLowerCase() === email,
        ) || null;

      if (!usersPage.users.length || usersPage.users.length < 1000) {
        break;
      }

      page++;
    }

    /*
     * Existing member?
     */
    if (existingUser) {
      const { data: existingMembership } = await admin
        .from('business_members')
        .select('id')
        .eq('business_id', businessId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json(
          {
            error: 'This user is already a member of your business.',
          },
          { status: 409 },
        );
      }
    }

    /*
     * Prevent duplicate pending invitations.
     */
    const { data: existingInvitation } = await supabase
      .from('business_invitations')
      .select('id, status, expires_at')
      .eq('business_id', businessId)
      .ilike('email', email)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvitation) {
      return NextResponse.json(
        {
          error:
            'There is already a pending invitation for this email address.',
        },
        { status: 409 },
      );
    }

    /*
     * Generate a secure random token.
     *
     * Only the SHA-256 hash is stored in the database.
     */
    const token = randomBytes(32).toString('hex');

    const tokenHash = createHash('sha256').update(token).digest('hex');

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    /*
     * Create the invitation record BEFORE creating/sending
     * the Supabase Auth invitation.
     */
    const { data: invitation, error: invitationError } = await admin
      .from('business_invitations')
      .insert({
        business_id: businessId,
        email,
        role,
        invited_by: user.id,
        token_hash: tokenHash,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id, business_id, email, role, status, expires_at, created_at')
      .single();

    if (invitationError || !invitation) {
      console.error('Create invitation error:', invitationError);

      if (invitationError?.code === '23505') {
        return NextResponse.json(
          {
            error:
              'There is already a pending invitation for this email address.',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: 'Unable to create the invitation.',
        },
        { status: 500 },
      );
    }

    /*
     * Send the actual Supabase Auth invitation.
     *
     * The invitation ID is included in the redirect URL so
     * the acceptance page can resolve the invitation.
     */
    const redirectTo =
      `${siteUrl}/auth/confirm?invitation=${invitation.id}` +
      `&token=${encodeURIComponent(token)}`;

    const { data: inviteData, error: inviteError } =
      await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: {
          account_type: 'invited',
          invitation_id: invitation.id,
        },
      });

    if (inviteError || !inviteData.user) {
      console.error('Supabase invitation error:', inviteError);

      /*
       * Roll back the invitation if the email could not
       * be sent/created.
       */
      await admin.from('business_invitations').delete().eq('id', invitation.id);

      return NextResponse.json(
        {
          error: inviteError?.message || 'Unable to send invitation.',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      invited: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expires_at,
      },
      message: 'Invitation sent successfully.',
    });
  } catch (error) {
    console.error('Team invite error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unexpected server error.',
      },
      { status: 500 },
    );
  }
}
