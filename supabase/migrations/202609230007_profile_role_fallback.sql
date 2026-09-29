create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    nullif((select auth.jwt() -> 'app_metadata' ->> 'role'), '')::public.user_role,
    (select p.role from public.profiles p where p.id = (select auth.uid()))
  );
$$;

revoke all on function public.current_role() from public, anon;
grant execute on function public.current_role() to authenticated;
