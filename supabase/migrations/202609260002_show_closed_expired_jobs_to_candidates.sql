create policy "candidates can view all jobs"
on public.jobs
for select
to authenticated
using (
  public.current_role() = 'candidate'
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'candidate'
  )
);
