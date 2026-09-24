-- MyHRIS Role & Permission Security
-- Jalankan SETELAH schema dasar MyHRIS.
-- Scope Manager v1 = departemen yang sama dengan karyawan manager.
--
-- Penting:
-- 1) Policy PostgreSQL/RLS adalah lapisan keamanan utama. UI/route saja tidak cukup.
-- 2) Sesuaikan nama policy lama bila project existing memiliki policy tambahan.
-- 3) Jangan membuka service-role key ke browser.

create or replace function public.auth_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_employee_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select employee_id from public.profiles where id = auth.uid()
$$;

create or replace function public.auth_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select e.department_id
  from public.profiles p
  join public.employees e on e.id = p.employee_id
  where p.id = auth.uid()
$$;

create or replace function public.is_hr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() in ('admin','hr')
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.auth_role() = 'admin'
$$;

-- Helper untuk membersihkan policy lama yang paling umum dipakai di MyHRIS.
drop policy if exists "read_all" on public.employees;
drop policy if exists "write_hr" on public.employees;

alter table public.employees enable row level security;
drop policy if exists "employees_select_by_role" on public.employees;
create policy "employees_select_by_role"
on public.employees for select
to authenticated
using (
  public.is_hr_admin()
  or (public.auth_role() = 'manager' and department_id = public.auth_department_id())
  or id = public.auth_employee_id()
);

drop policy if exists "employees_insert_hr_admin" on public.employees;
create policy "employees_insert_hr_admin"
on public.employees for insert
to authenticated
with check (public.is_hr_admin());

drop policy if exists "employees_update_hr_admin" on public.employees;
create policy "employees_update_hr_admin"
on public.employees for update
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

drop policy if exists "employees_delete_hr_admin" on public.employees;
create policy "employees_delete_hr_admin"
on public.employees for delete
to authenticated
using (public.is_hr_admin());

-- Profiles: user hanya melihat dirinya sendiri; HR/Admin dapat melihat profil untuk kebutuhan administrasi.
alter table public.profiles enable row level security;
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
on public.profiles for select
to authenticated
using (id = auth.uid() or public.is_hr_admin());

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Absensi.
alter table public.attendance enable row level security;
drop policy if exists "attendance_select" on public.attendance;
create policy "attendance_select"
on public.attendance for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = attendance.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "attendance_insert_self" on public.attendance;
create policy "attendance_insert_self"
on public.attendance for insert
to authenticated
with check (employee_id = public.auth_employee_id());

drop policy if exists "attendance_update_hr_or_self" on public.attendance;
create policy "attendance_update_hr_or_self"
on public.attendance for update
to authenticated
using (public.is_hr_admin() or employee_id = public.auth_employee_id())
with check (public.is_hr_admin() or employee_id = public.auth_employee_id());

-- Shift master: seluruh user boleh melihat shift; hanya HR/Admin mengubah.
alter table public.work_shifts enable row level security;
drop policy if exists "work_shifts_select" on public.work_shifts;
create policy "work_shifts_select"
on public.work_shifts for select
to authenticated
using (true);

drop policy if exists "work_shifts_write_hr" on public.work_shifts;
create policy "work_shifts_write_hr"
on public.work_shifts for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

-- Cuti.
alter table public.leave_requests enable row level security;
drop policy if exists "leave_requests_select" on public.leave_requests;
create policy "leave_requests_select"
on public.leave_requests for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "leave_requests_insert_self" on public.leave_requests;
create policy "leave_requests_insert_self"
on public.leave_requests for insert
to authenticated
with check (employee_id = public.auth_employee_id());

drop policy if exists "leave_requests_update_hr_or_manager" on public.leave_requests;
create policy "leave_requests_update_hr_or_manager"
on public.leave_requests for update
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
)
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = leave_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

alter table public.leave_balances enable row level security;
drop policy if exists "leave_balances_select" on public.leave_balances;
create policy "leave_balances_select"
on public.leave_balances for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = leave_balances.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "leave_balances_write_hr" on public.leave_balances;
create policy "leave_balances_write_hr"
on public.leave_balances for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

-- Lembur.
alter table public.overtime_requests enable row level security;
drop policy if exists "overtime_select" on public.overtime_requests;
create policy "overtime_select"
on public.overtime_requests for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = overtime_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "overtime_insert_self" on public.overtime_requests;
create policy "overtime_insert_self"
on public.overtime_requests for insert
to authenticated
with check (employee_id = public.auth_employee_id());

drop policy if exists "overtime_update_hr_or_manager" on public.overtime_requests;
create policy "overtime_update_hr_or_manager"
on public.overtime_requests for update
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = overtime_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
)
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = overtime_requests.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

