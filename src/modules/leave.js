import { sb } from '../lib/supabase.js';
import { state, CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { logAudit } from '../services/audit.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

export async function renderLeave(){
  const c = el('content');
  c.innerHTML = `<div class="tab-row">
    <div class="tab active" data-tab="requests" onclick="switchLeaveTab('requests')">Pengajuan</div>
    <div class="tab" data-tab="balances" onclick="switchLeaveTab('balances')">Saldo Cuti</div>
  </div><div id="leave-body"></div>`;
  switchLeaveTab('requests');
}

export function switchLeaveTab(tab){
  document.querySelectorAll('#content .tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  tab === 'requests' ? loadLeaveRequests() : loadLeaveBalances();
}

export async function loadLeaveRequests(){
  const [reqs, emps, types] = await Promise.all([ sbAll('leave_requests', {order:{col:'created_at', asc:false}}), sbAll('employees'), sbAll('leave_types') ]);
  el('leave-body').innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th><th></th></tr></thead>
    <tbody>${reqs.map(r=>{
      const emp = emps.find(e=>e.id===r.employee_id); const type = types.find(t=>t.id===r.leave_type_id);
      return `<tr><td>${escapeHtml(emp?emp.full_name:'-')}</td><td>${escapeHtml(type?type.name:'-')}</td><td>${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}</td><td>${r.total_days}</td><td>${escapeHtml(r.reason||'-')}</td><td>${statusBadge(r.status)}</td>
      <td style="text-align:right;">${r.status==='pending'?`
        <button class="btn btn-primary btn-sm" onclick="decideLeave('${r.id}','approved','${r.employee_id}','${r.leave_type_id}',${r.total_days})">Setujui</button>
        <button class="btn btn-danger btn-sm" onclick="decideLeave('${r.id}','rejected')">Tolak</button>`:''}</td></tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}

export async function decideLeave(id, decision, employeeId, leaveTypeId, days){
  const { error } = await sb.from('leave_requests').update({ status: decision, approved_at: new Date().toISOString(), approved_by: state.profile.employee_id||null }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  await logAudit('APPROVE_' + decision.toUpperCase(), 'leave_requests', id, null, { status: decision });
  showToast('Status cuti diperbarui.'); loadLeaveRequests();
}

export async function loadLeaveBalances(){
  const [emps, types, balances] = await Promise.all([ sbAll('employees'), sbAll('leave_types'), sbAll('leave_balances') ]);
  el('leave-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openBalanceForm()">+ Set Saldo Cuti</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Jenis Cuti</th><th>Tahun</th><th>Total</th><th>Terpakai</th><th>Sisa</th></tr></thead>
    <tbody>${balances.map(b=>{
      const emp = emps.find(e=>e.id===b.employee_id); const type = types.find(t=>t.id===b.leave_type_id);
      return `<tr><td>${escapeHtml(emp?emp.full_name:'-')}</td><td>${escapeHtml(type?type.name:'-')}</td><td>${b.year}</td><td>${b.total_days}</td><td>${b.used_days}</td><td>${(b.total_days-b.used_days).toFixed(1)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada saldo cuti.</td></tr>'}</tbody></table></div>`;
}

export function openBalanceForm(){
  const empOpts = CACHE.employees.map(e=>`<option value="${e.id}">${escapeHtml(e.full_name)}</option>`).join('');
  const typeOpts = CACHE.leaveTypes.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  openModal(`<h3>Set Saldo Cuti</h3>
    <div class="field"><label>Karyawan</label><select id="b-emp">${empOpts}</select></div>
    <div class="field"><label>Jenis Cuti</label><select id="b-type">${typeOpts}</select></div>
    <div class="field"><label>Tahun</label><input id="b-year" type="number" value="${new Date().getFullYear()}"></div>
    <div class="field"><label>Total Hari</label><input id="b-total" type="number" value="12"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveBalance()">Simpan</button>
    </div>`);
}

export async function saveBalance(){
  const payload = { employee_id: el('b-emp').value, leave_type_id: el('b-type').value, year: Number(el('b-year').value), total_days: Number(el('b-total').value), used_days: 0 };
  const { error } = await sb.from('leave_balances').upsert(payload, { onConflict: 'employee_id,leave_type_id,year' });
  if(error){ showToast(error.message, true); return; }
  showToast('Saldo cuti disimpan.'); closeModal(); loadLeaveBalances();
}

export async function renderMyLeave(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const [reqs, balances] = await Promise.all([
    sbAll('leave_requests', {eq:{employee_id: ME.id}, order:{col:'created_at', asc:false}}),
    sbAll('leave_balances', {eq:{employee_id: ME.id, year: new Date().getFullYear()}})
  ]);
  c.innerHTML = `
    <div class="toolbar"><div class="grid grid-4" style="flex:1;">
      ${balances.map(b=>{ const t=CACHE.leaveTypes.find(x=>x.id===b.leave_type_id); return `<div class="stat-card"><div class="stat-num">${(b.total_days-b.used_days).toFixed(1)}</div><div class="stat-label">Sisa ${t?t.name:''}</div></div>`; }).join('') || ''}
    </div></div>
    <div class="toolbar"><span></span><button class="btn btn-primary" onclick="openLeaveRequestForm()">+ Ajukan Cuti</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th></tr></thead>
    <tbody>${reqs.map(r=>{ const t=CACHE.leaveTypes.find(x=>x.id===r.leave_type_id); return `<tr><td>${t?t.name:'-'}</td><td>${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}</td><td>${r.total_days}</td><td>${escapeHtml(r.reason||'-')}</td><td>${statusBadge(r.status)}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}

export function openLeaveRequestForm(){
  const typeOpts = CACHE.leaveTypes.map(t=>`<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
  openModal(`<h3>Ajukan Cuti</h3>
    <div class="field"><label>Jenis Cuti</label><select id="lr-type">${typeOpts}</select></div>
    <div class="field"><label>Tanggal Mulai</label><input id="lr-start" type="date"></div>
    <div class="field"><label>Tanggal Selesai</label><input id="lr-end" type="date"></div>
    <div class="field"><label>Alasan</label><textarea id="lr-reason" rows="3"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="submitLeaveRequest()">Ajukan</button>
    </div>`);
}

export async function submitLeaveRequest(){
  const start = el('lr-start').value, end = el('lr-end').value;
  if(!start || !end){ showToast('Lengkapi tanggal.', true); return; }
  const days = Math.round((new Date(end)-new Date(start))/86400000) + 1;
  if(days <= 0){ showToast('Tanggal selesai harus setelah mulai.', true); return; }
  const { error } = await sb.from('leave_requests').insert({ employee_id: state.me.id, leave_type_id: el('lr-type').value, start_date: start, end_date: end, total_days: days, reason: el('lr-reason').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Pengajuan cuti terkirim.'); closeModal(); renderMyLeave();
}
