Phase 1 additions: in-app chat foundation

Files added:
- supabase/migrations/20261022120000_create_chat_tables.sql (conversations, participants, messages, conversation_bookings, is_admin fn, get_or_create_conversation RPC, RLS)
- src/modules/marketplace/components/MessageButton.tsx (Message CTA)
- src/modules/marketplace/components/InstructorCard.tsx (updated to include Message button)
- src/app/api/chat/open/route.ts (RPC wrapper to open conversation)
- src/app/api/chat/messages/route.ts (send & fetch messages; 5s per-user cooldown in-memory)
- src/app/chat/[conversation]/page.tsx (placeholder conversation page)
- src/components/AiWidgetClient.tsx (floating AI widget client)
- src/app/api/ai-tutor/route.ts (server-side AI wrapper; mocked when GOOGLE_API_KEY missing)
- translations updated in src/messages/*.json

Migrations: apply the new migration to your Supabase DB. This creates RLS policies and helper functions.

Env vars required:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY (server-only for some admin tasks; do NOT expose to browser)
- GOOGLE_API_KEY (optional) — if absent AI widget returns a clearly labeled MOCK response

Notes & limitations:
- Data persistence: uses Supabase Postgres via existing clients. In-memory cooldown (5s) resets on server restart; for production use a proper rate limiter (Redis or DB-based token bucket).
- Realtime: frontend clients should subscribe to Supabase Realtime on table conversation_messages to receive live messages. This PR includes server routes but not the full client subscription UI yet — conversation page is a placeholder to be extended in next phase.
- Admins: is_admin(u) function created and RLS uses it.

How to run:
1. npm install
2. Apply migrations in supabase/migrations/*.sql to your Supabase project
3. Add env vars in workspace Secrets
4. npm run dev

