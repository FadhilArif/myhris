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
    <div class="card" style="padding:0;overflow:auto;"><table><thead><tr><th>Nama</th><th>Default Hari/Tahun</th><th>Dampak Payroll</th><th></th></tr></thead>
    <tbody>${list.map(t=>`<tr>
      <td>${escapeHtml(t.name)}</td>
      <td>${t.default_days_per_year}</td>
      <td>
        <select onchange="setLeavePayrollTreatment('${t.id}', this.value)">
          <option value="neutral" ${(t.payroll_treatment||'neutral')==='neutral'?'selected':''}>Tidak memengaruhi payroll</option>
          <option value="paid" ${t.payroll_treatment==='paid'?'selected':''}>Dibayar</option>
          <option value="unpaid" ${t.payroll_treatment==='unpaid'?'selected':''}>Tidak dibayar</option>
        </select>
      </td>
      <td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('leave_types','${t.id}','loadLeaveTypeSettings')">Hapus</button></td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada jenis cuti.</td></tr>'}</tbody></table></div>`;
}

export async function setLeavePayrollTreatment(id, treatment){
  if(!['neutral','paid','unpaid'].includes(treatment)){
    showToast('Dampak payroll tidak valid.', true);
    return;
  }
  const { error } = await sb.from('leave_types')
    .update({ payroll_treatment: treatment })
    .eq('id', id);

  if(error){
    showToast('Gagal mengubah dampak payroll: ' + error.message, true);
    return;
  }

  showToast('Dampak payroll jenis cuti diperbarui.');
  CACHE.leaveTypes = await sbAll('leave_types');
  loadLeaveTypeSettings();
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
  const { error } = await sb.from('leave_types').insert({
    name: el('lt-name').value.trim(),
    default_days_per_year: Number(el('lt-days').value)||0,
    payroll_treatment: 'neutral'
  });
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
    <div class="field"><label>Metode Perhitungan</label><select id="pc-calc"><option value="fixed">Nominal Tetap</option><option value="percentage">Persentase Gaji Pokok</option><option value="bpjs_kesehatan">BPJS Kesehatan</option><option value="bpjs_jht">BPJS JHT</option><option value="bpjs_jp">BPJS JP</option><option value="pph21">PPh 21</option></select></div>
    <div class="field"><label>Nilai adalah Persentase?</label><select id="pc-pct"><option value="false">Tidak (nominal tetap)</option><option value="true">Ya (%)</option></select></div>
    <div class="field"><label>Nilai Default</label>
      <input id="pc-amount" type="text" oninput="formatNumberInput(this)" value="0"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePayrollComp()">Simpan</button>
    </div>`);
}

export async function savePayrollComp(){
  const { error } = await sb.from('payroll_components').insert({ name: el('pc-name').value.trim(), component_type: el('pc-type').value, calc_type: el('pc-calc').value, is_percentage: el('pc-pct').value === 'true', default_amount: Number(el('pc-amount').value.replace(/\./g, '')) || 0 });
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

  catalog.forEach(item=>{
    if(!byCategory[item.category]) byCategory[item.category] = [];
    byCategory[item.category].push(item);
  });

  const roleLabels = {
    admin:'Admin',
    hr:'HRD',
    manager:'Manager',
    employee:'Employee'
  };

  const activeOverrides = Object.keys(overrides).length;
  const grants = Object.values(overrides).filter(Boolean).length;
  const denies = Object.values(overrides).filter(v=>!v).length;

  const groups = Object.entries(byCategory).map(([category, items])=>`
    <section style="border:1px solid #E7E9E8;border-radius:12px;overflow:hidden;background:#fff;margin-bottom:12px;">
      <div style="padding:12px 14px;background:#F7F9F8;border-bottom:1px solid #E7E9E8;display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div style="font-weight:700;color:#17352D;">${escapeHtml(items[0].categoryLabel)}</div>
        <div style="font-size:11px;color:#7B8581;">${items.length} permission</div>
      </div>
      <div>
        ${items.map((item, index)=>{ 
          const override = Object.prototype.hasOwnProperty.call(overrides,item.permission)
            ? (overrides[item.permission] ? 'grant' : 'deny')
            : 'default';
          const roleDefault = roleActions.has(item.permission);
          const effectiveLabel = override==='grant'
            ? 'Custom • Diizinkan'
            : override==='deny'
              ? 'Custom • Diblokir'
              : roleDefault
                ? 'Default • Aktif'
                : 'Default • Tidak aktif';
          const effectiveBg = override==='grant'
            ? '#E8F6EE'
            : override==='deny'
              ? '#FDECEC'
              : roleDefault
                ? '#EEF7F3'
                : '#F3F4F4';
          const effectiveColor = override==='grant'
            ? '#237A4B'
            : override==='deny'
              ? '#B3402F'
              : roleDefault
                ? '#276A57'
                : '#707873';

          return `
            <div style="padding:12px 14px;display:grid;grid-template-columns:minmax(0,1fr) 190px 150px;gap:14px;align-items:center;${index<items.length-1?'border-bottom:1px solid #F0F2F1;':''}">
              <div style="min-width:0;">
                <div style="font-weight:600;font-size:13px;color:#26312E;">${escapeHtml(item.actionLabel)}</div>
                <div style="font-size:11px;color:#8A928E;margin-top:2px;overflow-wrap:anywhere;">${escapeHtml(item.permission)}</div>
              </div>
              <select class="permission-override" data-permission="${escapeHtml(item.permission)}"
                style="width:100%;padding:9px 10px;border:1px solid #D9DEDC;border-radius:8px;background:#fff;color:#24302C;">
                <option value="default" ${override==='default'?'selected':''}>Gunakan Default</option>
                <option value="grant" ${override==='grant'?'selected':''}>Izinkan</option>
                <option value="deny" ${override==='deny'?'selected':''}>Tolak</option>
              </select>
              <div style="font-size:11px;font-weight:600;padding:7px 9px;border-radius:999px;text-align:center;background:${effectiveBg};color:${effectiveColor};white-space:nowrap;">
                ${effectiveLabel}
              </div>
            </div>`;
        }).join('')}
      </div>
    </section>`).join('');

  openModal(`
    <div class="permission-modal-shell" style="width:min(920px,calc(100vw - 28px));max-height:90vh;background:#fff;border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 55px rgba(0,0,0,.20);">
      <div style="padding:18px 22px 14px;border-bottom:1px solid #E7E9E8;background:#fff;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;">
          <div style="min-width:0;">
            <div style="font-size:19px;font-weight:750;color:#17352D;">Hak Akses Per Akun</div>
            <div style="margin-top:4px;font-size:13px;color:#66706C;overflow-wrap:anywhere;">
              ${escapeHtml(profile.full_name||'Akun')}
            </div>
          </div>
          <div style="padding:7px 11px;border-radius:999px;background:#EEF7F3;color:#276A57;font-size:12px;font-weight:700;white-space:nowrap;">
            Role standar: ${escapeHtml(roleLabels[profile.role]||profile.role||'-')}
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px;">
          <span style="padding:6px 9px;border-radius:8px;background:#F4F6F5;color:#626C68;font-size:11px;">${catalog.length} permission tersedia</span>
          <span style="padding:6px 9px;border-radius:8px;background:#F4F6F5;color:#626C68;font-size:11px;">${activeOverrides} custom aktif</span>
          <span style="padding:6px 9px;border-radius:8px;background:#E8F6EE;color:#237A4B;font-size:11px;">${grants} diizinkan</span>
          <span style="padding:6px 9px;border-radius:8px;background:#FDECEC;color:#B3402F;font-size:11px;">${denies} diblokir</span>
        </div>
      </div>

      <div style="padding:14px 16px 6px;background:#F7F9F8;">
        <div style="display:grid;grid-template-columns:minmax(0,1fr) 190px 150px;gap:14px;padding:0 14px 8px;color:#8A928E;font-size:10px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;">
          <div>Permission</div>
          <div>Override</div>
          <div>Status efektif</div>
        </div>
        <div id="permission-overrides-form" style="max-height:calc(90vh - 220px);overflow:auto;padding:0 2px 8px;">
          ${groups}
        </div>
      </div>

      <div style="padding:14px 22px;border-top:1px solid #E7E9E8;background:#fff;display:flex;justify-content:flex-end;gap:8px;">
        <button class="btn btn-outline" onclick="closeModal()">Batal</button>
        <button class="btn btn-primary" onclick="savePermissionOverrides('${profile.id}')">Simpan Perubahan</button>
      </div>
    </div>`);
  const wideModal = document.querySelector('#modal-root .modal');
  if(wideModal) wideModal.classList.add('permission-modal-wide');
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
