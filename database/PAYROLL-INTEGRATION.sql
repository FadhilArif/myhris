-- MyHRIS Payroll Integration
-- Integrasi Payroll dengan Attendance, Overtime, Leave, Claims.
-- Jalankan setelah PAYROLL-ENHANCEMENT.sql.
-- Tidak menghapus data payroll lama.

begin;

-- =========================================================
-- 1. LEAVE PAYROLL TREATMENT
-- =========================================================
-- HR menentukan apakah jenis cuti dibayar, tidak dibayar,
-- atau tidak berdampak ke payroll.

alter table public.leave_types
  add column if not exists payroll_treatment text not null default 'neutral';

alter table public.leave_types
  drop constraint if exists leave_types_payroll_treatment_check;

alter table public.leave_types
  add constraint leave_types_payroll_treatment_check
  check (payroll_treatment in ('paid','unpaid','neutral'))
  not valid;

-- =========================================================
-- 2. PAYSLIP SOURCE SUMMARIES
-- =========================================================
-- Menyimpan ringkasan sumber payroll agar slip dapat diaudit
-- tanpa harus menebak sumber angka dari data transaksi.

alter table public.payroll_runs
  add column if not exists working_days_per_month numeric not null default 22,
  add column if not exists deduct_attendance_absence boolean not null default false;

alter table public.payslips
  add column if not exists attendance_summary jsonb not null default '{}'::jsonb,
  add column if not exists leave_summary jsonb not null default '{}'::jsonb,
  add column if not exists claim_summary jsonb not null default '{}'::jsonb;

-- =========================================================

-- =========================================================
-- 4. THR / SPECIAL PAYROLL
-- =========================================================

create table if not exists public.payroll_special_runs (
  id uuid primary key default gen_random_uuid(),
  run_type text not null default 'thr',
  title text not null,
  period_year integer not null,
  payment_date date,
  status text not null default 'draft',
  base_multiplier numeric not null default 1,
  prorate_enabled boolean not null default true,
  total_amount numeric not null default 0,
  notes text,
  generated_at timestamptz,
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  locked_at timestamptz,
  payment_status text not null default 'pending',
  payment_file_name text,
  payment_file_generated_at timestamptz,
  payment_file_generated_by uuid references auth.users(id),
  payment_reference text,
  payment_notes text,
  created_at timestamptz not null default now()
);

create index if not exists payroll_special_runs_year_idx
  on public.payroll_special_runs(period_year desc, created_at desc);

create table if not exists public.payroll_special_items (
  id uuid primary key default gen_random_uuid(),
  special_run_id uuid not null references public.payroll_special_runs(id) on delete cascade,
  employee_id uuid not null references public.employees(id),
  base_salary numeric not null default 0,
  service_months integer not null default 12,
  entitlement_months integer not null default 12,
  amount numeric not null default 0,
  manual_override numeric,
  notes text,
  created_at timestamptz not null default now(),
  unique(special_run_id, employee_id)
);

create index if not exists payroll_special_items_run_idx
  on public.payroll_special_items(special_run_id);

create index if not exists payroll_special_items_employee_idx
  on public.payroll_special_items(employee_id);

alter table public.payroll_special_runs enable row level security;
alter table public.payroll_special_items enable row level security;

drop policy if exists "payroll_special_runs_manage" on public.payroll_special_runs;
create policy "payroll_special_runs_manage"
on public.payroll_special_runs
for all
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

drop policy if exists "payroll_special_items_manage" on public.payroll_special_items;
create policy "payroll_special_items_manage"
on public.payroll_special_items
for all
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

-- =========================================================
-- 5. PAYROLL CORRECTION / SUPPLEMENTAL PAYMENT
-- =========================================================

create table if not exists public.payroll_corrections (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references public.payroll_runs(id),
  employee_id uuid not null references public.employees(id),
  correction_type text not null check (correction_type in ('earning','deduction')),
  name text not null,
  amount numeric not null check (amount >= 0),
  reason text not null,
  status text not null default 'draft',
  payment_date date,
  payment_reference text,
  created_by uuid not null references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payroll_corrections_run_idx
  on public.payroll_corrections(payroll_run_id, created_at desc);

create index if not exists payroll_corrections_employee_idx
  on public.payroll_corrections(employee_id, created_at desc);

alter table public.payroll_corrections enable row level security;

drop policy if exists "payroll_corrections_manage" on public.payroll_corrections;
create policy "payroll_corrections_manage"
on public.payroll_corrections
for all
to authenticated
using (public.has_permission('payroll.manage'))
with check (public.has_permission('payroll.manage'));

alter table public.payroll_special_runs
  drop constraint if exists payroll_special_runs_status_check;

alter table public.payroll_special_runs
  add constraint payroll_special_runs_status_check
  check (status in ('draft','calculated','under_review','approved','paid','locked'))
  not valid;

alter table public.payroll_special_runs
  drop constraint if exists payroll_special_runs_payment_status_check;

alter table public.payroll_special_runs
  add constraint payroll_special_runs_payment_status_check
  check (payment_status in ('pending','generated','uploaded','processing','paid','failed'))
  not valid;

alter table public.payroll_corrections
  drop constraint if exists payroll_corrections_status_check;

alter table public.payroll_corrections
  add constraint payroll_corrections_status_check
  check (status in ('draft','approved','paid','void'))
  not valid;

-- 3. INDEXES
-- =========================================================

create index if not exists payroll_runs_working_days_idx
  on public.payroll_runs(working_days_per_month);

create index if not exists leave_types_payroll_treatment_idx
  on public.leave_types(payroll_treatment);

create index if not exists attendance_employee_date_idx
  on public.attendance(employee_id, work_date);

create index if not exists leave_requests_employee_dates_idx
  on public.leave_requests(employee_id, start_date, end_date);

create index if not exists reimbursement_claims_employee_approved_idx
  on public.reimbursement_claims(employee_id, approved_at);

-- =========================================================
-- 4. POSTGREST SCHEMA CACHE
-- =========================================================

notify pgrst, 'reload schema';

commit;
