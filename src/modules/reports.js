// src/modules/reports.js

import { state } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, showToast } from '../utils/dom.js';
import { fmtDate, fmtDateTime, fmtMoney } from '../utils/format.js';
import { can, getAllowedReports, isManager } from '../config/permissions.js';

const REPORT_META = {
  employees: { title:'Data Karyawan', description:'Master data karyawan aktif/nonaktif.' },
  attendance: { title:'Laporan Absensi', description:'Rekap kehadiran lengkap dengan keterangan shift.' },
  leave_requests: { title:'Laporan Pengajuan Cuti', description:'Riwayat pengajuan dan keputusan cuti.' },
  leave_balances: { title:'Laporan Saldo Cuti', description:'Saldo, terpakai, dan sisa cuti per karyawan.' },
  overtime: { title:'Laporan Lembur', description:'Pengajuan, persetujuan, durasi, dan nilai lembur.' },
  payroll: { title:'Laporan Payroll', description:'Ringkasan payroll dan rincian komponen slip gaji.' },
  recruitment: { title:'Laporan Rekrutmen', description:'Lowongan dan pipeline kandidat.' },
  performance: { title:'Laporan Kinerja', description:'Siklus dan hasil penilaian kinerja.' },
  training: { title:'Laporan Training', description:'Program, peserta, status, dan penyelesaian training.' },
  claims: { title:'Laporan Reimbursement', description:'Pengajuan dan status reimbursement.' },
  audit: { title:'Audit Log', description:'Jejak aktivitas perubahan penting dalam sistem.' },
};

let currentRows = [];
let currentHeaders = [];
let currentReportKey = '';

function isWithinRange(dateValue, start, end){
  if(!dateValue) return true;
  const d = String(dateValue).slice(0,10);
  if(start && d < start) return false;
  if(end && d > end) return false;
  return true;
}

async function getScopedEmployees(selectedEmployeeId = ''){
  const employees = await sbAll('employees', {
    select:'*, departments(name), positions(name)',
    order:{col:'full_name'}
  });

  let scoped = employees;
  if(isManager()){
    scoped = scoped.filter(e => e.department_id === state.me?.department_id);
  } else if(getRole() === 'employee'){
    scoped = scoped.filter(e => e.id === state.me?.id);
  }

  if(selectedEmployeeId){
    scoped = scoped.filter(e => e.id === selectedEmployeeId);
  }

  return scoped;
}

function getRole(){
  return state.profile?.role || 'employee';
}

const EMPLOYEE_FILTER_REPORTS = new Set([
  'employees','attendance','leave_requests','leave_balances','overtime',
  'payroll','performance','training','claims'
]);

function reportDateDefaults(){
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth()+1).padStart(2,'0');
  return {
    start: year + '-' + month + '-01',
    end: new Date(year, now.getMonth()+1, 0).toISOString().slice(0,10),
    year,
  };
}

function displayName(key){
  return REPORT_META[key]?.title || key;
}

