-- Chat schema: conversations, participants, messages, conversation_bookings

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  pair_key text not null, -- deterministic per learner-instructor pair
  created_at timestamptz default now(),
  last_message_at timestamptz
);
create unique index if not exists conversations_pair_key_idx on public.conversations(pair_key);

create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references auth.users(id) not null,
  joined_at timestamptz default now(),
  is_admin boolean default false,
  primary key (conversation_id, user_id)
);
create index if not exists conversation_participants_user_idx on public.conversation_participants(user_id);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id uuid references auth.users(id) not null,
  body text not null,
  metadata jsonb,
  created_at timestamptz default now()
);
create index if not exists conversation_messages_conv_idx on public.conversation_messages(conversation_id, created_at desc);

create table if not exists public.conversation_bookings (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(id) not null,
  booking_id uuid references public.bookings(id) not null unique,
  created_at timestamptz default now()
);
create index if not exists conversation_bookings_conv_idx on public.conversation_bookings(conversation_id);

-- Admin helper: is_admin(uid uuid)
create or replace function public.is_admin(u uuid) returns boolean language sql security definer as $$
  select exists (select 1 from public.admins a where a.user_id = u);
$$;

-- RPC to get or create deterministic conversation for a pair (learner,instructor)
create or replace function public.get_or_create_conversation(p_user_a uuid, p_user_b uuid) returns uuid language plpgsql security definer as $$
declare
  low uuid;
  high uuid;
  key text;
  conv_id uuid;
begin
  if p_user_a = p_user_b then
    raise exception 'cannot create conversation with self';
  end if;
  if p_user_a < p_user_b then
    low := p_user_a; high := p_user_b;
  else
    low := p_user_b; high := p_user_a;
  end if;
  key := low || ':' || high;
  select id into conv_id from public.conversations where pair_key = key;
  if conv_id is not null then
    return conv_id;
  end if;
  -- create conversation and participants, race-safe using unique index
  begin
    insert into public.conversations (pair_key) values (key) returning id into conv_id;
    insert into public.conversation_participants (conversation_id, user_id) values (conv_id, low);
    insert into public.conversation_participants (conversation_id, user_id) values (conv_id, high);
    return conv_id;
  exception when unique_violation then
    -- someone else created concurrently
    select id into conv_id from public.conversations where pair_key = key;
    return conv_id;
  end;
end;
$$;

-- RLS policies
alter table public.conversations enable row level security;
-- allow select if requester is participant or admin
create policy conversations_select on public.conversations for select using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy conversations_insert on public.conversations for insert with check (true);
create policy conversations_update on public.conversations for update using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
) with check (true);
create policy conversations_delete on public.conversations for delete using (public.is_admin(auth.uid()));

alter table public.conversation_participants enable row level security;
create policy participants_select on public.conversation_participants for select using (
  user_id = auth.uid() or public.is_admin(auth.uid())
);
create policy participants_insert on public.conversation_participants for insert with check (user_id = auth.uid() or public.is_admin(auth.uid()));
create policy participants_delete on public.conversation_participants for delete using (public.is_admin(auth.uid()));
create policy participants_update on public.conversation_participants for update using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

alter table public.conversation_messages enable row level security;
create policy messages_select on public.conversation_messages for select using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy messages_insert on public.conversation_messages for insert with check (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy messages_update on public.conversation_messages for update using (false) with check (false);
create policy messages_delete on public.conversation_messages for delete using (public.is_admin(auth.uid()));

alter table public.conversation_bookings enable row level security;
create policy conv_bookings_select on public.conversation_bookings for select using (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy conv_bookings_insert on public.conversation_bookings for insert with check (
  exists (select 1 from public.conversation_participants p where p.conversation_id = conversation_id and p.user_id = auth.uid())
  or public.is_admin(auth.uid())
);
create policy conv_bookings_delete on public.conversation_bookings for delete using (public.is_admin(auth.uid()));

-- Indexes
create index if not exists conv_messages_created_idx on public.conversation_messages(conversation_id, created_at desc);
create index if not exists conv_last_message_idx on public.conversations(last_message_at);
