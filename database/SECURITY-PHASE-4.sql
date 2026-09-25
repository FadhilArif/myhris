-- MyHRIS Security Phase 4
-- Recruitment privacy + public career read + candidate access isolation.
-- Jalankan setelah SECURITY-PHASE-2.sql / Security Phase 3 sudah diterapkan.
-- SQL ini sengaja dibuat idempotent sebisa mungkin.

begin;

-- =========================================================
-- 1. CANDIDATE PROFILES
-- =========================================================
-- Profil pelamar hanya boleh dibaca oleh pemilik akun atau
-- pengguna yang memiliki permission recruitment.manage.

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
using (
  id = auth.uid()
)
with check (
  id = auth.uid()
);

create policy "candidate_profiles_delete_blocked"
on public.candidate_profiles
for delete
to authenticated
using (false);

-- =========================================================
-- 2. CANDIDATES / APPLICATIONS
-- =========================================================
-- HR/Admin/recruitment manager dapat mengelola kandidat.
-- Pelamar hanya dapat melihat lamaran miliknya sendiri.
-- Browser tidak boleh mengubah stage atau menghapus aplikasi.
-- Pelamar hanya boleh membuat lamaran untuk lowongan yang masih open.

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

create policy "candidates_insert_owner_or_recruitment"
on public.candidates
for insert
to authenticated
with check (
  public.has_permission('recruitment.manage')
  or (
    applicant_id = auth.uid()
    and exists (
      select 1
      from public.job_postings jp
      where jp.id = job_posting_id
        and jp.status = 'open'
        and jp.deleted_at is null
    )
  )
);

create policy "candidates_update_recruitment_only"
on public.candidates
for update
to authenticated
using (
  public.has_permission('recruitment.manage')
)
with check (
  public.has_permission('recruitment.manage')
);

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
-- 3. JOB POSTINGS
-- =========================================================
-- Lowongan terbuka memang perlu dapat dibaca halaman karir publik.
-- Data kandidat tetap terisolasi oleh RLS candidates di atas.
-- Pengelolaan lowongan hanya lewat recruitment.manage.
-- Delete permanen tetap diblokir; UI memakai soft delete RPC.

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
using (
  public.has_permission('recruitment.manage')
)
with check (
  public.has_permission('recruitment.manage')
);

drop policy if exists "job_postings_delete_blocked" on public.job_postings;
create policy "job_postings_delete_blocked"
on public.job_postings
for delete
to authenticated
using (false);

-- =========================================================
-- 4. PUBLIC DEPARTMENT NAMES FOR CAREER PAGE
-- =========================================================
-- Hanya nama department aktif yang diperlukan untuk label lowongan.
-- Tidak membuka data karyawan.

drop policy if exists "departments_select_public_active" on public.departments;
create policy "departments_select_public_active"
on public.departments
for select
to anon
using (
  deleted_at is null
);

-- =========================================================
-- 5. DEFENSIVE COLUMN DEFAULTS / INDEX
-- =========================================================

create index if not exists job_postings_public_open_idx
  on public.job_postings(status, opened_date desc)
  where deleted_at is null and status = 'open';

commit;