export async function renderReports(initialType = ''){
  if(!can('reports.export')){
    el('content').innerHTML = '<div class="empty-state">Akses ditolak.</div>';
    return;
  }

  const allowed = getAllowedReports();
  const defaults = reportDateDefaults();
  const selectedType = allowed.includes(initialType) ? initialType : (allowed[0] || '');
  const options = allowed.map(k => '<option value="' + k + '"' + (k === selectedType ? ' selected' : '') + '>' + displayName(k) + '</option>').join('');
  const scopedEmployees = await getScopedEmployees();
  const employeeOptions = scopedEmployees.map(e =>
    '<option value="' + e.id + '">' + escapeHtml(e.employee_code || '') + ' — ' + escapeHtml(e.full_name) + '</option>'
  ).join('');
  const canChooseEmployee = getRole() === 'admin' || getRole() === 'hr' || getRole() === 'manager';

  el('content').innerHTML =
    '<div class="card report-controls" style="margin-bottom:16px;">' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:end;">' +
        '<div style="min-width:220px;flex:1;"><label>Jenis Laporan</label><select id="report-type" onchange="toggleReportEmployeeFilter();loadReport()">' + options + '</select></div>' +
        (canChooseEmployee ? '<div id="report-employee-wrap" style="min-width:240px;flex:1;"><label>Karyawan</label><select id="report-employee" onchange="loadReport()"><option value="">Semua dalam lingkup akses</option>' + employeeOptions + '</select></div>' : '') +
        '<div><label>Mulai</label><input type="date" id="report-start" value="' + defaults.start + '"></div>' +
        '<div><label>Sampai</label><input type="date" id="report-end" value="' + defaults.end + '"></div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button class="btn btn-primary" onclick="loadReport()">Tampilkan</button>' +
          '<button class="btn btn-outline" onclick="downloadCurrentReportCSV()">CSV</button>' +
          '<button class="btn btn-outline" onclick="exportCurrentReportExcel()">Excel</button>' +
          '<button class="btn btn-outline" onclick="printCurrentReport()">PDF / Cetak</button>' +
        '</div>' +
      '</div>' +
      '<div id="report-scope-note" style="font-size:12px;color:var(--text-muted);margin-top:10px;"></div>' +
    '</div>' +
    '<div id="report-area"></div>';

  toggleReportEmployeeFilter();
  updateReportScopeNote();
  await loadReport();
}

export async function loadReport(){
  const key = el('report-type')?.value;
  if(!key) return;
  currentReportKey = key;

  const start = el('report-start')?.value || '';
  const end = el('report-end')?.value || '';
  const employeeId = el('report-employee')?.value || '';
  const area = el('report-area');
  if(!area) return;

  area.innerHTML = '<div class="empty-state">Memuat laporan…</div>';

  try {
    const result = await buildReport(key, start, end, employeeId);
    currentHeaders = result.headers;
    currentRows = result.rows;
    renderReportTable(result.title, result.description, result.headers, result.rows);
  } catch(e){
    console.error(e);
    area.innerHTML = '<div class="card"><b>Gagal memuat laporan.</b><div style="margin-top:6px;color:var(--text-muted);">' + escapeHtml(e.message || 'Unknown error') + '</div></div>';
  }
}

async function buildReport(key, start, end, employeeId = ''){
  switch(key){
    case 'employees': return reportEmployees(employeeId);
    case 'attendance': return reportAttendance(start,end,employeeId);
    case 'leave_requests': return reportLeaveRequests(start,end,employeeId);
    case 'leave_balances': return reportLeaveBalances(employeeId);
    case 'overtime': return reportOvertime(start,end,employeeId);
    case 'payroll': return reportPayroll(start,end,employeeId);
    case 'recruitment': return reportRecruitment(start,end);
    case 'performance': return reportPerformance(start,end,employeeId);
    case 'training': return reportTraining(start,end,employeeId);
    case 'claims': return reportClaims(start,end,employeeId);
    case 'audit': return reportAudit(start,end);
    default: throw new Error('Jenis laporan tidak dikenal.');
  }
}

async function reportEmployees(employeeId = ''){
  const emps = await getScopedEmployees(employeeId);
  const headers = ['Kode','Nama','Departemen','Jabatan','Tanggal Bergabung','Status','Gaji Pokok'];
  const rows = emps.map(e => [
    e.employee_code || '',
    e.full_name || '',
    e.departments?.name || '',
    e.positions?.name || '',
    fmtDate(e.join_date),
    e.employment_status || '',
    Number(e.basic_salary || 0),
  ]);
  return {title:REPORT_META.employees.title,description:REPORT_META.employees.description,headers,rows};
}

