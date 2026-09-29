create index if not exists applications_candidate_id_idx on public.applications(candidate_id);
create index if not exists applications_cv_id_idx on public.applications(cv_id);
create index if not exists applications_job_id_idx on public.applications(job_id);
create index if not exists application_stage_history_application_id_idx on public.application_stage_history(application_id);
create index if not exists application_stage_history_changed_by_idx on public.application_stage_history(changed_by);
create index if not exists candidate_cvs_candidate_id_idx on public.candidate_cvs(candidate_id);
create index if not exists email_events_application_id_idx on public.email_events(application_id);
create index if not exists interviews_application_id_idx on public.interviews(application_id);
create index if not exists interviews_recruiter_id_idx on public.interviews(recruiter_id);
create index if not exists job_recruiters_recruiter_id_idx on public.job_recruiters(recruiter_id);
create index if not exists jobs_created_by_idx on public.jobs(created_by);
create index if not exists recruiter_notes_application_id_idx on public.recruiter_notes(application_id);
create index if not exists recruiter_notes_recruiter_id_idx on public.recruiter_notes(recruiter_id);
create index if not exists automation_events_application_id_idx on public.automation_events(application_id);

create policy "admins view automation events"
on public.automation_events for select to authenticated
using (public.current_role() = 'admin');

create policy "participants view email events"
on public.email_events for select to authenticated
using (
  public.current_role() = 'admin'
  or exists (
    select 1 from public.applications a
    join public.job_recruiters jr on jr.job_id = a.job_id
    where a.id = email_events.application_id and jr.recruiter_id = (select auth.uid())
  )
  or exists (
    select 1 from public.applications a
    where a.id = email_events.application_id and a.candidate_id = (select auth.uid())
  )
);