-- Payroll: data sensitif.
alter table public.payroll_runs enable row level security;
drop policy if exists "payroll_runs_hr_admin" on public.payroll_runs;
create policy "payroll_runs_hr_admin"
on public.payroll_runs for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

alter table public.payslips enable row level security;
drop policy if exists "payslips_select" on public.payslips;
create policy "payslips_select"
on public.payslips for select
to authenticated
using (public.is_hr_admin() or employee_id = public.auth_employee_id());

drop policy if exists "payslips_write_hr_admin" on public.payslips;
create policy "payslips_write_hr_admin"
on public.payslips for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

-- Recruitment hanya HR/Admin.
alter table public.job_postings enable row level security;
drop policy if exists "job_postings_select" on public.job_postings;
create policy "job_postings_select"
on public.job_postings for select
to authenticated
using (public.is_hr_admin());

drop policy if exists "job_postings_write" on public.job_postings;
create policy "job_postings_write"
on public.job_postings for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

alter table public.candidates enable row level security;
drop policy if exists "candidates_hr_admin" on public.candidates;
create policy "candidates_hr_admin"
on public.candidates for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

-- Kinerja.
alter table public.performance_cycles enable row level security;
drop policy if exists "performance_cycles_select" on public.performance_cycles;
create policy "performance_cycles_select"
on public.performance_cycles for select
to authenticated
using (public.is_hr_admin() or public.auth_role() = 'manager');

drop policy if exists "performance_cycles_write_hr" on public.performance_cycles;
create policy "performance_cycles_write_hr"
on public.performance_cycles for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

alter table public.performance_reviews enable row level security;
drop policy if exists "performance_reviews_select" on public.performance_reviews;
create policy "performance_reviews_select"
on public.performance_reviews for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = performance_reviews.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "performance_reviews_write_hr_or_manager" on public.performance_reviews;
create policy "performance_reviews_write_hr_or_manager"
on public.performance_reviews for insert
to authenticated
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = performance_reviews.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

drop policy if exists "performance_reviews_update_hr_or_manager" on public.performance_reviews;
create policy "performance_reviews_update_hr_or_manager"
on public.performance_reviews for update
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = performance_reviews.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
)
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = performance_reviews.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

-- Training.
alter table public.training_programs enable row level security;
drop policy if exists "training_programs_select" on public.training_programs;
create policy "training_programs_select"
on public.training_programs for select
to authenticated
using (true);

drop policy if exists "training_programs_write_hr" on public.training_programs;
create policy "training_programs_write_hr"
on public.training_programs for all
to authenticated
using (public.is_hr_admin())
with check (public.is_hr_admin());

alter table public.training_enrollments enable row level security;
drop policy if exists "training_enrollments_select" on public.training_enrollments;
create policy "training_enrollments_select"
on public.training_enrollments for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1
      from public.employees e
      where e.id = training_enrollments.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "training_enrollments_insert_self" on public.training_enrollments;
create policy "training_enrollments_insert_self"
on public.training_enrollments for insert
to authenticated
with check (employee_id = public.auth_employee_id());

drop policy if exists "training_enrollments_update_hr_or_manager" on public.training_enrollments;
create policy "training_enrollments_update_hr_or_manager"
on public.training_enrollments for update
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = training_enrollments.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
)
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = training_enrollments.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

-- Reimbursement.
alter table public.reimbursement_claims enable row level security;
drop policy if exists "claims_select" on public.reimbursement_claims;
create policy "claims_select"
on public.reimbursement_claims for select
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = reimbursement_claims.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
  or employee_id = public.auth_employee_id()
);

drop policy if exists "claims_insert_self" on public.reimbursement_claims;
create policy "claims_insert_self"
on public.reimbursement_claims for insert
to authenticated
with check (employee_id = public.auth_employee_id());

drop policy if exists "claims_update_hr_or_manager" on public.reimbursement_claims;
create policy "claims_update_hr_or_manager"
on public.reimbursement_claims for update
to authenticated
using (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = reimbursement_claims.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
)
with check (
  public.is_hr_admin()
  or (
    public.auth_role() = 'manager'
    and exists (
      select 1 from public.employees e
      where e.id = reimbursement_claims.employee_id
        and e.department_id = public.auth_department_id()
    )
  )
);

-- Audit log: hanya HR/Admin dapat membaca, user authenticated boleh menulis dari aplikasi.
alter table public.audit_logs enable row level security;
drop policy if exists "audit_logs_select_hr" on public.audit_logs;
create policy "audit_logs_select_hr"
on public.audit_logs for select
to authenticated
using (public.is_hr_admin());

drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
create policy "audit_logs_insert_authenticated"
on public.audit_logs for insert
to authenticated
with check (true);

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
