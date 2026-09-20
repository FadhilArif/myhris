import { requireSupabase } from "../lib/supabase";

const clean = (value) => (value === "" ? null : value);

export async function listEmployees(search = "") {
  const db = requireSupabase();
  let q = db.from("employees").select("*").order("created_at", { ascending: false });
  if (search.trim()) q = q.or(`name.ilike.%${search.trim()}%,id.ilike.%${search.trim()}%,department.ilike.%${search.trim()}%`);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createEmployee(form) {
  const db = requireSupabase();
  const row = {
    id: form.id || `EMP-${Date.now().toString().slice(-6)}`,
    name: form.name,
    position: clean(form.position),
    department: clean(form.department),
    status: form.status || "Active",
    type: form.type || "PKWTT",
    joined: clean(form.joined),
    salary: Number(form.salary || 0),
    email: clean(form.email),
    phone: clean(form.phone)
  };
  const { data, error } = await db.from("employees").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function deleteEmployee(id) {
  const db = requireSupabase();
  const { error } = await db.from("employees").delete().eq("id", id);
  if (error) throw error;
}

export async function listCandidates() {
  const db = requireSupabase();
  const { data, error } = await db.from("candidates").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCandidate(form) {
  const db = requireSupabase();
  const row = {
    id: form.id || `CAN-${Date.now().toString().slice(-6)}`,
    name: form.name,
    position: clean(form.position),
    stage: form.stage || "Screening",
    source: form.source || "Job Portal",
    applied: clean(form.applied) || new Date().toISOString().slice(0,10),
    email: clean(form.email),
    phone: clean(form.phone),
    notes: clean(form.notes)
  };
  const { data, error } = await db.from("candidates").insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function listAttendance() {
  const db = requireSupabase();
  const { data, error } = await db
    .from("attendance")
    .select("*, employees:employee_id(name, department, position)")
    .order("attendance_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({
    ...r,
    employee_name: r.employees?.name ?? r.employee_id
  }));
}

export async function createAttendance(form) {
  const db = requireSupabase();
  const row = {
    employee_id: form.employee_id,
    attendance_date: form.attendance_date || new Date().toISOString().slice(0,10),
    check_in: clean(form.check_in),
    check_out: clean(form.check_out),
    status: form.status || "Present",
    late_minutes: Number(form.late_minutes || 0),
    overtime_minutes: Number(form.overtime_minutes || 0),
    notes: clean(form.notes)
  };
  const { data, error } = await db.from("attendance").upsert(row, { onConflict: "employee_id,attendance_date" }).select().single();
  if (error) throw error;
  return data;
}

export async function listLeaveRequests() {
  const db = requireSupabase();
  const { data, error } = await db
    .from("leave_requests")
    .select("*, employees:employee_id(name, department)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(r => ({ ...r, employee_name: r.employees?.name ?? r.employee_id }));
}

export async function createLeaveRequest(form) {
  const db = requireSupabase();
  const { data, error } = await db.from("leave_requests").insert({
    employee_id: form.employee_id,
    leave_type: form.leave_type,
    start_date: form.start_date,
    end_date: form.end_date,
    days: Number(form.days || 1),
    reason: clean(form.reason),
    status: "Pending"
  }).select().single();
  if (error) throw error;
  return data;
}

export async function updateLeaveStatus(id, status) {
  const db = requireSupabase();
  const { data, error } = await db.from("leave_requests").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function listContracts() {
  const db = requireSupabase();
  const { data, error } = await db.from("contracts").select("*, employees:employee_id(name)").order("end_date");
  if (error) throw error;
  return (data ?? []).map(x => ({...x, employee_name:x.employees?.name ?? x.employee_id}));
}

export async function listMovements() {
  const db = requireSupabase();
  const { data, error } = await db.from("employee_movements").select("*, employees:employee_id(name)").order("effective_date", {ascending:false});
  if (error) throw error;
  return (data ?? []).map(x => ({...x, employee_name:x.employees?.name ?? x.employee_id}));
}

export async function listPerformance() {
  const db = requireSupabase();
  const { data, error } = await db.from("performance_reviews").select("*, employees:employee_id(name)").order("created_at", {ascending:false});
  if (error) throw error;
  return (data ?? []).map(x => ({...x, employee_name:x.employees?.name ?? x.employee_id}));
}

export async function listTrainings() {
  const db = requireSupabase();
  const { data, error } = await db.from("trainings").select("*").order("start_date");
  if (error) throw error;
  return data ?? [];
}

export async function listOffboarding() {
  const db = requireSupabase();
  const { data, error } = await db.from("offboarding").select("*, employees:employee_id(name)").order("last_working_date", {ascending:false});
  if (error) throw error;
  return (data ?? []).map(x => ({...x, employee_name:x.employees?.name ?? x.employee_id}));
}

export async function listPayrollRuns() {
  const db = requireSupabase();
  const { data, error } = await db.from("payroll_runs").select("*").order("created_at", {ascending:false});
  if (error) throw error;
  return data ?? [];
}
