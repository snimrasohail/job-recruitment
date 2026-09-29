drop policy if exists "authenticated users can view all jobs" on public.jobs;
drop policy if exists "candidates can view all jobs" on public.jobs;

create policy "candidates can view all job statuses"
on public.jobs
for select
to authenticated
using (public.current_role() = 'candidate');
