create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'recruiter', 'candidate');
create type public.job_status as enum ('Draft', 'Open', 'Closed');
create type public.job_type as enum ('Full-time', 'Part-time', 'Internship');
create type public.application_stage as enum ('Applied', 'Shortlisted', 'Interview', 'Offer', 'Hired', 'Rejected', 'Withdrawn');
create type public.automation_status as enum ('pending', 'processing', 'completed', 'failed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role public.user_role not null default 'candidate',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text not null,
  location text not null,
  type public.job_type not null,
  status public.job_status not null default 'Draft',
  description text not null,
  requirements text[] not null default '{}',
  deadline date not null,
  openings integer not null check (openings > 0),
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.job_recruiters (
  job_id uuid not null references public.jobs(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (job_id, recruiter_id)
);

create table public.candidate_cvs (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  file_size integer not null check (file_size > 0 and file_size <= 2097152),
  mime_type text not null check (mime_type = 'application/pdf'),
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  candidate_id uuid not null references public.profiles(id) on delete cascade,
  cv_id uuid not null references public.candidate_cvs(id),
  stage public.application_stage not null default 'Applied',
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index one_active_application_per_job on public.applications (job_id, candidate_id)
where stage not in ('Withdrawn', 'Rejected', 'Hired');

create table public.application_stage_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  from_stage public.application_stage,
  to_stage public.application_stage not null,
  changed_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table public.recruiter_notes (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  recruiter_id uuid not null references public.profiles(id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text,
  meeting_url text,
  created_at timestamptz not null default now(),
  check (ends_at = starts_at + interval '1 hour'),
  check (starts_at > now())
);

create table public.ai_summaries (
  application_id uuid primary key references public.applications(id) on delete cascade,
  status public.automation_status not null default 'pending',
  profile_bullets jsonb not null default '[]',
  requirements_found jsonb not null default '[]',
  requirements_missing jsonb not null default '[]',
  interview_questions jsonb not null default '[]',
  is_ai_generated boolean not null default true,
  failure_message text,
  updated_at timestamptz not null default now()
);

create table public.automation_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  application_id uuid references public.applications(id) on delete cascade,
  payload jsonb not null default '{}',
  status public.automation_status not null default 'pending',
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.email_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  application_id uuid references public.applications(id) on delete cascade,
  recipient text not null,
  status public.automation_status not null default 'pending',
  provider_message_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.job_recruiters enable row level security;
alter table public.candidate_cvs enable row level security;
alter table public.applications enable row level security;
alter table public.application_stage_history enable row level security;
alter table public.recruiter_notes enable row level security;
alter table public.interviews enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.automation_events enable row level security;
alter table public.email_events enable row level security;

create or replace function public.current_role() returns public.user_role language sql stable security invoker as $$
  select nullif((select auth.jwt() -> 'app_metadata' ->> 'role'), '')::public.user_role;
$$;

create policy "public can view open jobs" on public.jobs for select to anon, authenticated using (status = 'Open' and deadline >= current_date or public.current_role() = 'admin');
create policy "admins manage jobs" on public.jobs for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "users view own profile" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.current_role() = 'admin');
create policy "admins manage profiles" on public.profiles for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "candidates view own applications" on public.applications for select to authenticated using (candidate_id = (select auth.uid()));
create policy "recruiters view assigned applications" on public.applications for select to authenticated using (exists (select 1 from public.job_recruiters jr where jr.job_id = applications.job_id and jr.recruiter_id = (select auth.uid())) or public.current_role() = 'admin');
create policy "candidates create applications" on public.applications for insert to authenticated with check (candidate_id = (select auth.uid()) and public.current_role() = 'candidate');
create policy "candidates withdraw applications" on public.applications for update to authenticated using (candidate_id = (select auth.uid()) and stage not in ('Hired','Rejected')) with check (candidate_id = (select auth.uid()) and stage = 'Withdrawn');
create policy "recruiters update assigned applications" on public.applications for update to authenticated using (exists (select 1 from public.job_recruiters jr where jr.job_id = applications.job_id and jr.recruiter_id = (select auth.uid()))) with check (exists (select 1 from public.job_recruiters jr where jr.job_id = applications.job_id and jr.recruiter_id = (select auth.uid())));
create policy "admins view all applications" on public.applications for select to authenticated using (public.current_role() = 'admin');
create policy "candidates view own cv metadata" on public.candidate_cvs for select to authenticated using (candidate_id = (select auth.uid()));
create policy "candidates upload own cv metadata" on public.candidate_cvs for insert to authenticated with check (candidate_id = (select auth.uid()));
create policy "assigned recruiters view cv metadata" on public.candidate_cvs for select to authenticated using (exists (select 1 from public.applications a join public.job_recruiters jr on jr.job_id = a.job_id where a.cv_id = candidate_cvs.id and jr.recruiter_id = (select auth.uid())) or public.current_role() = 'admin');
create policy "assigned recruiters view notes" on public.recruiter_notes for all to authenticated using (recruiter_id = (select auth.uid()) or public.current_role() = 'admin') with check (recruiter_id = (select auth.uid()));
create policy "participants view interviews" on public.interviews for select to authenticated using (recruiter_id = (select auth.uid()) or exists (select 1 from public.applications a where a.id = interviews.application_id and a.candidate_id = (select auth.uid())) or public.current_role() = 'admin');
create policy "assigned recruiters manage interviews" on public.interviews for all to authenticated using (recruiter_id = (select auth.uid()) or public.current_role() = 'admin') with check (recruiter_id = (select auth.uid()));
create policy "assigned recruiters view summaries" on public.ai_summaries for select to authenticated using (exists (select 1 from public.applications a join public.job_recruiters jr on jr.job_id = a.job_id where a.id = ai_summaries.application_id and jr.recruiter_id = (select auth.uid())) or public.current_role() = 'admin');

create policy "recruiters view assigned jobs" on public.jobs for select to authenticated using (exists (select 1 from public.job_recruiters jr where jr.job_id = jobs.id and jr.recruiter_id = (select auth.uid())) or public.current_role() = 'admin');
create policy "admins manage job assignments" on public.job_recruiters for all to authenticated using (public.current_role() = 'admin') with check (public.current_role() = 'admin');
create policy "recruiters view own assignments" on public.job_recruiters for select to authenticated using (recruiter_id = (select auth.uid()) or public.current_role() = 'admin');
create policy "candidates view own stage history" on public.application_stage_history for select to authenticated using (exists (select 1 from public.applications a where a.id = application_stage_history.application_id and a.candidate_id = (select auth.uid())) or public.current_role() = 'admin' or exists (select 1 from public.applications a join public.job_recruiters jr on jr.job_id = a.job_id where a.id = application_stage_history.application_id and jr.recruiter_id = (select auth.uid())));

insert into storage.buckets (id, name, public) values ('candidate-cvs', 'candidate-cvs', false) on conflict (id) do nothing;
create policy "candidates upload own private cv" on storage.objects for insert to authenticated with check (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "candidates read own private cv" on storage.objects for select to authenticated using (bucket_id = 'candidate-cvs' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins and assigned recruiters read private cv" on storage.objects for select to authenticated using (bucket_id = 'candidate-cvs' and (public.current_role() in ('admin', 'recruiter')));
