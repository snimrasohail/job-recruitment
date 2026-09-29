drop policy if exists "admins and assigned recruiters read private cv" on storage.objects;

create policy "admins and assigned recruiters read private cv"
on storage.objects for select to authenticated
using (
  bucket_id = 'candidate-cvs'
  and (
    public.current_role() = 'admin'
    or exists (
      select 1
      from public.candidate_cvs cv
      join public.applications a on a.cv_id = cv.id
      join public.job_recruiters jr on jr.job_id = a.job_id
      where cv.storage_path = storage.objects.name
        and jr.recruiter_id = (select auth.uid())
    )
  )
);
