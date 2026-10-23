-- V4 (reschedules + consensus): the original vendor migration created only
-- SELECT/INSERT policies on these tables. Accepting or rejecting a reschedule
-- proposal (and updating a consensus vote) requires UPDATE policies, otherwise
-- RLS silently denies the write. Safe to re-run.

-- Client-callable admin check for the escalation admin page (is_admin takes a
-- uid argument, which is awkward to call from supabase-js with auth.uid()).
create or replace function public.is_admin_current_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin(auth.uid());
$$;

drop policy if exists "parties update reschedules" on public.vendor_booking_reschedules;
create policy "parties update reschedules" on public.vendor_booking_reschedules
  for update using (
    proposed_by = auth.uid()
    or public.is_admin(auth.uid())
    or exists (select 1 from public.vendor_bookings b
               where b.id = vendor_booking_reschedules.booking_id
                 and (b.learner_id = auth.uid() or b.provider_id = auth.uid()))
  );

drop policy if exists "voters update consensus" on public.vendor_booking_consensus;
create policy "voters update consensus" on public.vendor_booking_consensus
  for update using (user_id = auth.uid());
