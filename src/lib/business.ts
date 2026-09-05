import { createClient } from '@/lib/supabase/server';

export async function getCurrentBusiness() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      business: null,
      user: null,
      error: userError || new Error('Not authenticated'),
    };
  }

  // RLS will automatically return only businesses
  // that the current user is a member of.
  const { data: business, error: businessError } = await supabase
    .from('business_profiles')
    .select('*')
    .limit(1)
    .maybeSingle();

  return {
    business,
    user,
    error: businessError,
  };
}
