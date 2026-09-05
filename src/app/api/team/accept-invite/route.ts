import { NextResponse, type NextRequest } from 'next/server';
import crypto from 'crypto';

import { createClient } from '@/lib/supabase/server';

function hashInvitationToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const invitationId =
      typeof body.invitationId === 'string' ? body.invitationId.trim() : '';

    const token = typeof body.token === 'string' ? body.token.trim() : '';

    if (!invitationId || !token) {
      return NextResponse.json(
        {
          error: 'Invalid invitation.',
        },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error:
            'Your invitation session has expired. Please use the invitation email again.',
        },
        { status: 401 },
      );
    }

    const tokenHash = hashInvitationToken(token);

    const { data, error } = await supabase.rpc('accept_business_invitation', {
      p_invitation_id: invitationId,
      p_token_hash: tokenHash,
    });

    if (error) {
      console.error('Accept invitation error:', error);

      return NextResponse.json(
        {
          error: error.message || 'Unable to accept invitation.',
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      invitation: data,
    });
  } catch (error) {
    console.error('Accept invitation request error:', error);

    return NextResponse.json(
      {
        error: 'Unable to process your invitation.',
      },
      { status: 500 },
    );
  }
}
