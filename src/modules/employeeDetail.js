import { state, CACHE, isHR, isManager } from '../state/store.js';
import { sbAll, sbAllQuiet } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge, handleDocFileSelect, clearDocFile } from '../utils/dom.js';
import { fmtMoney, fmtDate, fmtDateTime, formatNumberInput, formatFileSize, getFileIcon } from '../utils/format.js';
import { MOVEMENT_LABELS } from '../config/constants.js';
import { logAudit } from '../services/audit.js';
import { isInManagerScope } from '../config/permissions.js';

export const DETAIL_TABS = [
  { id:'overview', label:'Overview' },
  { id:'employment', label:'Employment', hrOnly:true },
  { id:'attendance', label:'Absensi' },
  { id:'leave', label:'Cuti' },
  { id:'payroll', label:'Payroll', hrOnly:true },
  { id:'performance', label:'Kinerja' },
  { id:'training', label:'Training' },
  { id:'movement', label:'Movement', hrOnly:true },
  { id:'documents', label:'Dokumen' },
  { id:'login-history', label:'Riwayat Login' },
  { id:'audit', label:'Audit', hrOnly:true }
];

export function canViewEmployeeDetail(employeeId){
  if(state.me && state.me.id === employeeId) return true;
  if(isHR()) return true;
  if(isManager()){
    const target = CACHE.employees.find(e => e.id === employeeId);
    return !!(target && isInManagerScope(target));
  }
  return false;
}

