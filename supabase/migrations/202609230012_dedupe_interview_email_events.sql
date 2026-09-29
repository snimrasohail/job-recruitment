create or replace function public.record_application_stage_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage = old.stage then
    return new;
  end if;

  insert into public.application_stage_history (application_id, from_stage, to_stage, changed_by)
  values (new.id, old.stage, new.stage, (select auth.uid()));

  if new.stage in ('Hired', 'Rejected') then
    insert into public.email_events (event_type, application_id, recipient)
    select case when new.stage = 'Hired' then 'application.hired' else 'application.rejected' end, new.id, p.email
    from public.profiles p where p.id = new.candidate_id;
  end if;
  return new;
end;
$$;

revoke all on function public.record_application_stage_change() from public, anon, authenticated;
