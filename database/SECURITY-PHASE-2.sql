-- MyHRIS Security Phase 2
-- Granular permission + RLS per module + soft delete master data
-- + immutable transaction records.
-- Jalankan setelah SECURITY-HARDENING.sql.
-- SQL ini sengaja dibuat idempotent sebisa mungkin.

begin;

-- =========================================================
-- 1. GRANULAR PERMISSION
-- =========================================================

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('admin','hr','manager','employee')),
  permission text not null,
  created_at timestamptz not null default now(),
  unique(role, permission)
);

alter table public.role_permissions enable row level security;

drop policy if exists "role_permissions_select_authenticated" on public.role_permissions;
create policy "role_permissions_select_authenticated"
on public.role_permissions for select
to authenticated
using (true);

drop policy if exists "role_permissions_no_insert" on public.role_permissions;
drop policy if exists "role_permissions_no_update" on public.role_permissions;
drop policy if exists "role_permissions_no_delete" on public.role_permissions;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.role_permissions rp
    where rp.role = public.auth_role()
      and rp.permission = p_permission
  )
$$;

revoke all on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

insert into public.role_permissions (role, permission) values
('admin','employee.view_all'),
('admin','employee.edit'),
('admin','employee.create'),
('admin','employee.delete'),
('admin','attendance.view_all'),
('admin','shift.manage'),
('admin','leave.view_all'),
('admin','leave.view_self'),
('admin','leave.create'),
('admin','leave.manage'),
('admin','leave.approve'),
('admin','overtime.view_all'),
('admin','overtime.approve'),
('admin','payroll.view'),
('admin','payroll.manage'),
('admin','recruitment.manage'),
('admin','performance.manage'),
('admin','training.manage'),
('admin','claims.manage'),
('admin','settings.manage'),
('admin','users.manage'),
('admin','reports.view_all'),
('admin','reports.audit'),
('admin','reports.export'),

('hr','employee.view_all'),
('hr','employee.edit'),
('hr','employee.create'),
('hr','employee.delete'),
('hr','attendance.view_all'),
('hr','shift.manage'),
('hr','leave.view_all'),
('hr','leave.view_self'),
('hr','leave.create'),
('hr','leave.manage'),
('hr','leave.approve'),
('hr','overtime.view_all'),
('hr','overtime.approve'),
('hr','payroll.view'),
('hr','payroll.manage'),
('hr','recruitment.manage'),
('hr','performance.manage'),
('hr','training.manage'),
('hr','claims.manage'),
('hr','reports.view_all'),
('hr','reports.audit'),
('hr','reports.export'),

('manager','employee.view_team'),
('manager','attendance.view_team'),
('manager','leave.view_self'),
('manager','leave.create'),
('manager','leave.view_team'),
('manager','leave.approve'),
('manager','overtime.view_team'),
('manager','overtime.approve'),
('manager','performance.view_team'),
('manager','performance.manage_team'),
('manager','training.view_team'),
('manager','reports.view_team'),
('manager','reports.export'),

('employee','employee.view_self'),
('employee','attendance.view_self'),
('employee','leave.view_self'),
('employee','leave.create'),
('employee','overtime.view_self'),
('employee','overtime.create'),
('employee','payroll.view_self'),
('employee','claims.view_self'),
('employee','claims.create'),
('employee','training.view_self'),
('employee','training.enroll'),
('employee','reports.view_self'),
('employee','reports.export')
on conflict (role, permission) do nothing;

-- =========================================================
-- 2. MASTER DATA: SOFT DELETE
-- =========================================================

alter table public.departments
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.positions
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.leave_types
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.payroll_components
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.training_programs
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

alter table public.job_postings
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id);

create index if not exists departments_deleted_at_idx on public.departments(deleted_at);
create index if not exists positions_deleted_at_idx on public.positions(deleted_at);
create index if not exists leave_types_deleted_at_idx on public.leave_types(deleted_at);
create index if not exists payroll_components_deleted_at_idx on public.payroll_components(deleted_at);
create index if not exists training_programs_deleted_at_idx on public.training_programs(deleted_at);
create index if not exists job_postings_deleted_at_idx on public.job_postings(deleted_at);

-- =========================================================
-- 3. MASTER DATA RLS
-- =========================================================

