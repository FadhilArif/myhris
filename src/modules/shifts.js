import { sb } from '../lib/supabase.js';
import { CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, badge } from '../utils/dom.js';

let SHIFT_ASSIGNMENT_EMPLOYEES = [];
let SHIFT_ASSIGNMENT_SHIFTS = [];

function getShiftDepartments(){
  return [...new Set(
    SHIFT_ASSIGNMENT_EMPLOYEES
      .map(e => e.departments?.name)
      .filter(Boolean)
  )].sort((a,b)=>a.localeCompare(b,'id'));
}

export function renderShiftAssignmentRows(){
  const tbody = el('shift-assignment-body');
  const count = el('shift-assignment-count');
  if(!tbody) return;

  const query = String(el('shift-search')?.value || '').trim().toLowerCase();
  const department = el('shift-department')?.value || '';

  const filtered = SHIFT_ASSIGNMENT_EMPLOYEES
    .filter(e => !department || (e.departments?.name || '') === department)
    .filter(e => {
      if(!query) return true;
      const name = String(e.full_name || '').toLowerCase();
      const code = String(e.employee_code || '').toLowerCase();
      return name.includes(query) || code.includes(query);
    })
    .sort((a,b)=>{
      const da = String(a.departments?.name || 'Tanpa Divisi');
      const db = String(b.departments?.name || 'Tanpa Divisi');
      const depCmp = da.localeCompare(db,'id');
      return depCmp || String(a.full_name||'').localeCompare(String(b.full_name||''),'id');
    });

  if(count){
    count.textContent = `${filtered.length} dari ${SHIFT_ASSIGNMENT_EMPLOYEES.length} karyawan`;
  }

  if(!filtered.length){
    tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Tidak ada karyawan yang sesuai filter.</td></tr>';
    return;
  }

  let currentDepartment = null;
  const rows = [];

  filtered.forEach(e => {
    const departmentName = e.departments?.name || 'Tanpa Divisi';

    if(department !== departmentName && currentDepartment !== departmentName){
      currentDepartment = departmentName;
      rows.push(`
        <tr>
          <td colspan="4" style="background:#FAFAF6;font-weight:800;color:var(--accent-dark);padding:10px 12px;border-top:1px solid var(--border);">
            ${escapeHtml(departmentName)}
          </td>
        </tr>`);
    }

    const s = SHIFT_ASSIGNMENT_SHIFTS.find(x=>x.id===e.shift_id);

    rows.push(`
      <tr>
        <td>
          <b>${escapeHtml(e.full_name)}</b><br>
          <span style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(e.employee_code||'')}</span>
        </td>
        <td>${escapeHtml(departmentName)}</td>
        <td>${s
          ? `<span class="badge badge-success">${escapeHtml(s.name)}</span>`
          : '<span class="badge badge-neutral">Belum diset</span>'}
        </td>
        <td style="text-align:right;">
          ${isHR()
            ? `<button class="btn btn-outline btn-sm" onclick='openAssignShiftForm(${JSON.stringify(e.id)},${JSON.stringify(e.full_name)},${JSON.stringify(e.shift_id||'')})'>Ganti</button>`
            : ''}
        </td>
      </tr>`);
  });

  tbody.innerHTML = rows.join('');
}

export async function renderShifts(){
  const c = el('content');
  const [shifts, emps] = await Promise.all([
    sbAll('work_shifts', {order:{col:'start_time'}}),
    sbAll('employees', {select:'*, departments(name)', eq:{employment_status:'active'}, order:{col:'full_name'}})
  ]);

  SHIFT_ASSIGNMENT_EMPLOYEES = emps;
  SHIFT_ASSIGNMENT_SHIFTS = shifts;

  const departments = getShiftDepartments();

  c.innerHTML = `
    <div class="toolbar">
      <span style="font-size:13px;color:var(--text-muted);">${shifts.length} shift aktif</span>
      ${isHR()?'<button class="btn btn-primary" onclick="openShiftForm()">+ Tambah Shift</button>':''}
    </div>

    <div class="grid grid-2" style="margin-bottom:20px;">
      ${shifts.map(s=>`
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <div>
              <div style="font-weight:700;font-size:15px;">${escapeHtml(s.name)}</div>
              <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;">🕐 ${s.start_time.slice(0,5)} – ${s.end_time.slice(0,5)} • Toleransi ${s.late_tolerance_min} menit</div>
            </div>
            <span class="badge badge-${s.is_active?'success':'neutral'}">${s.is_active?'Aktif':'Nonaktif'}</span>
          </div>
          <div style="margin-top:12px;display:flex;gap:6px;">
            ${isHR()?`
              <button class="btn btn-outline btn-sm" onclick='openShiftForm(${JSON.stringify(s).replace(/'/g,"&apos;")})'>Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteShift('${s.id}')">Hapus</button>`:''}
          </div>
        </div>`).join('') || '<div class="empty-state">Belum ada shift.</div>'}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap;margin-bottom:10px;">
      <div>
        <h3 style="margin:0;">Penugasan Shift Karyawan</h3>
        <div id="shift-assignment-count" style="font-size:12px;color:var(--text-muted);margin-top:3px;">${emps.length} karyawan</div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;min-width:min(680px,100%);justify-content:flex-end;">
        <div class="field" style="margin:0;min-width:220px;flex:1;">
          <label style="font-size:11px;">Cari Karyawan</label>
          <input id="shift-search" type="search" placeholder="Cari nama atau kode karyawan..." oninput="renderShiftAssignmentRows()">
        </div>
        <div class="field" style="margin:0;min-width:220px;">
          <label style="font-size:11px;">Filter Divisi</label>
          <select id="shift-department" onchange="renderShiftAssignmentRows()">
            <option value="">Semua Divisi</option>
            ${departments.map(d=>`<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:auto;">
      <table>
        <thead><tr><th>Karyawan</th><th>Departemen</th><th>Shift</th><th></th></tr></thead>
        <tbody id="shift-assignment-body"></tbody>
      </table>
    </div>`;

  renderShiftAssignmentRows();
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
  const shifts = CACHE.shiftList || SHIFT_ASSIGNMENT_SHIFTS || [];
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
