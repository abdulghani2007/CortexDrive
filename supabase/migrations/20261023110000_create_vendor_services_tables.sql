-- Vendor services migration. This matches the schema already applied live via the
-- Supabase SQL editor on 2026-10-23 (Chunk A + Chunk B). Idempotent so it is safe to
-- re-run.

create extension if not exists btree_gist;

-- ---------- vendor_services (1-3 services per vendor, enforced by app) ----------
create table if not exists public.vendor_services (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  description text,
  category text not null default 'general',
  mode text not null default 'both'
    check (mode in ('in_person','mobile','both')),
  price numeric(10,2) not null check (price >= 0),
  duration_minutes int not null default 60 check (duration_minutes between 15 and 480),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- vendor_availability ----------
create table if not exists public.vendor_availability (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.users(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  created_at timestamptz not null default now(),
  constraint vendor_availability_window unique (vendor_id, starts_at)
);

-- ---------- vendor_bookings ----------
create table if not exists public.vendor_bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.vendor_services(id),
  provider_id uuid not null references public.users(id) on delete cascade,
  learner_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','booked','in_progress','completed','cancelled')),
  starts_at timestamptz not null,
  ends_at timestamptz not null check (ends_at > starts_at),
  total_price numeric(10,2) not null default 0,
  address text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists vendor_bookings_provider_idx
  on public.vendor_bookings (provider_id, starts_at);
create index if not exists vendor_bookings_learner_idx
  on public.vendor_bookings (learner_id, starts_at);

-- no overlapping active bookings per provider
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'no_provider_overlap'
      and conrelid = 'public.vendor_bookings'::regclass
  ) then
    alter table public.vendor_bookings
      add constraint no_provider_overlap
      exclude using gist (
        provider_id with =,
        tstzrange(starts_at, ends_at) with &&
      ) where (status in ('booked','in_progress'));
  end if;
end $$;

-- ---------- vendor_service_links ----------
create table if not exists public.vendor_service_links (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.vendor_bookings(id) on delete cascade,
  service_id uuid not null references public.vendor_services(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint vendor_service_link_unique unique (booking_id, service_id)
);

-- ---------- vendor_booking_ratings ----------
create table if not exists public.vendor_booking_ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.vendor_bookings(id) on delete cascade,
  learner_id uuid not null references public.users(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  constraint vendor_booking_rating_unique unique (booking_id, learner_id)
);

-- ---------- vendor_ratings (per-service aggregates) ----------
create table if not exists public.vendor_ratings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null unique references public.vendor_services(id) on delete cascade,
  vendor_id uuid not null references public.users(id) on delete cascade,
  avg_rating numeric(3,2) not null default 0 check (avg_rating between 0 and 5),
  rating_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------- vendor_booking_escalations ----------
create table if not exists public.vendor_booking_escalations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.vendor_bookings(id) on delete cascade,
  raised_by uuid not null references public.users(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open','resolved','dismissed')),
  resolution text,
  created_at timestamptz not null default now()
);

-- ---------- vendor_booking_reschedules ----------
create table if not exists public.vendor_booking_reschedules (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.vendor_bookings(id) on delete cascade,
  proposed_by uuid not null references public.users(id) on delete cascade,
  new_starts_at timestamptz not null,
  new_ends_at timestamptz not null check (new_ends_at > new_starts_at),
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','expired')),
  created_at timestamptz not null default now()
);

-- ---------- vendor_booking_consensus ----------
create table if not exists public.vendor_booking_consensus (
  id uuid primary key default gen_random_uuid(),
  reschedule_id uuid not null references public.vendor_booking_reschedules(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  accepted boolean not null default false,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  constraint vendor_consensus_unique unique (reschedule_id, user_id)
);

-- ---------- RLS ----------
alter table public.vendor_services enable row level security;
alter table public.vendor_availability enable row level security;
alter table public.vendor_bookings enable row level security;
alter table public.vendor_service_links enable row level security;
alter table public.vendor_booking_ratings enable row level security;
alter table public.vendor_ratings enable row level security;
alter table public.vendor_booking_escalations enable row level security;
alter table public.vendor_booking_reschedules enable row level security;
alter table public.vendor_booking_consensus enable row level security;

-- vendor_services
drop policy if exists "public reads active services" on public.vendor_services;
create policy "public reads active services" on public.vendor_services
  for select using (is_active or vendor_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "vendor manages services" on public.vendor_services;
create policy "vendor manages services" on public.vendor_services
  for insert with check (vendor_id = auth.uid());

drop policy if exists "vendor updates services" on public.vendor_services;
create policy "vendor updates services" on public.vendor_services
  for update using (vendor_id = auth.uid() or public.is_admin(auth.uid()));

-- vendor_availability
drop policy if exists "public reads availability" on public.vendor_availability;
create policy "public reads availability" on public.vendor_availability
  for select using (true);

drop policy if exists "vendor manages availability" on public.vendor_availability;
create policy "vendor manages availability" on public.vendor_availability
  for insert with check (vendor_id = auth.uid());

drop policy if exists "vendor updates availability" on public.vendor_availability;
create policy "vendor updates availability" on public.vendor_availability
  for update using (vendor_id = auth.uid());

-- vendor_bookings
drop policy if exists "booking parties read" on public.vendor_bookings;
create policy "booking parties read" on public.vendor_bookings
  for select using (
    learner_id = auth.uid() or provider_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists "learner creates booking" on public.vendor_bookings;
create policy "learner creates booking" on public.vendor_bookings
  for insert with check (learner_id = auth.uid());

drop policy if exists "booking parties update" on public.vendor_bookings;
create policy "booking parties update" on public.vendor_bookings
  for update using (
    learner_id = auth.uid() or provider_id = auth.uid() or public.is_admin(auth.uid())
  );

-- vendor_service_links
drop policy if exists "link parties read" on public.vendor_service_links;
create policy "link parties read" on public.vendor_service_links
  for select using (
    exists (select 1 from public.vendor_bookings b
            where b.id = vendor_service_links.booking_id
              and (b.learner_id = auth.uid() or b.provider_id = auth.uid()
                   or public.is_admin(auth.uid())))
  );

drop policy if exists "learner creates link" on public.vendor_service_links;
create policy "learner creates link" on public.vendor_service_links
  for insert with check (
    exists (select 1 from public.vendor_bookings b
            where b.id = vendor_service_links.booking_id
              and b.learner_id = auth.uid())
  );

-- vendor_booking_ratings
drop policy if exists "booking parties read ratings" on public.vendor_booking_ratings;
create policy "booking parties read ratings" on public.vendor_booking_ratings
  for select using (
    exists (select 1 from public.vendor_bookings b
            where b.id = vendor_booking_ratings.booking_id
              and (b.learner_id = auth.uid() or b.provider_id = auth.uid()
                   or public.is_admin(auth.uid())))
  );

drop policy if exists "learner rates booking" on public.vendor_booking_ratings;
create policy "learner rates booking" on public.vendor_booking_ratings
  for insert with check (learner_id = auth.uid());

-- vendor_ratings
drop policy if exists "public reads aggregates" on public.vendor_ratings;
create policy "public reads aggregates" on public.vendor_ratings
  for select using (true);

drop policy if exists "admin updates aggregates" on public.vendor_ratings;
create policy "admin updates aggregates" on public.vendor_ratings
  for update using (public.is_admin(auth.uid()));

-- vendor_booking_escalations
drop policy if exists "parties read escalations" on public.vendor_booking_escalations;
create policy "parties read escalations" on public.vendor_booking_escalations
  for select using (
    raised_by = auth.uid() or public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_bookings b
               where b.id = vendor_booking_escalations.booking_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()))
  );

drop policy if exists "parties raise escalations" on public.vendor_booking_escalations;
create policy "parties raise escalations" on public.vendor_booking_escalations
  for insert with check (raised_by = auth.uid());

drop policy if exists "admin resolves escalations" on public.vendor_booking_escalations;
create policy "admin resolves escalations" on public.vendor_booking_escalations
  for update using (public.is_admin(auth.uid()));

-- vendor_booking_reschedules
drop policy if exists "parties read reschedules" on public.vendor_booking_reschedules;
create policy "parties read reschedules" on public.vendor_booking_reschedules
  for select using (
    proposed_by = auth.uid() or public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_bookings b
               where b.id = vendor_booking_reschedules.booking_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()))
  );

drop policy if exists "parties propose reschedules" on public.vendor_booking_reschedules;
create policy "parties propose reschedules" on public.vendor_booking_reschedules
  for insert with check (proposed_by = auth.uid());

-- vendor_booking_consensus
drop policy if exists "parties read consensus" on public.vendor_booking_consensus;
create policy "parties read consensus" on public.vendor_booking_consensus
  for select using (
    public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_booking_reschedules r
               join public.vendor_bookings b on b.id = r.booking_id
               where r.id = vendor_booking_consensus.reschedule_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()
                      or r.proposed_by = auth.uid()))
  );

drop policy if exists "parties vote consensus" on public.vendor_booking_consensus;
create policy "parties vote consensus" on public.vendor_booking_consensus
  for insert with check (user_id = auth.uid());