async function reportAttendance(start,end,employeeId = ''){
  const [emps, attendance, shifts] = await Promise.all([
    getScopedEmployees(employeeId),
    sbAll('attendance', {order:{col:'work_date',asc:false}}),
    sbAll('work_shifts', {order:{col:'name'}})
  ]);
  const empMap = new Map(emps.map(e=>[e.id,e]));
  const shiftMap = new Map(shifts.map(s=>[s.id,s]));
  const rows = attendance
    .filter(a => empMap.has(a.employee_id) && isWithinRange(a.work_date,start,end))
    .map(a => {
      const e = empMap.get(a.employee_id);
      const s = shiftMap.get(e.shift_id);
      const shiftText = s ? s.name + ' (' + String(s.start_time).slice(0,5) + '-' + String(s.end_time).slice(0,5) + ', toleransi ' + (s.late_tolerance_min ?? '-') + ' mnt)' : 'Belum diatur';
      return [
        a.work_date,
        e.employee_code || '',
        e.full_name || '',
        e.departments?.name || '',
        shiftText,
        a.check_in ? fmtDateTime(a.check_in) : '-',
        a.check_out ? fmtDateTime(a.check_out) : '-',
        a.status || 'absent'
      ];
    });
  const headers = ['Tanggal','Kode','Karyawan','Departemen','Keterangan Shift','Jam Masuk','Jam Keluar','Status'];
  return {title:REPORT_META.attendance.title,description:REPORT_META.attendance.description,headers,rows};
}

async function reportLeaveRequests(start,end,employeeId = ''){
  const [emps, types, reqs] = await Promise.all([
    getScopedEmployees(employeeId), sbAll('leave_types'), sbAll('leave_requests',{order:{col:'created_at',asc:false}})
  ]);
  const em=new Map(emps.map(e=>[e.id,e]));
  const tm=new Map(types.map(t=>[t.id,t]));
  const rows=reqs.filter(r=>em.has(r.employee_id) && isWithinRange(r.start_date,start,end)).map(r=>{
    const e=em.get(r.employee_id), t=tm.get(r.leave_type_id);
    return [r.created_at?fmtDateTime(r.created_at):'-',e.employee_code||'',e.full_name||'',e.departments?.name||'',t?.name||'',r.start_date?fmtDate(r.start_date):'-',r.end_date?fmtDate(r.end_date):'-',Number(r.total_days||0),r.reason||'',r.status||''];
  });
  const headers=['Diajukan','Kode','Karyawan','Departemen','Jenis Cuti','Mulai','Selesai','Hari','Alasan','Status'];
  return {title:REPORT_META.leave_requests.title,description:REPORT_META.leave_requests.description,headers,rows};
}

async function reportLeaveBalances(employeeId = ''){
  const year = new Date().getFullYear();
  const [emps,types,balances]=await Promise.all([getScopedEmployees(employeeId),sbAll('leave_types'),sbAll('leave_balances',{eq:{year}})]);
  const em=new Map(emps.map(e=>[e.id,e])), tm=new Map(types.map(t=>[t.id,t]));
  const rows=balances.filter(b=>em.has(b.employee_id)).map(b=>{
    const e=em.get(b.employee_id),t=tm.get(b.leave_type_id),total=Number(b.total_days||0),used=Number(b.used_days||0);
    return [b.year,e.employee_code||'',e.full_name||'',e.departments?.name||'',t?.name||'',total,used,total-used];
  });
  const headers=['Tahun','Kode','Karyawan','Departemen','Jenis Cuti','Total Hari','Terpakai','Sisa'];
  return {title:REPORT_META.leave_balances.title,description:'Saldo cuti tahun '+year+'.',headers,rows};
}

