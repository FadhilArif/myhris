-- MyHRIS Security Hardening
-- Jalankan SETELAH schema dasar dan ROLE-PERMISSIONS.sql.
-- Fokus: login history, audit RPC, soft delete, RLS hardening.
-- Catatan: backup/restore Supabase dilakukan di level project/platform; prosedurnya didokumentasikan terpisah.

begin;

-- =========================================================
-- 0. Security helper functions
-- SECURITY-HARDENING dibuat self-contained agar tidak wajib
-- menjalankan ROLE-PERMISSIONS.sql terlebih dahulu.
-- =========================================================

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$;

create or replace function public.auth_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $
  select employee_id
  from public.profiles
  where id = auth.uid()
  limit 1
$;

create or replace function public.auth_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $
  select e.department_id
  from public.profiles p
  join public.employees e on e.id = p.employee_id
  where p.id = auth.uid()
  limit 1
$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select coalesce(public.auth_role() in ('admin', 'hr'), false)
$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $
  select coalesce(public.auth_role() = 'admin', false)
$;

-- Helper function tidak boleh dipanggil anonymous.
revoke all on function public.auth_role() from public;
revoke all on function public.auth_employee_id() from public;
revoke all on function public.auth_department_id() from public;
revoke all on function public.is_hr_admin() from public;
revoke all on function public.is_admin() from public;

grant execute on function public.auth_role() to authenticated;
grant execute on function public.auth_employee_id() to authenticated;
grant execute on function public.auth_department_id() to authenticated;
grant execute on function public.is_hr_admin() to authenticated;
grant execute on function public.is_admin() to authenticated;

-- =========================================================
-- 1. Soft delete untuk employee
-- =========================================================
alter table public.employees
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists employees_deleted_at_idx on public.employees(deleted_at);

-- =========================================================
-- 2. Login history
-- =========================================================
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  employee_id uuid references public.employees(id) on delete set null,
  logged_in_at timestamptz not null default now(),
  approximate_location text,
  timezone text,
  device text,
  browser text,
  user_agent text,
  success boolean not null default true
);

create index if not exists login_history_user_time_idx
  on public.login_history(user_id, logged_in_at desc);

create index if not exists login_history_employee_time_idx
  on public.login_history(employee_id, logged_in_at desc);

alter table public.login_history enable row level security;

drop policy if exists "login_history_select_self_or_hr" on public.login_history;
create policy "login_history_select_self_or_hr"
on public.login_history for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_hr_admin()
);

-- Tidak mengizinkan INSERT/UPDATE/DELETE langsung dari browser.
-- Pencatatan dilakukan melalui RPC SECURITY DEFINER di bawah.

drop policy if exists "login_history_insert" on public.login_history;
drop policy if exists "login_history_update" on public.login_history;
drop policy if exists "login_history_delete" on public.login_history;

-- =========================================================
-- 3. RPC pencatatan login
-- Actor/user_id diambil dari auth.uid(), bukan dari browser.
-- =========================================================
create or replace function public.record_login_history(
  p_approximate_location text default null,
  p_timezone text default null,
  p_device text default null,
  p_browser text default null,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_employee_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select employee_id into v_employee_id
  from public.profiles
  where id = auth.uid();

  insert into public.login_history (
    user_id,
    employee_id,
    approximate_location,
    timezone,
    device,
    browser,
    user_agent
  )
  values (
    auth.uid(),
    v_employee_id,
    left(nullif(trim(p_approximate_location), ''), 120),
    left(nullif(trim(p_timezone), ''), 80),
    left(nullif(trim(p_device), ''), 80),
    left(nullif(trim(p_browser), ''), 80),
    left(nullif(trim(p_user_agent), ''), 500)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_login_history(text,text,text,text,text) from public;
grant execute on function public.record_login_history(text,text,text,text,text) to authenticated;

-- =========================================================
-- 4. Audit log: jangan percaya actor_id dari client.
-- Gunakan RPC agar actor_id/name ditentukan server.
-- =========================================================
create or replace function public.record_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid default null,
  p_old_data jsonb default null,
  p_new_data jsonb default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select full_name into v_name
  from public.profiles
  where id = auth.uid();

  insert into public.audit_logs (
    actor_id,
    actor_name,
    action,
    entity,
    entity_id,
    old_data,
    new_data
  )
  values (
    auth.uid(),
    coalesce(v_name, 'Pengguna'),
    left(trim(p_action), 120),
    left(trim(p_entity), 120),
    p_entity_id,
    p_old_data,
    p_new_data
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.record_audit(text,text,uuid,jsonb,jsonb) from public;
grant execute on function public.record_audit(text,text,uuid,jsonb,jsonb) to authenticated;

-- Audit log tidak boleh ditulis langsung oleh client.
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;

-- =========================================================
-- 5. Audit log lebih ketat: hanya baca sesuai role, immutable.
-- =========================================================
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_hr" on public.audit_logs;
create policy "audit_logs_select_hr"
on public.audit_logs for select
to authenticated
using (public.is_hr_admin());

drop policy if exists "audit_logs_no_update" on public.audit_logs;
create policy "audit_logs_no_update"
on public.audit_logs for update
to authenticated
using (false)
with check (false);

drop policy if exists "audit_logs_no_delete" on public.audit_logs;
create policy "audit_logs_no_delete"
on public.audit_logs for delete
to authenticated
using (false);

-- =========================================================
-- 6. Employees: soft delete + jangan tampilkan record terhapus.
-- =========================================================
drop policy if exists "employees_select_by_role" on public.employees;
create policy "employees_select_by_role"
on public.employees for select
to authenticated
using (
  deleted_at is null
  and (
    public.is_hr_admin()
    or (public.auth_role() = 'manager' and department_id = public.auth_department_id())
    or id = public.auth_employee_id()
  )
);

-- HR/Admin boleh membuat employee aktif.
drop policy if exists "employees_insert_hr_admin" on public.employees;
create policy "employees_insert_hr_admin"
on public.employees for insert
to authenticated
with check (
  public.is_hr_admin()
  and deleted_at is null
);

-- HR/Admin boleh mengubah employee.
drop policy if exists "employees_update_hr_admin" on public.employees;
create policy "employees_update_hr_admin"
on public.employees for update
to authenticated
using (
  public.is_hr_admin()
)
with check (
  public.is_hr_admin()
);

-- Tidak ada DELETE permanen dari browser.
drop policy if exists "employees_delete_hr_admin" on public.employees;
create policy "employees_delete_hr_admin" on public.employees for delete
to authenticated
using (false);

-- RPC soft delete. Hanya HR/Admin.
create or replace function public.soft_delete_employee(p_employee_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_hr_admin() then
    raise exception 'Not authorized';
  end if;

  update public.employees
  set deleted_at = now(),
      deleted_by = auth.uid(),
      employment_status = 'inactive'
  where id = p_employee_id
    and deleted_at is null;

  return found;
end;
$$;

revoke all on function public.soft_delete_employee(uuid) from public;
grant execute on function public.soft_delete_employee(uuid) to authenticated;

-- =========================================================
-- 7. Profil: employee tidak boleh mengubah role/employee_id.
-- =========================================================
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- User biasa hanya membaca dirinya sendiri.
-- HR/Admin dapat membaca kebutuhan administrasi.
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_hr_admin());

commit;

-- =========================================================
-- Backup & Restore
-- =========================================================
-- Backup/restore database production tidak dilakukan oleh browser.
-- Gunakan backup platform/Supabase dan prosedur restore yang diuji.
-- Jangan pernah menyimpan service-role key di frontend.
