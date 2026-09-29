create or replace function public.close_filled_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.stage = 'Hired' then
    update public.jobs
    set status = 'Closed'
    where id = new.job_id
      and (select count(*) from public.applications where job_id = new.job_id and stage = 'Hired') >= openings;
  end if;
  return new;
end;
$$;

revoke all on function public.close_filled_job() from public, anon, authenticated;