export async function renderEmployeeDetail(employeeId){
  const c = el('content');
  if(!employeeId){ c.innerHTML = '<div class="empty-state">Karyawan tidak ditemukan.</div>'; return; }
  if(!canViewEmployeeDetail(employeeId)){ c.innerHTML = '<div class="empty-state">Akses ditolak.</div>'; return; }
  c.innerHTML = '<div class="empty-state">Memuat profil…</div>';
  const rows = await sbAll('employees', { select:'*, departments(name), positions(name)', eq:{ id: employeeId } });
  const emp = rows[0];
  if(!emp){ c.innerHTML = '<div class="empty-state">Karyawan tidak ditemukan.</div>'; return; }
  state.empDetail = { id: employeeId, tab: 'overview', employee: emp };
  el('page-title').textContent = 'Profil — ' + emp.full_name;
  const initials = emp.full_name.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase();
  const avatarHtml = emp.photo_url ? `<img src="${escapeHtml(emp.photo_url)}" alt="">` : (initials || '?');
  const backRoute = isHR() ? 'employees' : 'directory';
  const tabs = DETAIL_TABS.filter(t => !t.hrOnly || isHR() || (state.me && state.me.id === employeeId));

  c.innerHTML = `
    <div class="emp-detail-header">
      <div class="emp-avatar-lg">${avatarHtml}</div>
      <div style="flex:1;min-width:200px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <h2 style="margin:0;font-size:19px;">${escapeHtml(emp.full_name)}</h2>${statusBadge(emp.employment_status)}
        </div>
        <div style="color:var(--text-muted);font-size:13.5px;margin-top:2px;">${escapeHtml(emp.positions?.name||'-')} • ${escapeHtml(emp.departments?.name||'-')}</div>
        <div class="emp-detail-meta">
          <span>Kode: <b>${escapeHtml(emp.employee_code||'-')}</b></span>
          <span>Email: <b>${escapeHtml(emp.email||'-')}</b></span>
          <span>Telepon: <b>${escapeHtml(emp.phone||'-')}</b></span>
          <span>Bergabung: <b>${fmtDate(emp.join_date)}</b></span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="btn btn-outline btn-sm" onclick="navigate('${backRoute}')">← Kembali</button>
        ${isHR() ? `<button class="btn btn-outline btn-sm" onclick='openEmployeeForm(${JSON.stringify(emp).replace(/'/g,"&apos;")})'>Edit</button>` : ''}
        <button class="btn btn-outline btn-sm" onclick="window.print()">Cetak</button>
      </div>
    </div>
    <div class="detail-tab-row" id="detail-tab-row">
      ${tabs.map(t => `<div class="tab ${t.id==='overview'?'active':''}" data-tab="${t.id}" onclick="switchDetailTab('${t.id}')">${t.label}</div>`).join('')}
    </div>
    <div id="detail-tab-content"><div class="empty-state">Memuat…</div></div>`;
  switchDetailTab('overview');
}

export function switchDetailTab(tab){
  state.empDetail.tab = tab;
  document.querySelectorAll('#detail-tab-row .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  const loaders = {
    overview: loadDetailOverview, employment: loadDetailEmployment, attendance: loadDetailAttendance,
    leave: loadDetailLeave, payroll: loadDetailPayroll, performance: loadDetailPerformance,
    training: loadDetailTraining, movement: loadDetailMovement, documents: loadDetailDocuments, 'login-history': loadDetailLoginHistory, audit: loadDetailAudit
  };
  (loaders[tab] || loadDetailOverview)();
}

export async function loadDetailOverview(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  container.innerHTML = '<div class="empty-state">Memuat ringkasan…</div>';
  const year = new Date().getFullYear();
  const [balances, slips, reviews, enrolls] = await Promise.all([
    sbAll('leave_balances', { eq:{ employee_id: emp.id, year } }),
    sbAll('payslips', { eq:{ employee_id: emp.id }, order:{ col:'created_at', asc:false } }),
    sbAll('performance_reviews', { eq:{ employee_id: emp.id } }),
    sbAll('training_enrollments', { eq:{ employee_id: emp.id } })
  ]);
  const sisaCuti = balances.reduce((s,b)=>s+(Number(b.total_days)-Number(b.used_days)), 0);
  const lastSlip = slips[0], lastReview = reviews[reviews.length-1];
  const completedTraining = enrolls.filter(e=>e.status==='completed').length;
  container.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-num">${sisaCuti.toFixed(1)}</div><div class="stat-label">Sisa Cuti (${year})</div></div>
      <div class="stat-card"><div class="stat-num">${lastSlip ? fmtMoney(lastSlip.net_salary) : '-'}</div><div class="stat-label">Gaji Bersih Terakhir</div></div>
      <div class="stat-card"><div class="stat-num">${lastReview ? lastReview.score : '-'}</div><div class="stat-label">Skor Kinerja Terakhir</div></div>
      <div class="stat-card"><div class="stat-num">${completedTraining}/${enrolls.length}</div><div class="stat-label">Training Selesai</div></div>
    </div>
    <div class="card"><h3 style="margin-top:0;">Informasi Dasar</h3>
      <table><tbody>
        <tr><td style="color:var(--text-muted);width:180px;">Departemen</td><td>${escapeHtml(emp.departments?.name||'-')}</td></tr>
        <tr><td style="color:var(--text-muted);">Jabatan</td><td>${escapeHtml(emp.positions?.name||'-')}</td></tr>
        <tr><td style="color:var(--text-muted);">Tanggal Bergabung</td><td>${fmtDate(emp.join_date)}</td></tr>
        <tr><td style="color:var(--text-muted);">Status</td><td>${statusBadge(emp.employment_status)}</td></tr>
        ${(isHR() || (state.me && state.me.id===emp.id)) ? `<tr><td style="color:var(--text-muted);">Gaji Pokok</td><td>${fmtMoney(emp.basic_salary)}</td></tr><tr><td style="color:var(--text-muted);">Nama Bank</td><td>${escapeHtml(emp.bank_name||'-')}</td></tr><tr><td style="color:var(--text-muted);">Nomor Rekening</td><td>${escapeHtml(emp.bank_account_number||'-')}</td></tr>` : ''}
      </tbody></table>
    </div>`;
}

