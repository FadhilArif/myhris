import { sb } from '../lib/supabase.js';
import { CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, badge } from '../utils/dom.js';

export async function renderShifts(){
  const c = el('content');
  const [shifts, emps] = await Promise.all([
    sbAll('work_shifts', {order:{col:'start_time'}}),
    sbAll('employees', {select:'*, departments(name)', eq:{employment_status:'active'}, order:{col:'full_name'}})
  ]);
  c.innerHTML = `
    <div class="toolbar"><span style="font-size:13px;color:var(--text-muted);">${shifts.length} shift aktif</span>
      ${isHR()?`<button class="btn btn-primary" onclick="openShiftForm()">+ Tambah Shift</button>`:''}</div>
    <div class="grid grid-2" style="margin-bottom:20px;">
      ${shifts.map(s=>`
        <div class="card"><div style="display:flex;justify-content:space-between;align-items:start;">
          <div><div style="font-weight:700;font-size:15px;">${escapeHtml(s.name)}</div>
            <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;">🕐 ${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)} • Toleransi ${s.late_tolerance_min} menit</div></div>
          <span class="badge badge-${s.is_active?'success':'neutral'}">${s.is_active?'Aktif':'Nonaktif'}</span></div>
          <div style="margin-top:12px;display:flex;gap:6px;">${isHR()?`
            <button class="btn btn-outline btn-sm" onclick='openShiftForm(${JSON.stringify(s).replace(/'/g,"&apos;")})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick="deleteShift('${s.id}')">Hapus</button>`:''}</div></div>`).join('') || '<div class="empty-state">Belum ada shift.</div>'}
    </div>
    <h3>Penugasan Shift Karyawan</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Departemen</th><th>Shift</th><th></th></tr></thead>
    <tbody>${emps.map(e=>{
      const s = shifts.find(x=>x.id===e.shift_id);
      return `<tr><td><b>${escapeHtml(e.full_name)}</b><br><span style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(e.employee_code||'')}</span></td><td>${escapeHtml(e.departments?.name||'-')}</td>
        <td>${s?`<span class="badge badge-success">${escapeHtml(s.name)}</span>`:'<span class="badge badge-neutral">Belum diset</span>'}</td>
        <td style="text-align:right;">${isHR()?`<button class="btn btn-outline btn-sm" onclick="openAssignShiftForm('${e.id}','${e.full_name}','${e.shift_id||''}')">Ganti</button>`:''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

export function openShiftForm(s){
  openModal(`<h3>${s?'Edit':'Tambah'} Shift</h3>
    <div class="field"><label>Nama Shift</label><input id="sf-name" value="${s?escapeHtml(s.name):''}"></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Jam Mulai</label><input id="sf-start" type="time" value="${s?s.start_time.slice(0,5):'09:00'}"></div>
      <div class="field"><label>Jam Selesai</label><input id="sf-end" type="time" value="${s?s.end_time.slice(0,5):'17:00'}"></div>
    </div>
    <div class="field"><label>Toleransi (menit)</label><input id="sf-tol" type="number" value="${s?s.late_tolerance_min:15}"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveShift('${s?s.id:''}')">Simpan</button>
    </div>`);
}

export async function saveShift(id){
  const payload = { name: el('sf-name').value.trim(), start_time: el('sf-start').value+':00', end_time: el('sf-end').value+':00', late_tolerance_min: Number(el('sf-tol').value)||15 };
  if(!payload.name){ showToast('Nama wajib diisi.', true); return; }
  const { error } = id ? await sb.from('work_shifts').update(payload).eq('id', id) : await sb.from('work_shifts').insert(payload);
  if(error){ showToast(error.message, true); return; }
  showToast('Shift disimpan.'); closeModal(); renderShifts();
}

export async function deleteShift(id){
  if(!confirm('Hapus shift ini?')) return;
  await sb.from('employees').update({ shift_id: null }).eq('shift_id', id);
  const { error } = await sb.from('work_shifts').delete().eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Shift dihapus.'); renderShifts();
}

export function openAssignShiftForm(empId, empName, currentShiftId){
  const shifts = CACHE.shiftList || [];
  openModal(`<h3>Ganti Shift — ${escapeHtml(empName)}</h3>
    <div class="field"><label>Pilih Shift</label><select id="as-shift">
      <option value="">- Tanpa Shift -</option>
      ${shifts.map(s=>`<option value="${s.id}" ${currentShiftId===s.id?'selected':''}>${escapeHtml(s.name)} (${s.start_time.slice(0,5)}-${s.end_time.slice(0,5)})</option>`).join('')}
    </select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveAssignShift('${empId}')">Simpan</button>
    </div>`);
}

export async function saveAssignShift(empId){
  const shiftId = el('as-shift').value || null;
  const { error } = await sb.from('employees').update({ shift_id: shiftId }).eq('id', empId);
  if(error){ showToast(error.message, true); return; }
  showToast('Shift diperbarui.'); closeModal(); renderShifts();
}
