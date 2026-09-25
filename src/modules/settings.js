import { sb } from '../lib/supabase.js';
import { state, CACHE } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast } from '../utils/dom.js';
import { fmtMoney, formatNumberInput as fmtInput } from '../utils/format.js';
import { ROLE_PERMISSIONS, getPermissionCatalog } from '../config/permissions.js';

export async function renderSettings(){
  const c = el('content');
  c.innerHTML = `<div class="tab-row">
      <div class="tab active" data-tab="dept" onclick="switchSettingsTab('dept')">Departemen</div>
      <div class="tab" data-tab="pos" onclick="switchSettingsTab('pos')">Jabatan</div>
      <div class="tab" data-tab="leavetype" onclick="switchSettingsTab('leavetype')">Jenis Cuti</div>
      <div class="tab" data-tab="payrollcomp" onclick="switchSettingsTab('payrollcomp')">Komponen Payroll</div>
      <div class="tab" data-tab="users" onclick="switchSettingsTab('users')">Pengguna & Role</div>
      <div class="tab" data-tab="permissions" onclick="switchSettingsTab('permissions')">Hak Akses</div>
    </div><div id="settings-body"></div>`;
  switchSettingsTab('dept');
}

export function switchSettingsTab(tab){
  document.querySelectorAll('#content .tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  ({dept:loadDeptSettings, pos:loadPosSettings, leavetype:loadLeaveTypeSettings, payrollcomp:loadPayrollCompSettings, users:loadUserSettings, permissions:loadPermissionSettings})[tab]();
}

export async function loadDeptSettings(){
  const list = await sbAll('departments', {order:{col:'name'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="quickAdd('departments','Nama Departemen','loadDeptSettings')">+ Tambah Departemen</button></div>
    <div class="card" style="padding:0;"><table><tbody>${list.map(d=>`<tr><td>${escapeHtml(d.name)}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('departments','${d.id}','loadDeptSettings')">Hapus</button></td></tr>`).join('') || '<tr><td class="empty-state">Belum ada departemen.</td></tr>'}</tbody></table></div>`;
}

export async function loadPosSettings(){
  const [list, depts] = await Promise.all([ sbAll('positions', {order:{col:'name'}}), sbAll('departments') ]);
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openPositionForm()">+ Tambah Jabatan</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Jabatan</th><th>Departemen</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${depts.find(d=>d.id===p.department_id)?.name||'-'}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('positions','${p.id}','loadPosSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada jabatan.</td></tr>'}</tbody></table></div>`;
}

export function openPositionForm(){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  openModal(`<h3>Tambah Jabatan</h3>
    <div class="field"><label>Nama Jabatan</label><input id="p-name"></div>
    <div class="field"><label>Departemen</label><select id="p-dept">${deptOpts}</select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePosition()">Simpan</button>
    </div>`);
}

export async function savePosition(){
  const { error } = await sb.from('positions').insert({ name: el('p-name').value.trim(), department_id: el('p-dept').value||null });
  if(error){ showToast(error.message, true); return; }
  showToast('Jabatan ditambahkan.'); closeModal();
  CACHE.positions = await sbAll('positions'); loadPosSettings();
}

export async function loadLeaveTypeSettings(){
  const list = await sbAll('leave_types', {order:{col:'name'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openLeaveTypeForm()">+ Tambah Jenis Cuti</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Default Hari/Tahun</th><th></th></tr></thead>
    <tbody>${list.map(t=>`<tr><td>${escapeHtml(t.name)}</td><td>${t.default_days_per_year}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('leave_types','${t.id}','loadLeaveTypeSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada jenis cuti.</td></tr>'}</tbody></table></div>`;
}

export function openLeaveTypeForm(){
  openModal(`<h3>Tambah Jenis Cuti</h3>
    <div class="field"><label>Nama</label><input id="lt-name"></div>
    <div class="field"><label>Default Hari/Tahun</label><input id="lt-days" type="number" value="12"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveLeaveType()">Simpan</button>
    </div>`);
}

export async function saveLeaveType(){
  const { error } = await sb.from('leave_types').insert({ name: el('lt-name').value.trim(), default_days_per_year: Number(el('lt-days').value)||0 });
  if(error){ showToast(error.message, true); return; }
  showToast('Jenis cuti ditambahkan.'); closeModal();
  CACHE.leaveTypes = await sbAll('leave_types'); loadLeaveTypeSettings();
}

export async function loadPayrollCompSettings(){
  const list = await sbAll('payroll_components', {order:{col:'component_type'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openPayrollCompForm()">+ Tambah Komponen</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${p.component_type==='earning'?'Pendapatan':'Potongan'}</td><td>${p.is_percentage?p.default_amount+'%':fmtMoney(p.default_amount)}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('payroll_components','${p.id}','loadPayrollCompSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada komponen.</td></tr>'}</tbody></table></div>`;
}

export function openPayrollCompForm(){
  openModal(`<h3>Tambah Komponen Payroll</h3>
    <div class="field"><label>Nama</label><input id="pc-name"></div>
    <div class="field"><label>Tipe</label><select id="pc-type"><option value="earning">Pendapatan</option><option value="deduction">Potongan</option></select></div>
    <div class="field"><label>Nilai adalah Persentase?</label><select id="pc-pct"><option value="false">Tidak (nominal tetap)</option><option value="true">Ya (%)</option></select></div>
    <div class="field"><label>Nilai Default</label>
      <input id="pc-amount" type="text" oninput="formatNumberInput(this)" value="0"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePayrollComp()">Simpan</button>
    </div>`);
}

export async function savePayrollComp(){
  const { error } = await sb.from('payroll_components').insert({ name: el('pc-name').value.trim(), component_type: el('pc-type').value, is_percentage: el('pc-pct').value === 'true', default_amount: Number(el('pc-amount').value.replace(/\./g, '')) || 0 });
  if(error){ showToast(error.message, true); return; }
  showToast('Komponen ditambahkan.'); closeModal(); loadPayrollCompSettings();
}

export async function loadUserSettings(){
  const [profiles, emps] = await Promise.all([ sbAll('profiles'), sbAll('employees') ]);
  el('settings-body').innerHTML = `<p style="font-size:13px;color:var(--text-muted);">Tautkan akun pengguna ke data karyawan dan atur role akses.</p>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama Akun</th><th>Role</th><th>Karyawan Tertaut</th><th></th></tr></thead>
    <tbody>${profiles.map(p=>`<tr><td>${escapeHtml(p.full_name)}</td><td>${p.role}</td><td>${emps.find(e=>e.id===p.employee_id)?.full_name||'-'}</td>
      <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openUserLinkForm(${JSON.stringify(p).replace(/'/g,"&apos;")})'>Kelola</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada pengguna.</td></tr>'}</tbody></table></div>`;
}

export function openUserLinkForm(p){
  const empOpts = CACHE.employees.map(e=>`<option value="${e.id}" ${p.employee_id===e.id?'selected':''}>${escapeHtml(e.full_name)}</option>`).join('');
  openModal(`<h3>Kelola Akses — ${escapeHtml(p.full_name)}</h3>
    <div class="field"><label>Role</label><select id="u-role">
      ${['admin','hr','manager','employee'].map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${r}</option>`).join('')}
    </select></div>
    <div class="field"><label>Tautkan ke Karyawan</label><select id="u-emp"><option value="">-</option>${empOpts}</select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveUserLink('${p.id}')">Simpan</button>
    </div>`);
}

export async function saveUserLink(id){
  const { error } = await sb.from('profiles').update({ role: el('u-role').value, employee_id: el('u-emp').value || null }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Akses pengguna diperbarui.'); closeModal(); loadUserSettings();
}

export function quickAdd(table, label, reload){
  openModal(`<h3>Tambah</h3><div class="field"><label>${label}</label><input id="quick-input"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="quickSave('${table}','${reload}')">Simpan</button>
    </div>`);
}

export async function quickSave(table, reload){
  const { error } = await sb.from(table).insert({ name: el('quick-input').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Tersimpan.'); closeModal();
  CACHE.departments = await sbAll('departments');
  window[reload]();
}

export async function quickDelete(table, id, reload){
  if(!confirm('Data akan dinonaktifkan (soft delete) agar histori tetap aman. Lanjutkan?')) return;

  const softDeleteTables = [
    'departments',
    'positions',
    'leave_types',
    'payroll_components',
    'training_programs',
    'job_postings'
  ];

  if(softDeleteTables.includes(table)){
    const { data, error } = await sb.rpc('soft_delete_master', {
      p_table: table,
      p_id: id
    });

    if(error){
      showToast('Gagal menonaktifkan data: ' + error.message, true);
      return;
    }

    if(!data){
      showToast('Data tidak ditemukan atau sudah dinonaktifkan.', true);
      return;
    }

    showToast('Data dinonaktifkan. Histori tetap tersimpan.');
    window[reload]();
    return;
  }

  showToast('Penghapusan untuk tabel ini dinonaktifkan demi keamanan.', true);
}


export async function loadPermissionSettings(){
  const [profiles, emps] = await Promise.all([
    sbAll('profiles', {order:{col:'full_name'}}),
    sbAll('employees', {order:{col:'full_name'}})
  ]);

  el('settings-body').innerHTML = `
    <div class="card">
      <h3 style="margin-top:0;">Hak Akses Per Akun</h3>
      <p style="font-size:13px;color:var(--text-muted);margin-top:0;">
        Role adalah standar bawaan. Gunakan <b>Hak Akses</b> hanya untuk custom akun tertentu.
        Admin dapat memberi izin tambahan, memblokir izin tertentu, atau mengembalikannya ke default role.
      </p>
      <div class="card" style="padding:0;overflow:auto;">
        <table>
          <thead><tr><th>Nama Akun</th><th>Role</th><th>Karyawan</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${profiles.map(p=>{
              const emp = emps.find(e=>e.id===p.employee_id);
              const isSelf = p.id === state.currentUser?.id;
              return `<tr>
                <td><b>${escapeHtml(p.full_name||'-')}</b></td>
                <td>${escapeHtml(p.role||'-')}</td>
                <td>${escapeHtml(emp?.full_name||'-')}</td>
                <td>${isSelf
                  ? '<span class="badge badge-neutral">Akun Admin Aktif</span>'
                  : '<span class="badge badge-neutral">Standar Role</span>'}</td>
                <td style="text-align:right;">
                  <button class="btn btn-outline btn-sm" ${isSelf?'disabled':''}
                    onclick='openPermissionManager(${JSON.stringify(p).replace(/'/g,"&apos;")})'>
                    Kelola Hak Akses
                  </button>
                </td>
              </tr>`;
            }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada pengguna.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>`;
}

export async function openPermissionManager(profile){
  if(!profile?.id) return;

  if(profile.id === state.currentUser?.id){
    showToast('Hak akses akun admin yang sedang dipakai tidak dapat diubah dari sini.', true);
    return;
  }

  const { data: rows, error } = await sb
    .from('permission_overrides')
    .select('permission, effect')
    .eq('user_id', profile.id);

  if(error){
    showToast('Gagal memuat custom hak akses: ' + error.message, true);
    return;
  }

  const overrides = Object.fromEntries((rows||[]).map(r=>[r.permission, !!r.effect]));
  const catalog = getPermissionCatalog();
  const roleActions = new Set((ROLE_PERMISSIONS?.[profile.role]?.actions)||[]);
  const byCategory = {};

  catalog.forEach(item => {
    if(!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  const roleLabels = {admin:'Admin',hr:'HRD',manager:'Manager',employee:'Employee'};

  const groups = Object.entries(byCategory).map(([category, items]) => `
    <div style="border:1px solid var(--border);border-radius:10px;margin-bottom:10px;overflow:hidden;">
      <div style="background:var(--surface-2);padding:10px 12px;font-weight:700;">${escapeHtml(items[0].categoryLabel)}</div>
      <div style="padding:8px 12px;">
        ${items.map(item=>{
          const override = Object.prototype.hasOwnProperty.call(overrides,item.permission)
            ? (overrides[item.permission] ? 'grant' : 'deny')
            : 'default';
          const roleDefault = roleActions.has(item.permission);
          const hint = override==='default'
            ? (roleDefault ? 'Bawaan role: aktif' : 'Bawaan role: tidak aktif')
            : (override==='grant' ? 'Custom: diizinkan' : 'Custom: diblokir');
          return `
            <div style="display:grid;grid-template-columns:minmax(180px,1fr) 150px minmax(150px,1fr);gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft);">
              <div><b>${escapeHtml(item.actionLabel)}</b><div style="font-size:11px;color:var(--text-muted);">${escapeHtml(item.permission)}</div></div>
              <select class="permission-override" data-permission="${escapeHtml(item.permission)}" style="width:100%;">
                <option value="default" ${override==='default'?'selected':''}>Gunakan Default</option>
                <option value="grant" ${override==='grant'?'selected':''}>Izinkan</option>
                <option value="deny" ${override==='deny'?'selected':''}>Tolak</option>
              </select>
              <div style="font-size:12px;color:var(--text-muted);">${hint}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`).join('');

  openModal(`
    <h3>Hak Akses — ${escapeHtml(profile.full_name||'Akun')}</h3>
    <div style="font-size:12.5px;color:var(--text-muted);margin-bottom:12px;">
      Role standar: <b>${escapeHtml(roleLabels[profile.role]||profile.role||'-')}</b>.
      Perubahan di sini hanya menjadi override untuk akun ini.
    </div>
    <div id="permission-overrides-form" style="max-height:60vh;overflow:auto;padding-right:4px;">
      ${groups}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:14px;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePermissionOverrides('${profile.id}')">Simpan Perubahan</button>
    </div>`);
}

export async function savePermissionOverrides(userId){
  if(!userId || userId === state.currentUser?.id){
    showToast('Akun admin aktif tidak dapat diubah dari sini.', true);
    return;
  }

  const overrides = {};
  document.querySelectorAll('#permission-overrides-form .permission-override').forEach(select=>{
    if(select.value === 'grant') overrides[select.dataset.permission] = true;
    if(select.value === 'deny') overrides[select.dataset.permission] = false;
  });

  const { error } = await sb.rpc('save_permission_overrides', {
    p_user_id: userId,
    p_overrides: overrides
  });

  if(error){
    showToast('Gagal menyimpan hak akses: ' + error.message, true);
    return;
  }

  showToast('Custom hak akses tersimpan.');
  closeModal();
  loadPermissionSettings();
}
