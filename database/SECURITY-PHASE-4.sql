-- MyHRIS Security Phase 4
-- Recruitment privacy + detailed career information + application journey tracking.
-- Jalankan setelah SECURITY-PHASE-2.sql / Security Phase 3.
-- Idempotent sebisa mungkin.

begin;

-- =========================================================
-- 1. RECRUITMENT DATA MODEL
-- =========================================================

alter table public.job_postings
  add column if not exists requirements text,
  add column if not exists responsibilities text,
  add column if not exists placement text,
  add column if not exists work_system text default 'on_site',
  add column if not exists salary_min numeric,
  add column if not exists salary_max numeric;

-- Normalisasi nilai lama / kosong.
update public.job_postings
set work_system = 'on_site'
where work_system is null or trim(work_system) = '';

-- =========================================================
-- 2. CANDIDATE PROFILES PRIVACY
-- =========================================================

alter table public.candidate_profiles enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidate_profiles'
  loop
    execute format(
      'drop policy if exists %I on public.candidate_profiles',
      p.policyname
    );
  end loop;
end $$;

create policy "candidate_profiles_select_owner_or_recruitment"
on public.candidate_profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.has_permission('recruitment.manage')
);

create policy "candidate_profiles_insert_owner"
on public.candidate_profiles
for insert
to authenticated
with check (
  id = auth.uid()
);

create policy "candidate_profiles_update_owner"
on public.candidate_profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "candidate_profiles_delete_blocked"
on public.candidate_profiles
for delete
to authenticated
using (false);

-- =========================================================
-- 3. CANDIDATES / APPLICATIONS PRIVACY
-- =========================================================

alter table public.candidates enable row level security;

do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'candidates'
  loop
    execute format(
      'drop policy if exists %I on public.candidates',
      p.policyname
    );
  end loop;
end $$;

create policy "candidates_select_owner_or_recruitment"
on public.candidates
for select
to authenticated
using (
  public.has_permission('recruitment.manage')
  or applicant_id = auth.uid()
);

create policy "candidates_insert_recruitment_only"
on public.candidates
for insert
to authenticated
with check (
  public.has_permission('recruitment.manage')
);

create policy "candidates_update_recruitment_only"
on public.candidates
for update
to authenticated
using (public.has_permission('recruitment.manage'))
with check (public.has_permission('recruitment.manage'));

create policy "candidates_delete_blocked"
on public.candidates
for delete
to authenticated
using (false);

create index if not exists candidates_applicant_id_idx
  on public.candidates(applicant_id);

create index if not exists candidates_job_posting_id_idx
  on public.candidates(job_posting_id);

create index if not exists candidates_applied_at_idx
  on public.candidates(applied_at desc);

-- =========================================================
-- 4. APPLICATION STAGE HISTORY
-- =========================================================

create table if not exists public.candidate_stage_history (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  stage text not null,
  notes text,
  changed_by uuid references auth.users(id),
  changed_at timestamptz not null default now()
);

create index if not exists candidate_stage_history_candidate_idx
  on public.candidate_stage_history(candidate_id, changed_at desc);

create index if not exists candidate_stage_history_stage_idx
  on public.candidate_stage_history(stage);

alter table public.candidate_stage_history enable row level security;

drop policy if exists "candidate_stage_history_select" on public.candidate_stage_history;
create policy "candidate_stage_history_select"
on public.candidate_stage_history
for select
to authenticated
using (
  public.has_permission('recruitment.manage')
  or exists (
    select 1
    from public.candidates c
    where c.id = candidate_id
      and c.applicant_id = auth.uid()
  )
);

drop policy if exists "candidate_stage_history_no_insert" on public.candidate_stage_history;
create policy "candidate_stage_history_no_insert"
on public.candidate_stage_history
for insert
to authenticated
with check (false);

drop policy if exists "candidate_stage_history_no_update" on public.candidate_stage_history;
create policy "candidate_stage_history_no_update"
on public.candidate_stage_history
for update
to authenticated
using (false)
with check (false);

drop policy if exists "candidate_stage_history_no_delete" on public.candidate_stage_history;
create policy "candidate_stage_history_no_delete"
on public.candidate_stage_history
for delete
to authenticated
using (false);

-- =========================================================
-- 5. NORMALIZE STAGE VALUES
-- =========================================================

update public.candidates
set stage = case stage
  when 'applied' then 'administrative_selection'
  when 'screening' then 'administrative_selection'
  when 'interview' then 'hr_interview'
  when 'offer' then 'job_offer'
  when 'hired' then 'job_offer'
  when 'rejected' then 'rejected'
  when 'administrative_selection' then 'administrative_selection'
  when 'psychotest' then 'psychotest'
  when 'hr_interview' then 'hr_interview'
  when 'user_interview' then 'user_interview'
  when 'medical_checkup' then 'medical_checkup'
  when 'salary_negotiation' then 'salary_negotiation'
  when 'job_offer' then 'job_offer'
  else 'administrative_selection'
