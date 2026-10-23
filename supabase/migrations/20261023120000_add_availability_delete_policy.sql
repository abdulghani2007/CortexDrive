-- V2 (vendor booking flow): vendors need to remove their own availability windows.
-- The original vendor migration created select/insert/update policies but no
-- DELETE policy, so slot removal was blocked by RLS.

drop policy if exists "vendor deletes availability" on public.vendor_availability;
create policy "vendor deletes availability" on public.vendor_availability
  for delete using (vendor_id = auth.uid());
