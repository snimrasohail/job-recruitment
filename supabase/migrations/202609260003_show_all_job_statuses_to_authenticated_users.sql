drop policy if exists "candidates can view all jobs" on public.jobs;

create policy "authenticated users can view all jobs"
on public.jobs
for select
to authenticated
using ((select auth.uid()) is not null);
