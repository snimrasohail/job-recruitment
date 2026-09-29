create or replace function public.record_application_stage_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.application_stage_history (application_id, from_stage, to_stage, changed_by)
  values (new.id, old.stage, new.stage, (select auth.uid()));
  if new.stage in ('Interview', 'Hired', 'Rejected') then
    insert into public.email_events (event_type, application_id, recipient)
    select case when new.stage = 'Interview' then 'interview.scheduled' when new.stage = 'Hired' then 'application.hired' else 'application.rejected' end, new.id, p.email
    from public.profiles p where p.id = new.candidate_id;
  end if;
  return new;
end;
$$;
revoke all on function public.record_application_stage_change() from public, anon, authenticated;
drop trigger if exists record_application_stage_change on public.applications;
create trigger record_application_stage_change after update of stage on public.applications for each row execute procedure public.record_application_stage_change();

create or replace function public.queue_interview_email()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.email_events (event_type, application_id, recipient)
  select 'interview.scheduled', new.application_id, p.email
  from public.applications a join public.profiles p on p.id = a.candidate_id
  where a.id = new.application_id;
  return new;
end;
$$;
revoke all on function public.queue_interview_email() from public, anon, authenticated;
drop trigger if exists queue_interview_email on public.interviews;
create trigger queue_interview_email after insert on public.interviews for each row execute procedure public.queue_interview_email();
