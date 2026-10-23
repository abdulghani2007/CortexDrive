-- Chat core: pair-key conversation model (one conversation per learner-instructor/vendor pair).
-- This matches the schema already applied live via the Supabase SQL editor on 2026-10-23.

-- is_admin helper (SECURITY DEFINER so RLS policies can call it without recursion)
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = uid);
$$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null unique,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  escalated boolean not null default false
);

create table if not exists public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint participant_unique unique (conversation_id, user_id)
);

create table if not exists public.conversation_bookings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint conversation_booking_unique unique (conversation_id, booking_id)
);

create index if not exists conv_participants_user_idx
  on public.conversation_participants (user_id);

alter table public.messages
  add column if not exists conversation_id uuid
    references public.conversations(id) on delete cascade;

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- ---------- RLS ----------
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.conversation_bookings enable row level security;
alter table public.messages enable row level security;

-- conversations
drop policy if exists "participants read conversation" on public.conversations;
create policy "participants read conversation" on public.conversations
  for select using (
    exists (select 1 from public.conversation_participants cp
            where cp.conversation_id = conversations.id
              and cp.user_id = auth.uid())
  );

drop policy if exists "users create conversation" on public.conversations;
create policy "users create conversation" on public.conversations
  for insert with check (true);

drop policy if exists "participants update conversation" on public.conversations;
create policy "participants update conversation" on public.conversations
  for update using (
    exists (select 1 from public.conversation_participants cp
            where cp.conversation_id = conversations.id
              and cp.user_id = auth.uid())
  );

-- conversation_participants
drop policy if exists "users see own membership" on public.conversation_participants;
create policy "users see own membership" on public.conversation_participants
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.conversation_participants cp
              where cp.conversation_id = conversation_participants.conversation_id
                and cp.user_id = auth.uid())
  );

drop policy if exists "users join conversation" on public.conversation_participants;
create policy "users join conversation" on public.conversation_participants
  for insert with check (user_id = auth.uid());

-- conversation_bookings
drop policy if exists "booking parties see links" on public.conversation_bookings;
create policy "booking parties see links" on public.conversation_bookings
  for select using (
    exists (select 1 from public.conversation_participants cp
            where cp.conversation_id = conversation_bookings.conversation_id
              and cp.user_id = auth.uid())
  );

-- messages
drop policy if exists "participants read message" on public.messages;
create policy "participants read message" on public.messages
  for select using (
    exists (select 1 from public.conversation_participants cp
            where cp.conversation_id = messages.conversation_id
              and cp.user_id = auth.uid())
  );

drop policy if exists "participants send message" on public.messages;
create policy "participants send message" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (select 1 from public.conversation_participants cp
                where cp.conversation_id = messages.conversation_id
                  and cp.user_id = auth.uid())
  );

-- ---------- realtime ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime'
                   and schemaname = 'public'
                   and tablename = 'conversations') then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