alter table public.departments enable row level security;
drop policy if exists "departments_select_active" on public.departments;
create policy "departments_select_active"
on public.departments for select
to authenticated
using (deleted_at is null);

drop policy if exists "departments_write_hr" on public.departments;
create policy "departments_write_hr"
on public.departments for insert
to authenticated
with check (public.has_permission('settings.manage'));

drop policy if exists "departments_update_hr" on public.departments;
create policy "departments_update_hr"
on public.departments for update
to authenticated
using (public.has_permission('settings.manage'))
with check (public.has_permission('settings.manage'));

drop policy if exists "departments_delete_blocked" on public.departments;
create policy "departments_delete_blocked"
on public.departments for delete
to authenticated
using (false);

alter table public.positions enable row level security;
drop policy if exists "positions_select_active" on public.positions;
create policy "positions_select_active"
on public.positions for select
to authenticated
using (deleted_at is null);

drop policy if exists "positions_write_hr" on public.positions;
create policy "positions_write_hr"
on public.positions for insert
to authenticated
with check (public.has_permission('settings.manage'));

drop policy if exists "positions_update_hr" on public.positions;
create policy "positions_update_hr"
on public.positions for update
to authenticated
using (public.has_permission('settings.manage'))
with check (public.has_permission('settings.manage'));

drop policy if exists "positions_delete_blocked" on public.positions;
create policy "positions_delete_blocked"
on public.positions for delete
to authenticated
using (false);

alter table public.leave_types enable row level security;
drop policy if exists "leave_types_select_active" on public.leave_types;
create policy "leave_types_select_active"
on public.leave_types for select
to authenticated
using (deleted_at is null);

drop policy if exists "leave_types_write_hr" on public.leave_types;
create policy "leave_types_write_hr"
on public.leave_types for insert
to authenticated
with check (public.has_permission('settings.manage'));

drop policy if exists "leave_types_update_hr" on public.leave_types;
create policy "leave_types_update_hr"
on public.leave_types for update
to authenticated
using (public.has_permission('settings.manage'))
with check (public.has_permission('settings.manage'));

drop policy if exists "leave_types_delete_blocked" on public.leave_types;
create policy "leave_types_delete_blocked"
on public.leave_types for delete
to authenticated
using (false);

alter table public.payroll_components enable row level security;
drop policy if exists "payroll_components_select_active" on public.payroll_components;
create policy "payroll_components_select_active"
on public.payroll_components for select
to authenticated
using (deleted_at is null);

drop policy if exists "payroll_components_write_hr" on public.payroll_components;
create policy "payroll_components_write_hr"
on public.payroll_components for insert
to authenticated
with check (public.has_permission('payroll.manage'));

drop policy if exists "payroll_components_update_hr" on public.payroll_components;
create policy "payroll_components_update_hr"
on public.payroll_components for update
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

drop policy if exists "payroll_components_delete_blocked" on public.payroll_components;
create policy "payroll_components_delete_blocked"
on public.payroll_components for delete
to authenticated
using (false);

alter table public.training_programs enable row level security;
drop policy if exists "training_programs_select_active" on public.training_programs;
create policy "training_programs_select_active"
on public.training_programs for select
to authenticated
using (deleted_at is null);

drop policy if exists "training_programs_write_hr" on public.training_programs;
create policy "training_programs_write_hr"
on public.training_programs for insert
to authenticated
with check (public.has_permission('training.manage'));

drop policy if exists "training_programs_update_hr" on public.training_programs;
create policy "training_programs_update_hr"
on public.training_programs for update
to authenticated
using (public.has_permission('training.manage'))
with check (public.has_permission('training.manage'));

drop policy if exists "training_programs_delete_blocked" on public.training_programs;
create policy "training_programs_delete_blocked"
on public.training_programs for delete
to authenticated
using (false);

alter table public.job_postings enable row level security;
drop policy if exists "job_postings_select_active_hr" on public.job_postings;
create policy "job_postings_select_active_hr"
on public.job_postings for select
to authenticated
using (deleted_at is null and public.has_permission('recruitment.manage'));

drop policy if exists "job_postings_write_hr" on public.job_postings;
create policy "job_postings_write_hr"
on public.job_postings for insert
to authenticated
with check (public.has_permission('recruitment.manage'));

