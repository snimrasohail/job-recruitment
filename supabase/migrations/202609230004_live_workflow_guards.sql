create policy "recruiters view candidate profiles"
on public.profiles for select to authenticated
using (
  exists (
    select 1 from public.applications a
    join public.job_recruiters jr on jr.job_id = a.job_id
    where a.candidate_id = profiles.id and jr.recruiter_id = (select auth.uid())
  )
);

create or replace function public.validate_application_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allowed boolean := false;
begin
  if new.stage = old.stage then return new; end if;
  if old.stage in ('Hired', 'Rejected', 'Withdrawn') then
    raise exception 'This application is final and cannot be changed';
  end if;
  if new.stage = 'Withdrawn' then
    if old.candidate_id <> (select auth.uid()) then raise exception 'Only the candidate can withdraw this application'; end if;
    return new;
  end if;
  if public.current_role() = 'admin' then
    raise exception 'Admins cannot change application decisions';
  end if;
  select exists (
    select 1 from public.job_recruiters jr
    where jr.job_id = new.job_id and jr.recruiter_id = (select auth.uid())
  ) into allowed;
  if not allowed then raise exception 'Recruiter is not assigned to this job'; end if;
  if new.stage = 'Rejected' or (old.stage = 'Applied' and new.stage = 'Shortlisted') or (old.stage = 'Shortlisted' and new.stage = 'Interview') or (old.stage = 'Interview' and new.stage = 'Offer') or (old.stage = 'Offer' and new.stage = 'Hired') then
    return new;
  end if;
  raise exception 'Application stages must move forward one step at a time';
end;
$$;

drop trigger if exists validate_application_change on public.applications;
create trigger validate_application_change before update on public.applications for each row execute procedure public.validate_application_change();

create or replace function public.validate_application_create()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare job_record public.jobs;
begin
  select * into job_record from public.jobs where id = new.job_id;
  if job_record.status <> 'Open' or job_record.deadline < current_date then raise exception 'This job is closed or expired'; end if;
  if (select count(*) from public.applications where job_id = new.job_id and stage not in ('Withdrawn','Rejected','Hired')) > 0 and exists (select 1 from public.applications where job_id = new.job_id and candidate_id = new.candidate_id and stage not in ('Withdrawn','Rejected','Hired')) then raise exception 'You already have an active application for this job'; end if;
  if (select count(*) from public.applications where job_id = new.job_id and stage = 'Hired') >= job_record.openings then raise exception 'This job has filled all openings'; end if;
  if new.candidate_id <> (select auth.uid()) then raise exception 'You can only create your own application'; end if;
  return new;
end;
$$;

drop trigger if exists validate_application_create on public.applications;
create trigger validate_application_create before insert on public.applications for each row execute procedure public.validate_application_create();

create or replace function public.close_filled_job()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.stage = 'Hired' then
    update public.jobs set status = 'Closed' where id = new.job_id and (select count(*) from public.applications where job_id = new.job_id and stage = 'Hired') >= openings;
  end if;
  return new;
end;
$$;
drop trigger if exists close_filled_job on public.applications;
create trigger close_filled_job after insert or update of stage on public.applications for each row execute procedure public.close_filled_job();

create or replace function public.validate_interview_conflict()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.starts_at <= now() or new.ends_at <> new.starts_at + interval '1 hour' then raise exception 'Interview must be a future one-hour slot'; end if;
  if exists (select 1 from public.interviews i where i.recruiter_id = new.recruiter_id and i.id <> new.id and tstzrange(i.starts_at, i.ends_at, '[)') && tstzrange(new.starts_at, new.ends_at, '[)')) then raise exception 'This recruiter already has an overlapping interview'; end if;
  return new;
end;
$$;
drop trigger if exists validate_interview_conflict on public.interviews;
create trigger validate_interview_conflict before insert or update on public.interviews for each row execute procedure public.validate_interview_conflict();

create or replace function public.create_application_automation_records()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.ai_summaries (application_id, status) values (new.id, 'pending') on conflict do nothing;
  insert into public.automation_events (event_type, application_id, payload) values ('application.created', new.id, jsonb_build_object('application_id', new.id, 'job_id', new.job_id, 'candidate_id', new.candidate_id));
  return new;
end;
$$;
revoke all on function public.create_application_automation_records() from public, anon, authenticated;
drop trigger if exists create_application_automation_records on public.applications;
create trigger create_application_automation_records after insert on public.applications for each row execute procedure public.create_application_automation_records();