async function reportOvertime(start,end,employeeId = ''){
  const [emps,reqs]=await Promise.all([getScopedEmployees(employeeId),sbAll('overtime_requests',{order:{col:'created_at',asc:false}})]);
  const em=new Map(emps.map(e=>[e.id,e]));
  const rows=reqs.filter(r=>em.has(r.employee_id)&&isWithinRange(r.overtime_date,start,end)).map(r=>{
    const e=em.get(r.employee_id);
    return [r.overtime_date?fmtDate(r.overtime_date):'-',e.employee_code||'',e.full_name||'',e.departments?.name||'',r.start_time?fmtDateTime(r.start_time):'-',r.end_time?fmtDateTime(r.end_time):'-',Number(r.hours||0),r.reason||'',Number(r.amount||0),r.status||''];
  });
  const headers=['Tanggal','Kode','Karyawan','Departemen','Mulai','Selesai','Jam','Alasan','Nilai','Status'];
  return {title:REPORT_META.overtime.title,description:REPORT_META.overtime.description,headers,rows};
}

async function reportPayroll(start,end,employeeId = ''){
  const [runs,emps,payslips]=await Promise.all([
    sbAll('payroll_runs',{order:{col:'created_at',asc:false}}),
    getScopedEmployees(employeeId),
    sbAll('payslips')
  ]);
  const em=new Map(emps.map(e=>[e.id,e]));
  const runMap=new Map(runs.map(r=>[r.id,r]));
  const rows=[];
  payslips.filter(p=>em.has(p.employee_id)).forEach(p=>{
    const run=runMap.get(p.payroll_run_id);
    if(!run) return;
    const periodKey=String(run.period_year)+'-'+String(run.period_month).padStart(2,'0')+'-01';
    if(!isWithinRange(periodKey,start,end)) return;
    const e=em.get(p.employee_id);
    let details=[];
    try { details=Array.isArray(p.details)?p.details:JSON.parse(p.details||'[]'); } catch(_){}
    const detailText=details.map(d=>d.name+': '+fmtMoney(d.amount)).join(' | ');
    rows.push([
      String(run.period_month).padStart(2,'0')+'/'+run.period_year,
      e.employee_code||'',e.full_name||'',e.departments?.name||'',
      Number(p.basic_salary||0),Number(p.total_earnings||0),Number(p.total_deductions||0),Number(p.net_salary||0),detailText
    ]);
  });
  const headers=['Periode','Kode','Karyawan','Departemen','Gaji Pokok','Total Pendapatan','Total Potongan','Take Home Pay','Rincian Komponen'];
  return {title:REPORT_META.payroll.title,description:REPORT_META.payroll.description,headers,rows};
}

async function reportRecruitment(start,end){
  const [jobs,cands,depts]=await Promise.all([sbAll('job_postings',{order:{col:'opened_date',asc:false}}),sbAll('candidates',{order:{col:'applied_at',asc:false}}),sbAll('departments')]);
  const dm=new Map(depts.map(d=>[d.id,d]));
  const jm=new Map(jobs.map(j=>[j.id,j]));
  const rows=cands.filter(c=>isWithinRange(c.applied_at,start,end)).map(c=>{
    const j=jm.get(c.job_posting_id);
    return [c.applied_at?fmtDateTime(c.applied_at):'-',j?.title||'',dm.get(j?.department_id)?.name||'',c.full_name||'',c.email||'',c.phone||'',c.stage||''];
  });
  const headers=['Didaftar','Lowongan','Departemen','Kandidat','Email','Telepon','Tahap'];
  return {title:REPORT_META.recruitment.title,description:REPORT_META.recruitment.description,headers,rows};
}

async function reportPerformance(start,end,employeeId = ''){
  const [emps,cycles,reviews]=await Promise.all([getScopedEmployees(employeeId),sbAll('performance_cycles',{order:{col:'start_date',asc:false}}),sbAll('performance_reviews')]);
  const em=new Map(emps.map(e=>[e.id,e]));
  const cm=new Map(cycles.map(c=>[c.id,c]));
  const rows=reviews.filter(r=>em.has(r.employee_id)).map(r=>{
    const c=cm.get(r.cycle_id);
    if(c && !isWithinRange(c.start_date,start,end)) return null;
    const e=em.get(r.employee_id);
    return [c?.name||'',c?.start_date?fmtDate(c.start_date):'-',c?.end_date?fmtDate(c.end_date):'-',e.employee_code||'',e.full_name||'',e.departments?.name||'',r.score ?? '-',r.strengths||'',r.improvements||'',r.status||''];
  }).filter(Boolean);
  const headers=['Siklus','Mulai','Selesai','Kode','Karyawan','Departemen','Skor','Kekuatan','Area Perbaikan','Status'];
  return {title:REPORT_META.performance.title,description:REPORT_META.performance.description,headers,rows};
}

