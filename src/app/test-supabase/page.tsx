import { createClient } from '@/lib/supabase/server';

export default async function TestSupabasePage() {
  const supabase = await createClient();

  const { data, error } = await supabase.from('business_profiles').select('*');

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">Supabase Connection Test</h1>

      <pre className="mt-6 rounded-lg bg-gray-100 p-4">
        {JSON.stringify({ data, error }, null, 2)}
      </pre>
    </main>
  );
}