end;

alter table public.candidates
  drop constraint if exists candidates_stage_check;

alter table public.candidates
  add constraint candidates_stage_check
  check (
    stage in (
      'administrative_selection',
      'psychotest',
      'hr_interview',
      'user_interview',
      'medical_checkup',
      'salary_negotiation',
      'job_offer',
      'rejected'
    )
  )
  not valid;

alter table public.job_postings
  drop constraint if exists job_postings_status_check,
  drop constraint if exists job_postings_work_system_check,
  drop constraint if exists job_postings_salary_range_check;

alter table public.job_postings
  add constraint job_postings_status_check
  check (status in ('open','closed'))
  not valid;

alter table public.job_postings
  add constraint job_postings_work_system_check
  check (work_system in ('on_site','hybrid','remote'))
  not valid;

alter table public.job_postings
  add constraint job_postings_salary_range_check
  check (
    salary_min is null
    or (
      salary_min >= 0
      and (salary_max is null or salary_max >= salary_min)
    )
  )
  not valid;

-- =========================================================
-- 6. SECURE APPLICATION SUBMISSION
-- =========================================================

create or replace function public.submit_candidate_application(
  p_job_posting_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_user_id uuid;
  v_job public.job_postings%rowtype;
  v_profile public.candidate_profiles%rowtype;
  v_application_id uuid;
  v_recent_count integer;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_job
  from public.job_postings
  where id = p_job_posting_id
  for update;

  if not found
     or v_job.deleted_at is not null
     or v_job.status <> 'open' then
    raise exception 'Lowongan tidak tersedia';
  end if;

  select *
  into v_profile
  from public.candidate_profiles
  where id = v_user_id;

  if not found
     or nullif(trim(v_profile.full_name), '') is null
     or nullif(trim(v_profile.phone), '') is null then
    raise exception 'Lengkapi profil pelamar terlebih dahulu';
  end if;

  select count(*)
  into v_recent_count
  from public.candidates
  where applicant_id = v_user_id
    and applied_at >= now() - interval '24 hours';

  if v_recent_count >= 20 then
    raise exception 'Batas pengajuan lamaran sementara tercapai. Coba lagi nanti.';
  end if;

  if exists (
    select 1
    from public.candidates
    where job_posting_id = p_job_posting_id
      and applicant_id = v_user_id
  ) then
    raise exception 'Anda sudah melamar lowongan ini';
  end if;

  insert into public.candidates (
    job_posting_id,
    applicant_id,
    full_name,
    email,
    phone,
    stage
  )
  values (
    p_job_posting_id,
    v_user_id,
    trim(v_profile.full_name),
    coalesce(nullif(trim(v_profile.email), ''), (
      select email from auth.users where id = v_user_id
    )),
    trim(v_profile.phone),
    'administrative_selection'
  )
  returning id into v_application_id;

  insert into public.candidate_stage_history (
    candidate_id,
    stage,
    notes,
    changed_by
  )
  values (
    v_application_id,
    'administrative_selection',
    'Lamaran diterima dan masuk proses seleksi administrasi.',
    v_user_id
  );

  perform public.record_audit(
    'recruitment.application_submit',
    'candidates',
    v_application_id,
    null,
    jsonb_build_object(
      'job_posting_id', p_job_posting_id,
      'stage', 'administrative_selection'
    )
  );

  return v_application_id;
end;
$fn$;

revoke all on function public.submit_candidate_application(uuid) from public;
grant execute on function public.submit_candidate_application(uuid) to authenticated;

-- =========================================================
-- 7. SECURE STAGE UPDATE
-- =========================================================

create or replace function public.update_candidate_stage(
  p_candidate_id uuid,
  p_stage text,
  p_notes text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_old_stage text;
  v_job_id uuid;
begin
  if auth.uid() is null or not public.has_permission('recruitment.manage') then
    raise exception 'Not authorized';
  end if;

  if p_stage not in (
    'administrative_selection',
    'psychotest',
    'hr_interview',
    'user_interview',
    'medical_checkup',
    'salary_negotiation',
    'job_offer',
    'rejected'
  ) then
    raise exception 'Tahap kandidat tidak valid';
  end if;

  select stage, job_posting_id
  into v_old_stage, v_job_id
  from public.candidates
  where id = p_candidate_id;

  if not found then
    raise exception 'Kandidat tidak ditemukan';
  end if;

  update public.candidates
  set stage = p_stage
  where id = p_candidate_id;

  if v_old_stage is distinct from p_stage then
    insert into public.candidate_stage_history (
      candidate_id,
      stage,
      notes,
      changed_by
    )
    values (
      p_candidate_id,
      p_stage,
      left(nullif(trim(coalesce(p_notes, '')), ''), 1000),
      auth.uid()
    );

    perform public.record_audit(
      'recruitment.candidate_stage_update',
      'candidates',
      p_candidate_id,
      jsonb_build_object('stage', v_old_stage),
      jsonb_build_object(
        'stage', p_stage,
        'notes', left(nullif(trim(coalesce(p_notes, '')), ''), 1000)
      )
    );
  end if;

  return true;
end;
$fn$;

revoke all on function public.update_candidate_stage(uuid,text,text) from public;
grant execute on function public.update_candidate_stage(uuid,text,text) to authenticated;

-- =========================================================
-- 7A. SECURE MANUAL CANDIDATE CREATION
-- =========================================================

create or replace function public.create_recruitment_candidate(
  p_job_posting_id uuid,
  p_full_name text,
  p_email text default null,
  p_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_candidate_id uuid;
begin
  if auth.uid() is null or not public.has_permission('recruitment.manage') then
    raise exception 'Not authorized';
  end if;

  if nullif(trim(p_full_name), '') is null then
    raise exception 'Nama kandidat wajib diisi';
  end if;

  if nullif(trim(coalesce(p_email, '')), '') is null
     and nullif(trim(coalesce(p_phone, '')), '') is null then
    raise exception 'Minimal email atau telepon wajib diisi';
  end if;

  if not exists (
    select 1
    from public.job_postings
    where id = p_job_posting_id
      and deleted_at is null
  ) then
    raise exception 'Lowongan tidak ditemukan';
  end if;

  insert into public.candidates (
    job_posting_id,
    applicant_id,
    full_name,
    email,
    phone,
    stage
  )
  values (
    p_job_posting_id,
    null,
    left(trim(p_full_name), 160),
    left(nullif(trim(coalesce(p_email, '')), ''), 180),
    left(nullif(trim(coalesce(p_phone, '')), ''), 40),
    'administrative_selection'
  )
  returning id into v_candidate_id;

  insert into public.candidate_stage_history (
    candidate_id,
    stage,
    notes,
    changed_by
  )
  values (
    v_candidate_id,
    'administrative_selection',
    'Kandidat ditambahkan secara manual oleh tim rekrutmen.',
    auth.uid()
  );

  perform public.record_audit(
    'recruitment.candidate_create',
    'candidates',
    v_candidate_id,
    null,
    jsonb_build_object(
      'job_posting_id', p_job_posting_id,
      'stage', 'administrative_selection'
    )
  );

  return v_candidate_id;
end;
$fn$;

revoke all on function public.create_recruitment_candidate(uuid,text,text,text) from public;
grant execute on function public.create_recruitment_candidate(uuid,text,text,text) to authenticated;

-- Seed history for existing candidates without any timeline.
insert into public.candidate_stage_history (
  candidate_id,
  stage,
  notes,
  changed_by,
  changed_at
)
select
  c.id,
  c.stage,
  'Riwayat awal dari data kandidat yang sudah ada.',
  null,
  coalesce(c.applied_at, now())
from public.candidates c
where not exists (
  select 1
  from public.candidate_stage_history h
  where h.candidate_id = c.id
);

-- =========================================================
-- 8. JOB POSTINGS RLS
-- =========================================================

alter table public.job_postings enable row level security;

drop policy if exists "job_postings_select_active_hr" on public.job_postings;
drop policy if exists "job_postings_select_active_staff" on public.job_postings;
drop policy if exists "job_postings_select_public_open" on public.job_postings;

create policy "job_postings_select_active_staff"
on public.job_postings
for select
to authenticated
using (
  deleted_at is null
  and public.has_permission('recruitment.manage')
);

create policy "job_postings_select_public_open"
on public.job_postings
for select
to anon, authenticated
using (
  deleted_at is null
  and status = 'open'
);

drop policy if exists "job_postings_write_hr" on public.job_postings;
create policy "job_postings_write_recruitment"
on public.job_postings
for insert
to authenticated
with check (
  public.has_permission('recruitment.manage')
);

drop policy if exists "job_postings_update_hr" on public.job_postings;
create policy "job_postings_update_recruitment"
on public.job_postings
for update
to authenticated
using (public.has_permission('recruitment.manage'))
with check (public.has_permission('recruitment.manage'));

drop policy if exists "job_postings_delete_blocked" on public.job_postings;
create policy "job_postings_delete_blocked"
on public.job_postings
for delete
to authenticated
using (false);

-- =========================================================
-- 9. PUBLIC DEPARTMENT NAMES
-- =========================================================

drop policy if exists "departments_select_public_active" on public.departments;
create policy "departments_select_public_active"
on public.departments
for select
to anon
using (deleted_at is null);

-- =========================================================
-- 10. INDEXES
-- =========================================================

create index if not exists job_postings_public_open_idx
  on public.job_postings(status, opened_date desc)
  where deleted_at is null and status = 'open';

create index if not exists job_postings_work_system_idx
  on public.job_postings(work_system);

commit;
