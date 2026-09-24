import { sb } from '../lib/supabase.js';
import { state, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge, badge } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

export async function renderPerformance(){
  const c = el('content');
  const cycles = await sbAll('performance_cycles', {order:{col:'start_date', asc:false}});
  c.innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openCycleForm()">+ Buat Siklus Penilaian</button></div>
    <div class="grid grid-2">${cycles.map(cy=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;"><b>${escapeHtml(cy.name)}</b>${statusBadge(cy.status)}</div>
        <div style="font-size:12.5px;color:var(--text-muted);margin:4px 0 10px;">${fmtDate(cy.start_date)} - ${fmtDate(cy.end_date)}</div>
        <button class="btn btn-outline btn-sm" onclick="viewReviews('${cy.id}','${escapeHtml(cy.name)}')">Kelola Penilaian</button>
      </div>`).join('') || '<div class="empty-state">Belum ada siklus penilaian.</div>'}</div>
    <div id="review-area" style="margin-top:18px;"></div>`;
}

export function openCycleForm(){
  openModal(`<h3>Buat Siklus Penilaian</h3>
    <div class="field"><label>Nama Siklus</label><input id="cy-name" placeholder="Contoh: Q1 2026"></div>
    <div class="field"><label>Mulai</label><input id="cy-start" type="date"></div>
    <div class="field"><label>Selesai</label><input id="cy-end" type="date"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveCycle()">Simpan</button>
    </div>`);
}

export async function saveCycle(){
  const { error } = await sb.from('performance_cycles').insert({ name: el('cy-name').value.trim(), start_date: el('cy-start').value, end_date: el('cy-end').value });
  if(error){ showToast(error.message, true); return; }
  showToast('Siklus dibuat.'); closeModal(); renderPerformance();
}

export async function viewReviews(cycleId, cycleName){
  const [emps, reviews] = await Promise.all([ sbAll('employees'), sbAll('performance_reviews', {eq:{cycle_id: cycleId}}) ]);
  el('review-area').innerHTML = `<h3>Penilaian — ${escapeHtml(cycleName)}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Skor</th><th>Kekuatan</th><th>Area Perbaikan</th><th>Status</th><th></th></tr></thead>
    <tbody>${emps.map(e=>{
      const r = reviews.find(x=>x.employee_id===e.id);
      return `<tr><td>${escapeHtml(e.full_name)}</td><td>${r?r.score:'-'}</td><td>${escapeHtml(r?.strengths||'-')}</td><td>${escapeHtml(r?.improvements||'-')}</td><td>${r?statusBadge(r.status):badge('Belum Dinilai','neutral')}</td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openReviewForm("${cycleId}","${e.id}","${escapeHtml(e.full_name)}",${JSON.stringify(r||null).replace(/'/g,"&apos;")})'>${r?'Edit':'Nilai'}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

export function openReviewForm(cycleId, employeeId, name, r){
  openModal(`<h3>Penilaian — ${escapeHtml(name)}</h3>
    <div class="field"><label>Skor (0-100)</label><input id="rv-score" type="number" value="${r?r.score:''}"></div>
    <div class="field"><label>Kekuatan</label><textarea id="rv-strengths" rows="2">${r?escapeHtml(r.strengths||''):''}</textarea></div>
    <div class="field"><label>Area Perbaikan</label><textarea id="rv-improve" rows="2">${r?escapeHtml(r.improvements||''):''}</textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveReview('${cycleId}','${employeeId}')">Simpan</button>
    </div>`);
}

export async function saveReview(cycleId, employeeId){
  const payload = { cycle_id: cycleId, employee_id: employeeId, score: Number(el('rv-score').value)||null, strengths: el('rv-strengths').value.trim(), improvements: el('rv-improve').value.trim(), status: 'submitted' };
  const { error } = await sb.from('performance_reviews').upsert(payload, { onConflict: 'cycle_id,employee_id' });
  if(error){ showToast(error.message, true); return; }
  showToast('Penilaian disimpan.'); closeModal(); renderPerformance();
}
