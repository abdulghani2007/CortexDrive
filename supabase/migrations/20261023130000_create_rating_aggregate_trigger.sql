-- V3 (ratings): maintain per-service aggregate in vendor_ratings.
-- The RLS on vendor_ratings only allows admin updates, so the app cannot
-- maintain the aggregate. This SECURITY DEFINER trigger does it atomically
-- on each rating insert. Safe to re-run.

create or replace function public.update_service_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into vendor_ratings (service_id, vendor_id, avg_rating, rating_count, updated_at)
  select
    b.service_id,
    b.provider_id,
    round(avg(r.rating)::numeric, 2),
    count(*)::int,
    now()
  from vendor_booking_ratings r
  join vendor_bookings b on b.id = r.booking_id
  where b.service_id = (select service_id from vendor_bookings where id = new.booking_id)
  group by b.service_id, b.provider_id
  on conflict (service_id) do update
    set avg_rating = excluded.avg_rating,
        rating_count = excluded.rating_count,
        updated_at = now();
  return new;
end $$;

drop trigger if exists vendor_booking_rating_agg on public.vendor_booking_ratings;
create trigger vendor_booking_rating_agg
  after insert on public.vendor_booking_ratings
  for each row execute function public.update_service_rating();
