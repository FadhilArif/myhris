import { sb } from '../lib/supabase.js';
import { state, isHR, isManager } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtMoney, fmtDate } from '../utils/format.js';

export async function renderOvertime(){
  const c = el('content');
  const [allReqs, allEmps] = await Promise.all([ sbAll('overtime_requests', {order:{col:'created_at', asc:false}}), sbAll('employees', {select:'*, departments(name)'}) ]);
  const emps = isManager() ? allEmps.filter(e => e.department_id === state.me?.department_id) : allEmps;
  const teamIds = new Set(emps.map(e => e.id));
  const reqs = isManager() ? allReqs.filter(r => teamIds.has(r.employee_id)) : allReqs;
  const pending = reqs.filter(r=>r.status==='pending');
  const approved = reqs.filter(r=>r.status==='approved');
  c.innerHTML = `
    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="stat-card"><div class="stat-num">${pending.length}</div><div class="stat-label">Menunggu</div></div>
      <div class="stat-card"><div class="stat-num">${approved.length}</div><div class="stat-label">Disetujui</div></div>
      <div class="stat-card"><div class="stat-num">${fmtMoney(approved.reduce((s,r)=>s+(Number(r.amount)||0),0))}</div><div class="stat-label">Total Nilai</div></div>
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Tanggal</th><th>Jam</th><th>Durasi</th><th>Alasan</th><th>Nilai</th><th>Status</th><th></th></tr></thead>
    <tbody>${reqs.map(r=>{
      const e = emps.find(x=>x.id===r.employee_id);
      const start = r.start_time ? new Date(r.start_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-';
      const end = r.end_time ? new Date(r.end_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}) : '-';
      return `<tr><td><b>${escapeHtml(e?e.full_name:'-')}</b><br><span style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(e?.departments?.name||'')}</span></td>
        <td>${fmtDate(r.overtime_date)}</td><td>${start} – ${end}</td><td>${r.hours} jam</td>
        <td style="max-width:180px;font-size:12.5px;">${escapeHtml(r.reason||'-')}</td><td>${r.amount?fmtMoney(r.amount):'-'}</td><td>${statusBadge(r.status)}</td>
        <td style="text-align:right;">${r.status==='pending'&&isHR()?`<button class="btn btn-primary btn-sm" onclick="approveOvertime('${r.id}')">Setujui</button> <button class="btn btn-danger btn-sm" onclick="rejectOvertime('${r.id}')">Tolak</button>`:''}</td></tr>`;
    }).join('') || '<tr><td colspan="8" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}

export async function approveOvertime(id){
  const reqs = await sbAll('overtime_requests', {eq:{id}});
  const req = reqs[0];
  if(!req){ showToast('Data tidak ditemukan.', true); return; }
  const emps = await sbAll('employees', {eq:{id: req.employee_id}});
  const emp = emps[0];
  if(!emp){ showToast('Karyawan tidak ditemukan.', true); return; }
  const hourlyRate = (Number(emp.basic_salary)||0) / 173;
  const amount = Math.round(hourlyRate * Number(req.hours) * Number(req.rate_multiplier || 1.5));
  const { error } = await sb.from('overtime_requests').update({ status:'approved', approved_by: state.profile.employee_id||null, approved_at: new Date().toISOString(), amount }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Lembur disetujui: ' + fmtMoney(amount)); renderOvertime();
}

export async function rejectOvertime(id){
  const { error } = await sb.from('overtime_requests').update({ status:'rejected', approved_by: state.profile.employee_id||null, approved_at: new Date().toISOString() }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Lembur ditolak.'); renderOvertime();
}

export async function renderMyOvertime(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const reqs = await sbAll('overtime_requests', {eq:{employee_id: ME.id}, order:{col:'created_at', asc:false}});
  const pending = reqs.filter(r=>r.status==='pending');
  const approved = reqs.filter(r=>r.status==='approved');
  const totalAmount = approved.reduce((s,r)=>s+(Number(r.amount)||0),0);
  c.innerHTML = `
    <div class="toolbar"><div class="grid grid-3" style="flex:1;">
      <div class="stat-card"><div class="stat-num">${pending.length}</div><div class="stat-label">Menunggu</div></div>
      <div class="stat-card"><div class="stat-num">${approved.length}</div><div class="stat-label">Disetujui</div></div>
      <div class="stat-card"><div class="stat-num">${fmtMoney(totalAmount)}</div><div class="stat-label">Total Nilai</div></div>
    </div>
    <button class="btn btn-primary" onclick="openOvertimeRequestForm()" style="align-self:flex-start;">+ Ajukan Lembur</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Tanggal</th><th>Jam</th><th>Durasi</th><th>Alasan</th><th>Nilai</th><th>Status</th></tr></thead>
    <tbody>${reqs.map(r=>{
      const start = new Date(r.start_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      const end = new Date(r.end_time).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      return `<tr><td>${fmtDate(r.overtime_date)}</td><td>${start} – ${end}</td><td>${r.hours} jam</td><td style="font-size:12.5px;">${escapeHtml(r.reason||'-')}</td><td>${r.amount?fmtMoney(r.amount):'-'}</td><td>${statusBadge(r.status)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}

export function openOvertimeRequestForm(){
  const today = new Date().toISOString().slice(0,10);
  openModal(`<h3>Ajukan Lembur</h3>
    <div class="field"><label>Tanggal</label><input id="ot-date" type="date" value="${today}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Jam Mulai</label><input id="ot-start" type="time" value="17:00"></div>
      <div class="field"><label>Jam Selesai</label><input id="ot-end" type="time" value="20:00"></div>
    </div>
    <div class="field"><label>Alasan</label><textarea id="ot-reason" rows="3"></textarea></div>
    <div style="background:#FAFAF6;padding:10px 12px;border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:12px;">
      ℹ️ Rate: (gaji pokok ÷ 173) × jam × 1.5 (standar Depnaker).
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="submitOvertimeRequest()">Ajukan</button>
    </div>`);
}

export async function submitOvertimeRequest(){
  const date = el('ot-date').value;
  const start = el('ot-start').value, end = el('ot-end').value, reason = el('ot-reason').value.trim();
  if(!date || !start || !end){ showToast('Lengkapi tanggal dan jam.', true); return; }
  const startDT = new Date(date+'T'+start+':00');
  const endDT = new Date(date+'T'+end+':00');
  if(endDT <= startDT){ showToast('Jam selesai harus setelah mulai.', true); return; }
  const hours = (endDT - startDT) / 3600000;
  if(hours > 8){ showToast('Lembur maksimal 8 jam.', true); return; }
  const { error } = await sb.from('overtime_requests').insert({ employee_id: state.me.id, overtime_date: date, start_time: startDT.toISOString(), end_time: endDT.toISOString(), hours: Math.round(hours*100)/100, reason, status: 'pending' });
  if(error){ showToast(error.message, true); return; }
  showToast('Pengajuan terkirim.'); closeModal(); renderMyOvertime();
}
