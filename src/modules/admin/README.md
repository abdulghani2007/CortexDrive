AdminPanel notes:
- Uses getSupabaseBrowserClient from '@/lib/supabase/client' for client queries.
- Tabs: verifications (approve/reject), bookings (read-only), wallet (transactions), sos logs.
- No delete functionality.
- Ensure RLS and server gating are used in src/app/[locale]/admin/page.tsx which checks the admins table.