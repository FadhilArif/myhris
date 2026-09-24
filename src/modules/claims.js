import { sb } from '../lib/supabase.js';
import { state, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtMoney, formatNumberInput } from '../utils/format.js';

export async function renderClaims(){
  if (!isHR()) {
    el('content').innerHTML = '<div class="empty-state">Anda tidak memiliki akses ke halaman ini.</div>';
    return;
  }
  const c = el('content');
  const [claims, emps] = await Promise.all([ sbAll('reimbursement_claims', {order:{col:'submitted_at', asc:false}}), sbAll('employees') ]);
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Kategori</th><th>Jumlah</th><th>Keterangan</th><th>Status</th><th></th></tr></thead>
    <tbody>${claims.map(c=>{ const e = emps.find(x=>x.id===c.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${escapeHtml(c.category)}</td><td>${fmtMoney(c.amount)}</td><td>${escapeHtml(c.description||'-')}</td><td>${statusBadge(c.status)}</td>
      <td style="text-align:right;">${c.status==='pending'?`
        <button class="btn btn-primary btn-sm" onclick="decideClaim('${c.id}','approved')">Setujui</button>
        <button class="btn btn-danger btn-sm" onclick="decideClaim('${c.id}','rejected')">Tolak</button>`:
        c.status==='approved'?`<button class="btn btn-outline btn-sm" onclick="decideClaim('${c.id}','paid')">Tandai Dibayar</button>`:''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada klaim.</td></tr>'}</tbody></table></div>`;
}

export async function decideClaim(id, status){
  const { error } = await sb.from('reimbursement_claims').update({ status, approved_by: state.profile.employee_id||null, approved_at: new Date().toISOString() }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Status klaim diperbarui.'); renderClaims();
}

export async function renderMyClaims(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const claims = await sbAll('reimbursement_claims', {eq:{employee_id: ME.id}, order:{col:'submitted_at', asc:false}});
  c.innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openClaimForm()">+ Ajukan Klaim</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Kategori</th><th>Jumlah</th><th>Keterangan</th><th>Status</th></tr></thead>
    <tbody>${claims.map(c=>`<tr><td>${escapeHtml(c.category)}</td><td>${fmtMoney(c.amount)}</td><td>${escapeHtml(c.description||'-')}</td><td>${statusBadge(c.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada klaim.</td></tr>'}</tbody></table></div>`;
}

export function openClaimForm(){
  openModal(`<h3>Ajukan Klaim Reimbursement</h3>
    <div class="field"><label>Kategori</label><input id="rc-cat" placeholder="Transport, Medis, dll"></div>
    <div class="field"><label>Jumlah</label>
      <input id="rc-amount" type="text" oninput="formatNumberInput(this)" placeholder="0"></div>
    <div class="field"><label>Keterangan</label><textarea id="rc-desc" rows="3"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="submitClaim()">Ajukan</button>
    </div>`);
}

export async function submitClaim(){
  const { error } = await sb.from('reimbursement_claims').insert({ employee_id: state.me.id, category: el('rc-cat').value.trim(), amount: Number(el('rc-amount').value.replace(/\./g, '')) || 0, description: el('rc-desc').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Klaim terkirim.'); closeModal(); renderMyClaims();
}
