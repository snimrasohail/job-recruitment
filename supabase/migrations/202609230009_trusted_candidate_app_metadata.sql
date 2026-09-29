create or replace function public.current_role()
returns public.user_role
language sql
stable
security invoker
set search_path = public
as $$
  select nullif((select auth.jwt() -> 'app_metadata' ->> 'role'), '')::public.user_role;
$$;

grant execute on function public.current_role() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
    new.email,
    'candidate'
  )
  on conflict (id) do update set email = excluded.email;

  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'candidate')
  where id = new.id
    and coalesce(raw_app_meta_data ->> 'role', '') = '';

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public;

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'candidate')
where email = 'candidate@test.com'
  and coalesce(raw_app_meta_data ->> 'role', '') = '';
