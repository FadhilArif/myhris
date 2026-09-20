-- PeopleFlow HRIS - Supabase starter schema
-- Run this in Supabase SQL Editor before switching the app from Demo mode to database mode.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'employee' check (role in ('super_admin','hr_admin','manager','finance','employee')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text unique,
  manager_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.positions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department_id uuid references public.departments(id) on delete set null,
  grade text,
  created_at timestamptz not null default now()
);

create table if not exists public.employees (
  id text primary key,
  name text not null,
  position text,
  department text,
  status text not null default 'Active',
  type text not null default 'PKWTT',
  joined date,
  salary numeric(14,2) default 0,
  email text,
  phone text,
  address text,
  birth_date date,
  gender text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  contract_type text not null,
  contract_no text,
  start_date date,
  end_date date,
  status text default 'Active',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  attendance_date date not null,
  check_in time,
  check_out time,
  status text default 'Present',
  late_minutes integer default 0,
  overtime_minutes integer default 0,
  notes text,
  unique(employee_id, attendance_date)
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  leave_type text not null,
  start_date date not null,
  end_date date not null,
  days numeric(6,2) not null default 1,
  reason text,
  status text not null default 'Pending',
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.overtime_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  overtime_date date not null,
  start_time time,
  end_time time,
  minutes integer default 0,
  reason text,
  status text default 'Pending',
  approved_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id text primary key,
  name text not null,
  position text,
  stage text not null default 'Screening',
  source text,
  applied date default current_date,
  email text,
  phone text,
  resume_url text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.job_vacancies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text,
  openings integer default 1,
  employment_type text,
  status text default 'Open',
  opened_at date default current_date,
  closed_at date,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_runs (
  id uuid primary key default gen_random_uuid(),
  period text not null,
  status text default 'Draft',
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid references public.payroll_runs(id) on delete cascade,
  employee_id text references public.employees(id) on delete cascade,
  basic_salary numeric(14,2) default 0,
  allowances numeric(14,2) default 0,
  overtime_pay numeric(14,2) default 0,
  deductions numeric(14,2) default 0,
  net_salary numeric(14,2) generated always as (basic_salary + allowances + overtime_pay - deductions) stored
);

create table if not exists public.employee_movements (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  movement_type text not null,
  effective_date date not null,
  from_department text,
  to_department text,
  from_position text,
  to_position text,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.performance_reviews (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  period text not null,
  score numeric(5,2),
  rating text,
  reviewer_id uuid references public.profiles(id),
  comments text,
  created_at timestamptz not null default now()
);

create table if not exists public.trainings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  provider text,
  start_date date,
  end_date date,
  budget numeric(14,2) default 0,
  status text default 'Planned',
  created_at timestamptz not null default now()
);

create table if not exists public.training_participants (
  id uuid primary key default gen_random_uuid(),
  training_id uuid references public.trainings(id) on delete cascade,
  employee_id text references public.employees(id) on delete cascade,
  completion_status text default 'Registered',
  score numeric(5,2),
  unique(training_id, employee_id)
);

create table if not exists public.offboarding (
  id uuid primary key default gen_random_uuid(),
  employee_id text references public.employees(id) on delete cascade,
  last_working_date date,
  reason text,
  exit_type text,
  exit_interview_notes text,
  clearance_status text default 'Pending',
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity text not null,
  entity_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

-- Starter indexes
create index if not exists idx_employees_department on public.employees(department);
create index if not exists idx_employees_status on public.employees(status);
create index if not exists idx_attendance_date on public.attendance(attendance_date);
create index if not exists idx_leave_status on public.leave_requests(status);
create index if not exists idx_contract_end_date on public.contracts(end_date);
create index if not exists idx_candidates_stage on public.candidates(stage);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.departments enable row level security;
alter table public.positions enable row level security;
alter table public.contracts enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;
alter table public.overtime_requests enable row level security;
alter table public.candidates enable row level security;
alter table public.job_vacancies enable row level security;
alter table public.payroll_runs enable row level security;
alter table public.payroll_items enable row level security;
alter table public.employee_movements enable row level security;
alter table public.performance_reviews enable row level security;
alter table public.trainings enable row level security;
alter table public.training_participants enable row level security;
alter table public.offboarding enable row level security;
alter table public.audit_logs enable row level security;

-- For a private HRIS, do NOT use public-open policies in production.
-- Create role-aware policies after the first HR admin account is created.
-- The frontend deliberately falls back to Demo mode until Supabase credentials are supplied.