drop policy if exists "job_postings_update_hr" on public.job_postings;
create policy "job_postings_update_hr"
on public.job_postings for update
to authenticated
using (public.has_permission('recruitment.manage'))
with check (public.has_permission('recruitment.manage'));

drop policy if exists "job_postings_delete_blocked" on public.job_postings;
create policy "job_postings_delete_blocked"
on public.job_postings for delete
to authenticated
using (false);

-- =========================================================
-- 4. TRANSACTION RLS
-- =========================================================

-- Leave requests: semua role tetap dapat mengajukan cuti untuk dirinya sendiri.
-- Hak tambahan (view_all/view_team/approve/manage) tidak menghilangkan hak self-service.
alter table public.leave_requests enable row level security;

drop policy if exists "leave_requests_select" on public.leave_requests;
create policy "leave_requests_select"
on public.leave_requests for select
to authenticated
using (
  public.has_permission('leave.view_all')
  or (
    public.has_permission('leave.view_team')
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
  or (
    public.has_permission('leave.view_self')
    and employee_id = public.auth_employee_id()
  )
);

drop policy if exists "leave_requests_insert_self" on public.leave_requests;
create policy "leave_requests_insert_self"
on public.leave_requests for insert
to authenticated
with check (
  public.has_permission('leave.create')
  and employee_id = public.auth_employee_id()
);

drop policy if exists "leave_requests_update_approver_or_owner" on public.leave_requests;
create policy "leave_requests_update_approver_or_owner"
on public.leave_requests for update
to authenticated
using (
  public.has_permission('leave.manage')
  or (
    public.has_permission('leave.approve')
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
)
with check (
  public.has_permission('leave.manage')
  or (
    public.has_permission('leave.approve')
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
);

drop policy if exists "leave_requests_delete_blocked" on public.leave_requests;
create policy "leave_requests_delete_blocked"
on public.leave_requests for delete
to authenticated
using (false);

-- Leave balance: read own/team/admin; write only HR/Admin.
alter table public.leave_balances enable row level security;
drop policy if exists "leave_balances_select" on public.leave_balances;
create policy "leave_balances_select"
on public.leave_balances for select
to authenticated
using (
  public.has_permission('leave.view_all')
  or (
    public.has_permission('leave.view_team')
    and exists (
      select 1 from public.employees e
      where e.id = leave_balances.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
  or (
    public.has_permission('leave.view_self')
    and employee_id = public.auth_employee_id()
  )
);

drop policy if exists "leave_balances_write" on public.leave_balances;
create policy "leave_balances_write"
on public.leave_balances for all
to authenticated
using (public.has_permission('leave.manage'))
with check (public.has_permission('leave.manage'));

-- Overtime.
alter table public.overtime_requests enable row level security;
drop policy if exists "overtime_select" on public.overtime_requests;
create policy "overtime_select"
on public.overtime_requests for select
to authenticated
using (
  public.has_permission('overtime.view_all')
  or (
    public.has_permission('overtime.view_team')
    and exists (
      select 1 from public.employees e
      where e.id = overtime_requests.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
  or (
    public.has_permission('overtime.view_self')
    and employee_id = public.auth_employee_id()
  )
);

drop policy if exists "overtime_insert_self" on public.overtime_requests;
create policy "overtime_insert_self"
on public.overtime_requests for insert
to authenticated
with check (
  public.has_permission('overtime.create')
  and employee_id = public.auth_employee_id()
);

drop policy if exists "overtime_update_manager_hr" on public.overtime_requests;
create policy "overtime_update_manager_hr"
on public.overtime_requests for update
to authenticated
using (
  public.has_permission('overtime.approve')
  or employee_id = public.auth_employee_id()
)
with check (
  public.has_permission('overtime.approve')
  or employee_id = public.auth_employee_id()
);

drop policy if exists "overtime_delete_blocked" on public.overtime_requests;
create policy "overtime_delete_blocked"
on public.overtime_requests for delete
to authenticated
using (false);

-- Reimbursement.
alter table public.reimbursement_claims enable row level security;
drop policy if exists "claims_select" on public.reimbursement_claims;
create policy "claims_select"
on public.reimbursement_claims for select
to authenticated
using (
  public.has_permission('claims.manage')
  or (
    public.has_permission('claims.view_self')
    and employee_id = public.auth_employee_id()
  )
  or (
    public.has_permission('claims.view_team')
    and exists (
      select 1 from public.employees e
      where e.id = reimbursement_claims.employee_id
        and e.department_id = public.auth_department_id()
        and e.deleted_at is null
    )
  )
);

drop policy if exists "claims_insert_self" on public.reimbursement_claims;
create policy "claims_insert_self"
on public.reimbursement_claims for insert
to authenticated
with check (
  public.has_permission('claims.create')
  and employee_id = public.auth_employee_id()
);

drop policy if exists "claims_update" on public.reimbursement_claims;
create policy "claims_update"
on public.reimbursement_claims for update
to authenticated
using (
  public.has_permission('claims.manage')
  or employee_id = public.auth_employee_id()
)
with check (
  public.has_permission('claims.manage')
  or employee_id = public.auth_employee_id()
);

drop policy if exists "claims_delete_blocked" on public.reimbursement_claims;
create policy "claims_delete_blocked"
on public.reimbursement_claims for delete
to authenticated
using (false);

-- =========================================================
-- 5. PAYROLL SENSITIVE DATA
-- =========================================================

alter table public.payroll_runs enable row level security;
drop policy if exists "payroll_runs_hr_admin" on public.payroll_runs;
create policy "payroll_runs_hr_admin"
on public.payroll_runs for all
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

alter table public.payslips enable row level security;
drop policy if exists "payslips_select" on public.payslips;
create policy "payslips_select"
on public.payslips for select
to authenticated
using (
  public.has_permission('payroll.view')
  or (
    public.has_permission('payroll.view_self')
    and employee_id = public.auth_employee_id()
  )
);

drop policy if exists "payslips_write" on public.payslips;
create policy "payslips_write"
on public.payslips for insert
to authenticated
with check (public.has_permission('payroll.manage'));

drop policy if exists "payslips_update" on public.payslips;
create policy "payslips_update"
on public.payslips for update
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

drop policy if exists "payslips_delete_blocked" on public.payslips;
create policy "payslips_delete_blocked"
on public.payslips for delete
to authenticated
using (false);

-- =========================================================
-- 6. IMMUTABLE AUDIT / LOGIN
-- =========================================================

alter table public.login_history enable row level security;
drop policy if exists "login_history_no_update" on public.login_history;
create policy "login_history_no_update"
on public.login_history for update
to authenticated
using (false)
with check (false);

drop policy if exists "login_history_no_delete" on public.login_history;
create policy "login_history_no_delete"
on public.login_history for delete
to authenticated
using (false);

-- =========================================================
-- 7. GENERIC SOFT DELETE RPC FOR MASTER DATA
-- =========================================================

create or replace function public.soft_delete_master(
  p_table text,
  p_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  case p_table
    when 'departments' then
      update public.departments
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    when 'positions' then
      update public.positions
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    when 'leave_types' then
      update public.leave_types
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    when 'payroll_components' then
      if not public.has_permission('payroll.manage') then
        raise exception 'Not authorized';
      end if;
      update public.payroll_components
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    when 'training_programs' then
      if not public.has_permission('training.manage') then
        raise exception 'Not authorized';
      end if;
      update public.training_programs
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    when 'job_postings' then
      if not public.has_permission('recruitment.manage') then
        raise exception 'Not authorized';
      end if;
      update public.job_postings
      set deleted_at = now(), deleted_by = auth.uid()
      where id = p_id and deleted_at is null;
    else
      raise exception 'Unsupported table';
  end case;

  get diagnostics v_row_count = row_count;
  return v_row_count > 0;
end;
$$;

revoke all on function public.soft_delete_master(text,uuid) from public;
grant execute on function public.soft_delete_master(text,uuid) to authenticated;

commit;

-- =========================================================
-- CATATAN
-- =========================================================
-- 1. Permission server-side sekarang berasal dari role_permissions,
--    bukan hanya dari UI.
-- 2. Data transaksi penting tidak boleh dihapus permanen dari browser.
-- 3. Master data memakai soft delete agar histori tetap utuh.
-- 4. Payroll tetap dibatasi ketat karena mengandung data gaji.
-- 5. Backup/restore adalah prosedur platform/database, bukan browser.
