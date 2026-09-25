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
