import { createBrowserClient } from '@supabase/ssr';
// Note: previous code used @supabase/auth-helpers-nextjs; project standard is to use getSupabaseBrowserClient from here.
export function getSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
