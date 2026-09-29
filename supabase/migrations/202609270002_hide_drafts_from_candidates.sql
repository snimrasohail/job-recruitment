drop policy if exists "candidates can view all job statuses" on public.jobs;

create policy "candidates can view non_draft jobs"
on public.jobs
for select
to authenticated
using (
  public.current_role() = 'candidate'
  and status <> 'Draft'
);