async function reportTraining(start,end,employeeId = ''){
  const [emps,programs,enrollments]=await Promise.all([getScopedEmployees(employeeId),sbAll('training_programs',{order:{col:'start_date',asc:false}}),sbAll('training_enrollments')]);
  const em=new Map(emps.map(e=>[e.id,e])), pm=new Map(programs.map(p=>[p.id,p]));
  const rows=enrollments.filter(en=>em.has(en.employee_id)).map(en=>{
    const p=pm.get(en.program_id);
    if(p && !isWithinRange(p.start_date,start,end)) return null;
    const e=em.get(en.employee_id);
    return [p?.name||'',p?.provider||'',p?.start_date?fmtDate(p.start_date):'-',p?.end_date?fmtDate(p.end_date):'-',e.employee_code||'',e.full_name||'',e.departments?.name||'',en.status||'',en.completion_date?fmtDate(en.completion_date):'-'];
  }).filter(Boolean);
  const headers=['Program','Penyelenggara','Mulai','Selesai','Kode','Karyawan','Departemen','Status','Tanggal Selesai'];
  return {title:REPORT_META.training.title,description:REPORT_META.training.description,headers,rows};
}

async function reportClaims(start,end,employeeId = ''){
  const [emps,claims]=await Promise.all([getScopedEmployees(employeeId),sbAll('reimbursement_claims',{order:{col:'submitted_at',asc:false}})]);
  const em=new Map(emps.map(e=>[e.id,e]));
  const rows=claims.filter(c=>em.has(c.employee_id)&&isWithinRange(c.submitted_at,start,end)).map(c=>{
    const e=em.get(c.employee_id);
    return [c.submitted_at?fmtDateTime(c.submitted_at):'-',e.employee_code||'',e.full_name||'',e.departments?.name||'',c.category||'',Number(c.amount||0),c.description||'',c.status||'',c.approved_at?fmtDateTime(c.approved_at):'-'];
  });
  const headers=['Diajukan','Kode','Karyawan','Departemen','Kategori','Nominal','Keterangan','Status','Disetujui'];
  return {title:REPORT_META.claims.title,description:REPORT_META.claims.description,headers,rows};
}

async function reportAudit(start,end){
  if(!can('reports.audit')) return {title:REPORT_META.audit.title,description:'Akses audit terbatas.',headers:['Status'],rows:[['Akses terbatas']]};
  const logs=await sbAll('audit_logs',{order:{col:'created_at',asc:false}});
  const rows=logs.filter(l=>isWithinRange(l.created_at,start,end)).map(l=>[
    l.created_at?fmtDateTime(l.created_at):'-',l.actor_name||'-',l.action||'',l.entity||'',l.entity_id||'',
    JSON.stringify(l.old_data||{}),JSON.stringify(l.new_data||{})
  ]);
  const headers=['Waktu','Pengguna','Aksi','Entitas','ID Entitas','Data Lama','Data Baru'];
  return {title:REPORT_META.audit.title,description:REPORT_META.audit.description,headers,rows};
}

export function toggleReportEmployeeFilter(){
  const key = el('report-type')?.value;
  const wrap = el('report-employee-wrap');
  if(!wrap) return;
  wrap.style.display = EMPLOYEE_FILTER_REPORTS.has(key) ? '' : 'none';
}

