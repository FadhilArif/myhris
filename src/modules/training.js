import { sb } from '../lib/supabase.js';
import { state, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

export async function renderTraining(){
  const c = el('content');
  const programs = await sbAll('training_programs', {order:{col:'start_date', asc:false}});
  const myEnroll = state.me ? await sbAll('training_enrollments', {eq:{employee_id: state.me.id}}) : [];
  c.innerHTML = `${isHR()?`<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openProgramForm()">+ Buat Program</button></div>`:''}
    <div class="grid grid-2">${programs.map(p=>{
      const mine = myEnroll.find(x=>x.program_id===p.id);
      return `<div class="card">
        <b>${escapeHtml(p.name)}</b>
        <div style="font-size:12.5px;color:var(--text-muted);margin:4px 0;">${escapeHtml(p.provider||'-')} • ${fmtDate(p.start_date)} - ${fmtDate(p.end_date)}</div>
        <p style="font-size:13px;color:var(--text-muted);">${escapeHtml(p.description||'')}</p>
        ${isHR() ? `<button class="btn btn-outline btn-sm" onclick="viewEnrollments('${p.id}','${escapeHtml(p.name)}')">Lihat Peserta</button>` :
          (state.me ? (mine ? statusBadge(mine.status) : `<button class="btn btn-primary btn-sm" onclick="enrollTraining('${p.id}')">Ikuti Training</button>`) : '')}
      </div>`;
    }).join('') || '<div class="empty-state">Belum ada program training.</div>'}</div>
    <div id="enroll-area" style="margin-top:18px;"></div>`;
}

export function openProgramForm(){
  openModal(`<h3>Buat Program Training</h3>
    <div class="field"><label>Nama Program</label><input id="tp-name"></div>
    <div class="field"><label>Penyelenggara</label><input id="tp-provider"></div>
    <div class="field"><label>Mulai</label><input id="tp-start" type="date"></div>
    <div class="field"><label>Selesai</label><input id="tp-end" type="date"></div>
    <div class="field"><label>Deskripsi</label><textarea id="tp-desc" rows="3"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveProgram()">Simpan</button>
    </div>`);
}

export async function saveProgram(){
  const { error } = await sb.from('training_programs').insert({
    name: el('tp-name').value.trim(), provider: el('tp-provider').value.trim(),
    start_date: el('tp-start').value||null, end_date: el('tp-end').value||null,
    description: el('tp-desc').value.trim()
  });
  if(error){ showToast(error.message, true); return; }
  showToast('Program dibuat.'); closeModal(); renderTraining();
}

export async function enrollTraining(programId){
  const { error } = await sb.from('training_enrollments').insert({ program_id: programId, employee_id: state.me.id });
  if(error){ showToast(error.message, true); return; }
  showToast('Kamu terdaftar di program ini.'); renderTraining();
}

export async function viewEnrollments(programId, name){
  const [enrolls, emps] = await Promise.all([ sbAll('training_enrollments', {eq:{program_id: programId}}), sbAll('employees') ]);
  el('enroll-area').innerHTML = `<h3>Peserta — ${escapeHtml(name)}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Status</th><th></th></tr></thead>
    <tbody>${enrolls.map(en=>{ const e = emps.find(x=>x.id===en.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${statusBadge(en.status)}</td>
      <td style="text-align:right;">${en.status!=='completed'?`<button class="btn btn-outline btn-sm" onclick="markTrainingComplete('${en.id}','${programId}','${escapeHtml(name)}')">Tandai Selesai</button>`:''}</td></tr>`; }).join('') || '<tr><td colspan="3" class="empty-state">Belum ada peserta.</td></tr>'}</tbody></table></div>`;
}

export async function markTrainingComplete(id, programId, name){
  const { error } = await sb.from('training_enrollments').update({ status:'completed', completion_date: new Date().toISOString().slice(0,10) }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Peserta ditandai selesai.'); viewEnrollments(programId, name);
}
