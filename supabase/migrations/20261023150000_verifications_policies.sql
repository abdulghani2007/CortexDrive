-- 20261023150000_verifications_policies.sql
-- Aligns the verifications table with the app's usage and adds RLS policies + storage bucket.

-- 1) Storage bucket for verification uploads (page uploads to 'verifications' bucket)
insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

-- 2) Storage policies: users can upload into their own folder; owners can read their own files.
--    (Admin/service role bypasses via service_role key.)
create policy "verif_storage_insert_own_folder"
on storage.objects for insert to authenticated
with check (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "verif_storage_select_own_folder"
on storage.objects for select to authenticated
using (bucket_id = 'verifications' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Ensure columns used by the app exist (0003_domain.sql may predate later app changes)
alter table public.verifications
  add column if not exists doc_url text,
  add column if not exists selfie_url text,
  add column if not exists ocr_payload jsonb,
  add column if not exists face_match_score numeric,
  add column if not exists ai_decision text;

-- 4) Status/type values used by the page and AI route.
--    Widen constraints by recreating them if they conflict with new values.
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'verifications_type_check'
  ) then
    alter table public.verifications drop constraint verifications_type_check;
  end if;
end $$;
alter table public.verifications
  add constraint verifications_type_check check (type in ('cnic','driving_license','license','registration'));

do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'verifications_status_check'
  ) then
    alter table public.verifications drop constraint verifications_status_check;
  end if;
end $$;
alter table public.verifications
  add constraint verifications_status_check check (status in ('pending','verified','needs_review','rejected','unverified'));

-- 5) RLS policies (0003_domain.sql enabled RLS but added no policies — all client queries were denied)
create policy "verifications_select_own_or_admin"
  on public.verifications for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_admin(auth.uid())
  );

create policy "verifications_insert_own"
  on public.verifications for insert to authenticated
  with check (user_id = auth.uid());

create policy "verifications_update_own_or_admin"
  on public.verifications for update to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

-- 6) license_progress + bookings policies were also missing after 0003_domain
create policy "license_progress_select_own_or_admin"
  on public.license_progress for select to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()));

create policy "license_progress_upsert_own"
  on public.license_progress for all to authenticated
  using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));