export async function loadDetailEmployment(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  container.innerHTML = '<div class="empty-state">Memuat kontrak…</div>';
  const contracts = await sbAllQuiet('contracts', { eq:{ employee_id: emp.id }, order:{ col:'start_date', asc:false } });
  container.innerHTML = `
    <div class="toolbar"><span style="font-size:12.5px;color:var(--text-muted);">Riwayat kontrak kerja</span>
      ${isHR() ? `<button class="btn btn-primary btn-sm" onclick="openContractForm('${emp.id}')">+ Tambah Kontrak</button>` : ''}</div>
    <div class="card" style="padding:0;"><table><thead><tr><th>No. Kontrak</th><th>Tipe</th><th>Mulai</th><th>Berakhir</th><th>Gaji</th><th>Status</th></tr></thead>
      <tbody>${contracts.map(c=>`<tr><td>${escapeHtml(c.contract_number||'-')}</td><td>${escapeHtml(c.contract_type)}</td><td>${fmtDate(c.start_date)}</td><td>${c.end_date?fmtDate(c.end_date):'-'}</td><td>${fmtMoney(c.basic_salary)}</td><td>${statusBadge(c.status)}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">Belum ada kontrak.</td></tr>'}</tbody></table></div>`;
}

export function openContractForm(employeeId){
  openModal(`<h3>Tambah Kontrak</h3>
    <div class="field"><label>No. Kontrak</label><input id="ct-number"></div>
    <div class="field"><label>Tipe</label><select id="ct-type">${['PKWT','PKWTT','Internship','Freelance'].map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
    <div class="field"><label>Tanggal Mulai</label><input id="ct-start" type="date"></div>
    <div class="field"><label>Tanggal Berakhir</label><input id="ct-end" type="date"></div>
    <div class="field"><label>Gaji Pokok</label><input id="ct-salary" type="text" oninput="formatNumberInput(this)" value="0"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveContract('${employeeId}')">Simpan</button>
    </div>`);
}

export async function saveContract(employeeId){
  const payload = { employee_id: employeeId, contract_number: el('ct-number').value.trim(), contract_type: el('ct-type').value, start_date: el('ct-start').value, end_date: el('ct-end').value || null, basic_salary: Number(el('ct-salary').value.replace(/[^0-9]/g,''))||0 };
  const { error } = await sb.from('contracts').insert(payload);
  if(error){ showToast('Gagal: '+error.message, true); return; }
  showToast('Kontrak disimpan.'); closeModal(); loadDetailEmployment();
}

