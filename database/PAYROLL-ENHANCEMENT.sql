-- MyHRIS Payroll Enhancement
-- Bank account data + payroll workflow + payroll adjustments.
-- Jalankan setelah SECURITY-HARDENING.sql / SECURITY-PHASE-2.sql.
-- Tidak menghapus data payroll lama.

begin;

-- =========================================================
-- 1. EMPLOYEE BANK ACCOUNT
-- =========================================================

alter table public.employees
  add column if not exists bank_name text,
  add column if not exists bank_account_number text;

create index if not exists employees_bank_name_idx
  on public.employees(bank_name);

-- =========================================================
-- 2. PAYROLL RUN WORKFLOW
-- =========================================================

alter table public.payroll_runs
  add column if not exists attendance_cutoff_start date,
  add column if not exists attendance_cutoff_end date,
  add column if not exists payment_date date,
  add column if not exists notes text,
  add column if not exists total_gross numeric not null default 0,
  add column if not exists total_deductions numeric not null default 0,
  add column if not exists total_net numeric not null default 0,
  add column if not exists generated_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists reviewed_at timestamptz,
  add column if not exists approved_by uuid references auth.users(id),
  add column if not exists approved_at timestamptz,
  add column if not exists paid_at timestamptz,
  add column if not exists locked_at timestamptz;

-- Lepas constraint status lama terlebih dahulu.
-- Jika constraint lama masih hanya mengenal "processed",
-- migrasi "processed" -> "calculated" akan gagal sebelum kita sempat
-- menggantinya dengan workflow status baru.
alter table public.payroll_runs
  drop constraint if exists payroll_runs_status_check;

-- Migrasi status lama ke workflow baru.
update public.payroll_runs
set status = 'calculated'
where status = 'processed';

-- =========================================================
-- 3. PAYROLL ADJUSTMENTS
-- =========================================================
-- Untuk bonus, insentif, koreksi, potongan manual, pinjaman, dll.

create table if not exists public.payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  adjustment_type text not null check (adjustment_type in ('earning','deduction')),
  name text not null,
  amount numeric not null check (amount >= 0),
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists payroll_adjustments_run_idx
  on public.payroll_adjustments(payroll_run_id);

create index if not exists payroll_adjustments_employee_idx
  on public.payroll_adjustments(employee_id);

alter table public.payroll_adjustments enable row level security;

drop policy if exists "payroll_adjustments_select" on public.payroll_adjustments;
create policy "payroll_adjustments_select"
on public.payroll_adjustments
for select
to authenticated
using (
  public.has_permission('payroll.manage')
);

drop policy if exists "payroll_adjustments_insert" on public.payroll_adjustments;
create policy "payroll_adjustments_insert"
on public.payroll_adjustments
for insert
to authenticated
with check (
  public.has_permission('payroll.manage')
  and created_by = auth.uid()
);

drop policy if exists "payroll_adjustments_update" on public.payroll_adjustments;
create policy "payroll_adjustments_update"
on public.payroll_adjustments
for update
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

drop policy if exists "payroll_adjustments_delete" on public.payroll_adjustments;
create policy "payroll_adjustments_delete"
on public.payroll_adjustments
for delete
to authenticated
using (public.has_permission('payroll.manage'));

-- =========================================================
-- 4. PAYROLL RUN RLS TIGHTENING
-- =========================================================

alter table public.payroll_runs enable row level security;

drop policy if exists "payroll_runs_hr_admin" on public.payroll_runs;
create policy "payroll_runs_hr_admin"
on public.payroll_runs
for all
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

-- Payslip tetap bisa dibaca sendiri oleh employee.
alter table public.payslips enable row level security;

drop policy if exists "payslips_select" on public.payslips;
create policy "payslips_select"
on public.payslips
for select
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
on public.payslips
for insert
to authenticated
with check (public.has_permission('payroll.manage'));

drop policy if exists "payslips_update" on public.payslips;
create policy "payslips_update"
on public.payslips
for update
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

drop policy if exists "payslips_delete_blocked" on public.payslips;
create policy "payslips_delete_blocked"
on public.payslips
for delete
to authenticated
using (false);

-- =========================================================
-- 5. PAYROLL STATUS VALIDATION
-- =========================================================

alter table public.payroll_runs
  drop constraint if exists payroll_runs_status_check;

alter table public.payroll_runs
  add constraint payroll_runs_status_check
  check (
    status in (
      'draft',
      'calculated',
      'under_review',
      'approved',
      'paid',
      'locked'
    )
  )
  not valid;

-- =========================================================
-- 6. POSTGREST SCHEMA CACHE
-- =========================================================

notify pgrst, 'reload schema';

commit;
