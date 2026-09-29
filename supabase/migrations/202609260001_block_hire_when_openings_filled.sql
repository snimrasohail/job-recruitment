create or replace function public.validate_application_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  allowed boolean := false;
  job_record public.jobs;
begin
  if new.stage = old.stage then return new; end if;

  if old.stage in ('Hired', 'Rejected', 'Withdrawn') then
    raise exception 'This application is final and cannot be changed';
  end if;

  if new.stage = 'Withdrawn' then
    if old.candidate_id <> (select auth.uid()) then
      raise exception 'Only the candidate can withdraw this application';
    end if;
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

  if new.stage = 'Hired' then
    select * into job_record from public.jobs where id = new.job_id;
    if (select count(*) from public.applications
        where job_id = new.job_id and stage = 'Hired') >= job_record.openings then
      raise exception 'This job has filled all openings';
    end if;
  end if;

  if new.stage = 'Rejected'
     or (old.stage = 'Applied' and new.stage = 'Shortlisted')
     or (old.stage = 'Shortlisted' and new.stage = 'Interview')
     or (old.stage = 'Interview' and new.stage = 'Offer')
     or (old.stage = 'Offer' and new.stage = 'Hired') then
    return new;
  end if;

  raise exception 'Application stages must move forward one step at a time';
end;
$$;

drop trigger if exists validate_application_change on public.applications;
create trigger validate_application_change
before update on public.applications
for each row execute procedure public.validate_application_change();