export function updateReportScopeNote(){
  const note = el('report-scope-note');
  if(!note) return;
  const role = getRole();
  if(role === 'admin' || role === 'hr'){
    note.textContent = 'HR/Admin: dapat memilih satu karyawan atau seluruh karyawan. Data dibatasi oleh RLS di Supabase.';
  } else if(role === 'manager'){
    note.textContent = 'Manager: hanya dapat memilih dirinya bukan sebagai target laporan; pilihan karyawan dibatasi pada departemennya sendiri. Data Payroll perusahaan tidak dibuka oleh RLS untuk Manager.';
  } else {
    note.textContent = 'Karyawan: laporan otomatis hanya untuk data Anda sendiri.';
  }
}

function renderReportTable(title,description,headers,rows){
  const area=el('report-area');
  if(!area) return;
  const head='<thead><tr>'+headers.map(h=>'<th>'+escapeHtml(h)+'</th>').join('')+'</tr></thead>';
  const body=rows.length
    ? '<tbody>'+rows.map(row=>'<tr>'+row.map(v=>'<td>'+escapeHtml(formatCell(v))+'</td>').join('')+'</tr>').join('')+'</tbody>'
    : '<tbody><tr><td colspan="'+headers.length+'" class="empty-state">Tidak ada data pada periode/filter ini.</td></tr></tbody>';

  area.innerHTML=
    '<div class="card">' +
      '<div class="report-print-header" style="margin-bottom:14px;">' +
        '<h2 style="margin:0 0 4px;">My HRIS — '+escapeHtml(title)+'</h2>' +
        '<div style="font-size:12px;color:#666;">Dicetak/ditampilkan pada '+escapeHtml(fmtDateTime(new Date().toISOString()))+'</div>' +
        '<div style="font-size:12px;color:#666;margin-top:3px;">'+escapeHtml(description)+'</div>' +
      '</div>' +
      '<div class="toolbar report-controls" style="margin-bottom:10px;"><span style="font-size:12.5px;color:var(--text-muted);">'+rows.length+' baris data</span></div>' +
      '<div style="overflow:auto;"><table class="report-table">'+head+body+'</table></div>' +
    '</div>';
}

function formatCell(value){
  if(typeof value === 'number') return value.toLocaleString('id-ID');
  return value ?? '';
}

export function downloadCurrentReportCSV(){
  if(!currentHeaders.length){
    showToast('Tampilkan laporan terlebih dahulu.', true);
    return;
  }
  const esc = value => {
    const s = value == null ? '' : String(value);
    return '"' + s.replace(/"/g,'""') + '"';
  };
  const lines = [
    currentHeaders.map(esc).join(','),
    ...currentRows.map(row => currentHeaders.map((_,i) => esc(row[i] ?? '')).join(','))
  ];
  const blob = new Blob(['\\uFEFF' + lines.join('\\r\\n')], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().slice(0,10);
  a.href = url;
  a.download = 'MyHRIS_' + currentReportKey + '_' + stamp + '.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('CSV berhasil diunduh.');
}

export async function exportCurrentReportExcel(){
  if(!currentRows.length && !currentHeaders.length){
    await loadReport();
  }
  if(!currentHeaders.length) return;

  if(!window.XLSX){
    showToast('Library Excel belum termuat. Coba muat ulang halaman.', true);
    return;
  }

  const data=currentRows.map(row=>{
    const obj={};
    currentHeaders.forEach((h,i)=>obj[h]=row[i] ?? '');
    return obj;
  });
  const wb=window.XLSX.utils.book_new();
  const ws=window.XLSX.utils.json_to_sheet(data);
  window.XLSX.utils.book_append_sheet(wb,ws,'Laporan');
  const stamp=new Date().toISOString().slice(0,10);
  window.XLSX.writeFile(wb,'MyHRIS_'+currentReportKey+'_'+stamp+'.xlsx');
}

export function printCurrentReport(){
  if(!currentHeaders.length){
    showToast('Tampilkan laporan terlebih dahulu.', true);
    return;
  }
  window.print();
}
