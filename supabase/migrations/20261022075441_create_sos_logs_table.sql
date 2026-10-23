create table if not exists sos_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lat double precision,
  lng double precision,
  note text,
  booking_id uuid,
  created_at timestamptz default now()
);
alter table sos_logs enable row level security;
create policy sos_logs_select on sos_logs for select using (auth.uid() = user_id or exists (select 1 from admins a where a.user_id = auth.uid()));
create policy sos_logs_insert on sos_logs for insert with check (auth.uid() = user_id);
create policy sos_logs_update on sos_logs for update using (exists (select 1 from admins a where a.user_id = auth.uid())) with check (exists (select 1 from admins a where a.user_id = auth.uid()));