export async function loadDetailAttendance(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const history = await sbAll('attendance', { eq:{ employee_id: emp.id }, order:{ col:'work_date', asc:false } });
  const last30 = history.slice(0,30);
  const hadir = last30.filter(a=>a.status==='present').length;
  const terlambat = last30.filter(a=>a.status==='late').length;
  const absen = last30.filter(a=>a.status==='absent').length;
  container.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-num">${hadir}</div><div class="stat-label">Hadir</div></div>
      <div class="stat-card"><div class="stat-num">${terlambat}</div><div class="stat-label">Terlambat</div></div>
      <div class="stat-card"><div class="stat-num">${absen}</div><div class="stat-label">Absen</div></div>
      <div class="stat-card"><div class="stat-num">${last30.length}</div><div class="stat-label">Tercatat</div></div>
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Status</th></tr></thead>
      <tbody>${last30.map(h=>`<tr><td>${fmtDate(h.work_date)}</td><td>${h.check_in?fmtDateTime(h.check_in):'-'}</td><td>${h.check_out?fmtDateTime(h.check_out):'-'}</td><td>${statusBadge(h.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada riwayat.</td></tr>'}</tbody></table></div>`;
}

export async function loadDetailLeave(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const year = new Date().getFullYear();
  const [balances, reqs] = await Promise.all([
    sbAll('leave_balances', { eq:{ employee_id: emp.id, year } }),
    sbAll('leave_requests', { eq:{ employee_id: emp.id }, order:{ col:'created_at', asc:false } })
  ]);
  container.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:16px;">
      ${balances.map(b=>{ const t=CACHE.leaveTypes.find(x=>x.id===b.leave_type_id); return `<div class="stat-card"><div class="stat-num">${(Number(b.total_days)-Number(b.used_days)).toFixed(1)}</div><div class="stat-label">Sisa ${escapeHtml(t?t.name:'-')}</div></div>`; }).join('') || '<div class="empty-state">Belum ada saldo.</div>'}
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th></tr></thead>
      <tbody>${reqs.map(r=>{ const t=CACHE.leaveTypes.find(x=>x.id===r.leave_type_id); return `<tr><td>${escapeHtml(t?t.name:'-')}</td><td>${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}</td><td>${r.total_days}</td><td>${escapeHtml(r.reason||'-')}</td><td>${statusBadge(r.status)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}

export async function loadDetailPayroll(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const [slips, runs] = await Promise.all([
    sbAll('payslips', { eq:{ employee_id: emp.id }, order:{ col:'created_at', asc:false } }),
    sbAll('payroll_runs')
  ]);
  const year = new Date().getFullYear();
  const totalTahunIni = slips.filter(s => runs.find(r=>r.id===s.payroll_run_id)?.period_year === year).reduce((sum,s)=>sum+Number(s.net_salary||0), 0);
  const last12 = slips.slice(0,12);
  container.innerHTML = `
    <div class="card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <div>Total gaji bersih tahun ${year}</div>
      <div style="font-family:'Manrope';font-weight:800;font-size:20px;color:var(--accent-dark);">${fmtMoney(totalTahunIni)}</div>
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Periode</th><th>Gaji Pokok</th><th>Pendapatan</th><th>Potongan</th><th>Gaji Bersih</th><th></th></tr></thead>
      <tbody>${last12.map(s=>{
        const run = runs.find(r=>r.id===s.payroll_run_id);
        const periode = run ? String(run.period_month).padStart(2,'0')+'/'+run.period_year : '-';
        return `<tr><td>${periode}</td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td style="color:var(--danger);">− ${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td>
          <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='showPayslipDetail(${JSON.stringify(s).replace(/'/g,"&apos;")}, "${periode}", ${JSON.stringify(emp).replace(/'/g,"&apos;")})'>📄 Detail</button></td></tr>`;
      }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada slip.</td></tr>'}</tbody></table></div>`;
}

export function showPayslipDetail(slip, periode, emp){
  const details = Array.isArray(slip.details) ? slip.details : [];
  const earningRows = details.filter(d=>d.type==='earning').map(d => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="font-weight:600;">${fmtMoney(d.amount)}</span></div>`).join('') || `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;"><span>Gaji Pokok</span><span>${fmtMoney(slip.basic_salary)}</span></div>`;
  const deductionRows = details.filter(d=>d.type==='deduction').map(d => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="color:var(--danger);">− ${fmtMoney(d.amount)}</span></div>`).join('') || '<div style="padding:8px 0;text-align:center;color:var(--text-muted);">Tidak ada potongan</div>';
  openModal(`
    <h3>Detail Slip Gaji</h3>
    <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 16px;">${escapeHtml(emp.full_name)} • ${periode}</p>
    <div style="background:#E9F5EE;border-radius:8px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;"><div>GAJI BERSIH</div><div style="font-weight:800;font-size:22px;color:var(--accent-dark);">${fmtMoney(slip.net_salary)}</div></div>
    <div style="margin-bottom:14px;"><div style="font-weight:700;color:var(--accent-dark);border-bottom:2px solid var(--border);padding-bottom:6px;margin-bottom:6px;">💰 Pendapatan</div>${earningRows}</div>
    <div style="margin-bottom:14px;"><div style="font-weight:700;color:var(--danger);border-bottom:2px solid var(--border);padding-bottom:6px;margin-bottom:6px;">📉 Potongan</div>${deductionRows}</div>
    <div style="display:flex;justify-content:flex-end;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button></div>`);
}

export async function loadDetailPerformance(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const [reviews, cycles] = await Promise.all([
    sbAll('performance_reviews', { eq:{ employee_id: emp.id } }),
    sbAll('performance_cycles', { order:{ col:'start_date', asc:false } })
  ]);
  container.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Siklus</th><th>Skor</th><th>Kekuatan</th><th>Area Perbaikan</th><th>Status</th></tr></thead>
    <tbody>${cycles.map(cy=>{ const r = reviews.find(x=>x.cycle_id===cy.id); if(!r) return ''; return `<tr><td>${escapeHtml(cy.name)}</td><td><b>${r.score??'-'}</b></td><td>${escapeHtml(r.strengths||'-')}</td><td>${escapeHtml(r.improvements||'-')}</td><td>${statusBadge(r.status)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada penilaian.</td></tr>'}</tbody></table></div>`;
}

export async function loadDetailTraining(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const [enrolls, programs] = await Promise.all([
    sbAll('training_enrollments', { eq:{ employee_id: emp.id } }),
    sbAll('training_programs')
  ]);
  container.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Program</th><th>Penyelenggara</th><th>Tanggal</th><th>Status</th></tr></thead>
    <tbody>${enrolls.map(en=>{ const p = programs.find(x=>x.id===en.program_id); return `<tr><td>${escapeHtml(p?.name||'-')}</td><td>${escapeHtml(p?.provider||'-')}</td><td>${p?fmtDate(p.start_date)+' - '+fmtDate(p.end_date):'-'}</td><td>${statusBadge(en.status)}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty-state">Belum mengikuti training.</td></tr>'}</tbody></table></div>`;
}

export async function loadDetailMovement(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const [moves, depts, positions] = await Promise.all([
    sbAllQuiet('employee_movements', { eq:{ employee_id: emp.id }, order:{ col:'effective_date', asc:false } }),
    sbAll('departments'), sbAll('positions')
  ]);
  const nameOf = (list,id) => list.find(x=>x.id===id)?.name || '-';
  container.innerHTML = `
    <div class="toolbar"><span></span>${isHR() ? `<button class="btn btn-primary btn-sm" onclick="openMovementForm('${emp.id}')">+ Catat Movement</button>` : ''}</div>
    <div class="card">${moves.map(m=>`
      <div class="movement-item">
        <div style="width:110px;color:var(--text-muted);">${fmtDate(m.effective_date)}</div>
        <div style="flex:1;">
          <b>${MOVEMENT_LABELS[m.movement_type]||m.movement_type}</b>
          ${m.from_department_id||m.to_department_id ? `<div>Dept: ${nameOf(depts,m.from_department_id)} → ${nameOf(depts,m.to_department_id)}</div>` : ''}
          ${m.from_position_id||m.to_position_id ? `<div>Jabatan: ${nameOf(positions,m.from_position_id)} → ${nameOf(positions,m.to_position_id)}</div>` : ''}
          ${m.reason ? `<div style="color:var(--text-muted);">${escapeHtml(m.reason)}</div>` : ''}
        </div>
      </div>`).join('') || '<div class="empty-state">Belum ada riwayat movement.</div>'}</div>`;
}

export function openMovementForm(employeeId){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  const posOpts = CACHE.positions.map(p=>`<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  openModal(`<h3>Catat Movement</h3>
    <div class="field"><label>Tipe</label><select id="mv-type">${Object.entries(MOVEMENT_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div>
    <div class="field"><label>Tanggal Efektif</label><input id="mv-date" type="date"></div>
    <div class="field"><label>Dept Tujuan</label><select id="mv-dept"><option value="">- Tidak berubah -</option>${deptOpts}</select></div>
    <div class="field"><label>Jabatan Tujuan</label><select id="mv-pos"><option value="">- Tidak berubah -</option>${posOpts}</select></div>
    <div class="field"><label>Gaji Baru</label><input id="mv-salary" type="text" oninput="formatNumberInput(this)"></div>
    <div class="field"><label>Alasan</label><textarea id="mv-reason" rows="2"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveMovement('${employeeId}')">Simpan</button>
    </div>`);
}

export async function saveMovement(employeeId){
  const payload = { employee_id: employeeId, movement_type: el('mv-type').value, effective_date: el('mv-date').value, to_department_id: el('mv-dept').value || null, to_position_id: el('mv-pos').value || null, to_salary: el('mv-salary').value ? Number(el('mv-salary').value.replace(/[^0-9]/g,'')) : null, reason: el('mv-reason').value.trim() };
  if(!payload.effective_date){ showToast('Tanggal efektif wajib.', true); return; }
  const { error } = await sb.from('employee_movements').insert(payload);
  if(error){ showToast('Gagal: '+error.message, true); return; }
  showToast('Movement dicatat.'); closeModal(); loadDetailMovement();
}

export function getDocumentStoragePath(doc){
  if(doc?.storage_path) return doc.storage_path;
  const url = String(doc?.file_url || '');
  const match = url.match(/\/storage\/v1\/object\/public\/employee-documents\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function loadDetailDocuments(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const docs = await sbAllQuiet('employee_documents', { eq:{ employee_id: emp.id }, order:{ col:'created_at', asc:false } });
  const canManage = isHR() || (state.me && state.me.id === emp.id);

  container.innerHTML = `
    <div class="toolbar">
      <span style="font-size:12.5px;color:var(--text-muted);">${docs.length} dokumen tersimpan</span>
      ${canManage ? `<button class="btn btn-primary btn-sm" onclick="openDocumentForm('${emp.id}')">+ Upload Dokumen</button>` : ''}
    </div>
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:12.5px;color:var(--text-muted);">
        Dokumen disimpan sebagai file <b>privat</b>. Link akses dibuat sementara saat tombol <b>Lihat</b> ditekan.
      </div>
    </div>
    <div class="doc-grid">${docs.map(d=>`
      <div class="doc-card" style="position:relative;">
        <div style="font-size:28px;margin-bottom:6px;">${getFileIcon(d.file_name||'')}</div>
        <div style="font-weight:700;margin-bottom:4px;font-size:13px;">${escapeHtml(d.document_type)}</div>
        <div style="color:var(--text-muted);margin-bottom:6px;word-break:break-all;font-size:11.5px;">${escapeHtml(d.file_name)}</div>
        ${d.file_size ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px;">${formatFileSize(d.file_size)}</div>` : ''}
        ${d.expiry_date ? `<div style="font-size:11.5px;color:var(--warning);margin-bottom:8px;">📅 Berlaku sampai ${fmtDate(d.expiry_date)}</div>` : ''}
        <button onclick="openSecureDocument('${d.id}')" class="btn btn-outline btn-sm" style="width:100%;justify-content:center;">Lihat</button>
        ${canManage ? `<button onclick="deleteDocument('${d.id}')" style="position:absolute;top:8px;right:8px;background:none;border:none;color:var(--danger);cursor:pointer;font-size:14px;" title="Hapus dokumen">🗑</button>` : ''}
      </div>`).join('') || '<div class="empty-state">Belum ada dokumen.</div>'}</div>`;
}

export async function openSecureDocument(docId){
  const popup = window.open('', '_blank');
  if(!popup){
    showToast('Browser memblokir jendela dokumen. Izinkan pop-up untuk MyHRIS.', true);
    return;
  }

  popup.document.write('<p style="font-family:Arial;padding:24px">Menyiapkan dokumen…</p>');

  try {
    const rows = await sbAllQuiet('employee_documents', { eq:{ id: docId } });
    const doc = rows[0];
    if(!doc){
      popup.close();
      showToast('Dokumen tidak ditemukan.', true);
      return;
    }

    const emp = state.empDetail.employee;
    if(!isHR() && !(state.me && state.me.id === emp?.id)){
      popup.close();
      showToast('Anda tidak memiliki akses ke dokumen ini.', true);
      return;
    }

    const path = getDocumentStoragePath(doc);
    if(!path){
      popup.close();
      showToast('Lokasi penyimpanan dokumen tidak tersedia.', true);
      return;
    }

    const { data, error } = await sb.storage
      .from('employee-documents')
      .createSignedUrl(path, 10 * 60);

    if(error || !data?.signedUrl){
      popup.close();
      showToast('Gagal membuat link dokumen: ' + (error?.message || 'unknown error'), true);
      return;
    }

    popup.location.href = data.signedUrl;
  } catch(e){
    popup.close();
    showToast('Gagal membuka dokumen: ' + e.message, true);
  }
}

export async function deleteDocument(docId){
  if(!confirm('Hapus dokumen ini?')) return;

  try {
    const rows = await sbAllQuiet('employee_documents', { eq:{ id: docId } });
    const doc = rows[0];
    if(!doc){ showToast('Dokumen tidak ditemukan.', true); return; }

    const emp = state.empDetail.employee;
    if(!isHR() && !(state.me && state.me.id === emp?.id)){
      showToast('Anda tidak memiliki akses.', true);
      return;
    }

    const path = getDocumentStoragePath(doc);
    if(path){
      const { error: storageError } = await sb.storage
        .from('employee-documents')
        .remove([path]);

      if(storageError){
        showToast('Gagal menghapus file: ' + storageError.message, true);
        return;
      }
    }

    const { error } = await sb
      .from('employee_documents')
      .delete()
      .eq('id', docId);

    if(error){
      showToast('Gagal hapus metadata: ' + error.message, true);
      return;
    }

    await logAudit('DELETE', 'employee_documents', docId, {
      employee_id: doc.employee_id,
      document_type: doc.document_type,
      file_name: doc.file_name,
      storage_path: path
    }, null);

    showToast('Dokumen dihapus.');
    loadDetailDocuments();
  } catch(e){
    showToast('Gagal hapus: ' + e.message, true);
  }
}

export function openDocumentForm(employeeId){
  openModal(`<h3>Tambah Dokumen</h3>
    <div class="field"><label>Jenis Dokumen</label><select id="dc-type">${['KTP','NPWP','Kontrak','Ijazah','Sertifikat','Lainnya'].map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
    <div class="field"><label>Pilih File</label>
      <div id="dc-dropzone" style="border:2px dashed var(--border);border-radius:10px;padding:24px;text-align:center;cursor:pointer;background:#FAFAF6;"
        onclick="document.getElementById('dc-file').click()"
        ondragover="event.preventDefault(); this.style.borderColor='var(--accent)'; this.style.background='#E9F5EE';"
        ondragleave="this.style.borderColor='var(--border)'; this.style.background='#FAFAF6';"
        ondrop="event.preventDefault(); this.style.borderColor='var(--border)'; this.style.background='#FAFAF6'; document.getElementById('dc-file').files = event.dataTransfer.files; handleDocFileSelect();">
        <input type="file" id="dc-file" style="display:none;" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onchange="handleDocFileSelect()">
        <div style="font-size:32px;margin-bottom:6px;">📁</div>
        <div style="font-size:13px;font-weight:600;">Klik atau drag file ke sini</div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:4px;">PDF, JPG, PNG, DOC, XLS • Maks 10 MB</div>
      </div>
      <div id="dc-file-info" style="display:none;margin-top:10px;padding:10px 12px;background:#E9F5EE;border-radius:8px;font-size:12.5px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span id="dc-file-icon" style="font-size:20px;">📄</span>
          <div style="flex:1;min-width:0;">
            <div id="dc-file-name" style="font-weight:600;word-break:break-all;"></div>
            <div id="dc-file-size" style="color:var(--text-muted);font-size:11.5px;"></div>
          </div>
          <button type="button" onclick="clearDocFile()" style="background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px;">✕</button>
        </div>
      </div>
    </div>
    <div class="field"><label>Tanggal Kedaluwarsa (opsional)</label><input id="dc-expiry" type="date"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="dc-submit" onclick="saveDocumentWithUpload('${employeeId}')">Upload & Simpan</button>
    </div>`);
}

export async function saveDocumentWithUpload(employeeId){
  const fileInput = el('dc-file');
  const submitBtn = el('dc-submit');
  if(!fileInput.files || !fileInput.files.length){ showToast('Pilih file dulu.', true); return; }
  const file = fileInput.files[0];
  const allowedTypes = [
    'application/pdf',
    'image/jpeg','image/png','image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  if(!allowedTypes.includes(file.type)){ showToast('Tipe file tidak diizinkan.', true); return; }
  if(file.size > 10 * 1024 * 1024){ showToast('Maks 10 MB.', true); return; }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Mengupload…';

  try {
    const emp = state.empDetail.employee;
    if(!isHR() && !(state.me && state.me.id === emp?.id)){
      showToast('Anda tidak memiliki akses.', true);
      return;
    }

    const ext = file.name.split('.').pop().toLowerCase();
    const safeType = el('dc-type').value.toLowerCase().replace(/[^a-z0-9]/g,'_');
    const fileName = `${employeeId}/${safeType}_${Date.now()}.${ext}`;

    const { error: uploadErr } = await sb.storage
      .from('employee-documents')
      .upload(fileName, file, {
        cacheControl:'600',
        upsert:false,
        contentType: file.type
      });

    if(uploadErr){
      showToast('Gagal upload: ' + uploadErr.message, true);
      return;
    }

    const payload = {
      employee_id: employeeId,
      document_type: el('dc-type').value,
      file_name: file.name,
      file_url: null,
      storage_path: fileName,
      file_size: file.size,
      file_type: file.type,
      expiry_date: el('dc-expiry').value || null,
      uploaded_by: state.currentUser?.id || null
    };

    const { data: inserted, error: dbErr } = await sb
      .from('employee_documents')
      .insert(payload)
      .select('id')
      .maybeSingle();

    if(dbErr){
      await sb.storage.from('employee-documents').remove([fileName]);
      showToast('Gagal simpan metadata: ' + dbErr.message, true);
      return;
    }

    await logAudit('CREATE', 'employee_documents', inserted?.id || null, null, {
      employee_id: employeeId,
      document_type: payload.document_type,
      file_name: payload.file_name,
      storage_path: payload.storage_path
    });

    showToast('✅ Dokumen berhasil diupload.');
    closeModal();
    loadDetailDocuments();
  } catch(e){
    showToast('Error: ' + e.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Upload & Simpan';
  }
}

export async function loadDetailLoginHistory(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  const canView = isHR() || (state.me && state.me.id === emp.id);
  if(!canView){ container.innerHTML = '<div class="empty-state">Akses ditolak.</div>'; return; }

  const logs = await sbAllQuiet('login_history', {
    eq:{ employee_id: emp.id },
    order:{ col:'logged_in_at', asc:false }
  });

  container.innerHTML = `
    <div class="card" style="margin-bottom:14px;">
      <div style="font-size:13px;color:var(--text-muted);">
        Riwayat ini mencatat login yang berhasil ke aplikasi. Lokasi bersifat <b>perkiraan</b> berdasarkan timezone perangkat dan tidak menggunakan GPS.
      </div>
    </div>
    <div class="card" style="padding:0;overflow:auto;">
      <table>
        <thead><tr><th>Tanggal & Jam</th><th>Lokasi Perkiraan</th><th>Perangkat</th><th>Browser</th></tr></thead>
        <tbody>
          ${logs.map(l => `<tr>
            <td>${fmtDateTime(l.logged_in_at)}</td>
            <td>${escapeHtml(l.approximate_location || '-')}</td>
            <td>${escapeHtml(l.device || '-')}</td>
            <td>${escapeHtml(l.browser || '-')}</td>
          </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada riwayat login.</td></tr>'}
        </tbody>
      </table>
    </div>`;
}

export async function loadDetailAudit(){
  const emp = state.empDetail.employee;
  const container = el('detail-tab-content');
  if(!isHR()){ container.innerHTML = '<div class="empty-state">Akses ditolak.</div>'; return; }
  const logs = await sbAllQuiet('audit_logs', { eq:{ entity:'employees', entity_id: emp.id }, order:{ col:'created_at', asc:false } });
  const actionBadge = (action) => {
    const map = { 'CREATE':{bg:'#E9F5EE',color:'#2F8F63',label:'Dibuat'},'UPDATE':{bg:'#FBF1DE',color:'#B8842E',label:'Diubah'},'DELETE':{bg:'#FBEAE6',color:'#B3402F',label:'Dihapus'} };
    const v = map[action] || { bg:'#EFEDE3', color:'#6E766F', label:action };
    return `<span style="background:${v.bg};color:${v.color};padding:3px 10px;border-radius:20px;font-size:11.5px;font-weight:600;">${v.label}</span>`;
  };
  container.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Waktu</th><th>Aktor</th><th>Aksi</th></tr></thead>
    <tbody>${logs.map(l=>`<tr><td>${fmtDateTime(l.created_at)}</td><td>${escapeHtml(l.actor_name||'-')}</td><td>${actionBadge(l.action)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada log.</td></tr>'}</tbody></table></div>`;
}
