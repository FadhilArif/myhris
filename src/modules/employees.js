import { sb } from '../lib/supabase.js';
import { state, CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtDate, formatNumberInput } from '../utils/format.js';

export async function renderEmployees(){
  CACHE.employees = await sbAll('employees', {select:'*, departments(name), positions(name)', order:{col:'full_name'}});
  const c = el('content');
  const deptOpts = CACHE.departments.map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  c.innerHTML = `
    <div class="toolbar" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px;">
      <div style="display:flex;gap:10px;flex-wrap:wrap;flex:1;">
        <input class="search-input" id="emp-search" placeholder="Cari nama atau kode karyawan..." oninput="applyEmployeeFilters()" style="max-width:260px;padding:9px 11px;border:1px solid var(--border);border-radius:7px;">
        <select id="emp-filter-dept" onchange="updateFilterPositionDropdown(this.value);applyEmployeeFilters();" style="max-width:160px;padding:9px 11px;border:1px solid var(--border);border-radius:7px;">
          <option value="">Semua Unit</option>${deptOpts}
        </select>
        <select id="emp-filter-pos" onchange="applyEmployeeFilters()" style="max-width:160px;padding:9px 11px;border:1px solid var(--border);border-radius:7px;">
          <option value="">Semua Jabatan</option>
        </select>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" onclick="openImportCSVModal()">📄 Import CSV</button>
        <button class="btn btn-primary" onclick="openEmployeeForm()">+ Tambah Karyawan</button>
      </div>
    </div>
    <div class="card" style="padding:0;">
      <table><thead><tr><th>Kode</th><th>Nama</th><th>Departemen</th><th>Jabatan</th><th>Bergabung</th><th>Status</th><th></th></tr></thead>
        <tbody id="employee-table-body"></tbody></table>
    </div>`;
  applyEmployeeFilters();
}

export function updateFilterPositionDropdown(departmentId){
  const posFilter = document.getElementById('emp-filter-pos');
  if(!posFilter) return;
  if(!departmentId){ posFilter.innerHTML = '<option value="">Semua Jabatan</option>'; return; }
  const filtered = CACHE.positions.filter(p => p.department_id === departmentId);
  posFilter.innerHTML = '<option value="">Semua Jabatan</option>' + filtered.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

export function applyEmployeeFilters(){
  const searchInput = document.getElementById('emp-search');
  const deptFilter = document.getElementById('emp-filter-dept');
  const posFilter = document.getElementById('emp-filter-pos');
  const tbody = document.getElementById('employee-table-body');
  if(!searchInput || !tbody) return;
  const query = searchInput.value.toLowerCase();
  const deptId = deptFilter.value, posId = posFilter.value;
  const filtered = CACHE.employees.filter(e => {
    const matchQuery = !query || e.full_name.toLowerCase().includes(query) || (e.employee_code||'').toLowerCase().includes(query);
    const matchDept = !deptId || e.department_id === deptId;
    const matchPos = !posId || e.position_id === posId;
    return matchQuery && matchDept && matchPos;
  });
  if(!filtered.length){ tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Tidak ada data.</td></tr>`; return; }
  tbody.innerHTML = filtered.map(e => `
    <tr><td>${escapeHtml(e.employee_code)}</td>
      <td><div style="display:flex;align-items:center;">
        <div class="emp-avatar-sm">${e.photo_url ? `<img src="${escapeHtml(e.photo_url)}">` : (e.full_name[0]||'?').toUpperCase()}</div>
        <a href="javascript:void(0)" onclick="navigate('employee-detail/${e.id}')" style="color:var(--accent-dark);font-weight:600;text-decoration:none;">${escapeHtml(e.full_name)}</a>
      </div></td>
      <td>${escapeHtml(e.departments?.name||'-')}</td>
      <td>${escapeHtml(e.positions?.name||'-')}</td>
      <td>${fmtDate(e.join_date)}</td>
      <td>${statusBadge(e.employment_status)}</td>
      <td style="text-align:right;">
        <button class="btn btn-outline btn-sm" onclick="navigate('employee-detail/${e.id}')">Detail</button>
        <button class="btn btn-outline btn-sm" onclick='openEmployeeForm(${JSON.stringify(e).replace(/'/g,"&apos;")})'>Edit</button>
      </td>
    </tr>`).join('');
}

export async function uploadEmployeePhoto(file, employeeCode){
  if(!file) return null;
  if(file.size > 5 * 1024 * 1024){ showToast('Foto maksimal 5 MB.', true); return null; }
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)){ showToast('Format: JPG/PNG/WEBP/GIF.', true); return null; }
  const ext = file.name.split('.').pop().toLowerCase();
  const safeCode = (employeeCode||'emp').replace(/[^a-zA-Z0-9-]/g,'_');
  const fileName = `${safeCode}_${Date.now()}.${ext}`;
  const { error } = await sb.storage.from('employee-photos').upload(fileName, file, { cacheControl:'3600', upsert:false });
  if(error){ showToast('Gagal upload: ' + error.message, true); return null; }
  const { data: urlData } = sb.storage.from('employee-photos').getPublicUrl(fileName);
  return urlData?.publicUrl || null;
}

export function openEmployeeForm(emp){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}" ${emp&&emp.department_id===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('');
  let initialPosOpts = '<option value="">- Pilih Departemen Dahulu -</option>';
  if(emp && emp.department_id){
    initialPosOpts = CACHE.positions.filter(p => p.department_id === emp.department_id).map(p => `<option value="${p.id}" ${emp.position_id===p.id?'selected':''}>${escapeHtml(p.name)}</option>`).join('');
  }
  const photoUrl = emp?.photo_url || '';
  const photoPreview = photoUrl ? `<img id="photo-preview" src="${escapeHtml(photoUrl)}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">` : `<div id="photo-placeholder" style="width:80px;height:80px;border-radius:50%;background:#EFEDE3;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:11px;">Belum ada</div>`;

  openModal(`
    <h3>${emp?'Edit':'Tambah'} Karyawan</h3>
    <div class="field" style="text-align:center;"><label style="display:block;margin-bottom:8px;">Foto Profil</label>
      <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
        ${photoPreview}
        <input type="file" id="f-photo" accept="image/*" onchange="previewPhoto(this,'photo-preview')" style="display:none;">
        <button type="button" class="btn btn-outline btn-sm" onclick="document.getElementById('f-photo').click()">📷 Pilih Foto</button>
        <input type="hidden" id="f-photo-url" value="${escapeHtml(photoUrl)}">
        <small style="color:var(--text-muted);font-size:11px;">JPG/PNG/WEBP/GIF, maks 5 MB</small>
      </div>
    </div>
    <div class="field"><label>Kode Karyawan</label><input id="f-code" value="${emp?escapeHtml(emp.employee_code):''}"></div>
    <div class="field"><label>Nama Lengkap</label><input id="f-name" value="${emp?escapeHtml(emp.full_name):''}"></div>
    <div class="field"><label>Email</label><input id="f-email" type="email" value="${emp?escapeHtml(emp.email||''):''}"></div>
    <div class="field"><label>Telepon</label><input id="f-phone" value="${emp?escapeHtml(emp.phone||''):''}"></div>
    <div class="field"><label>Departemen</label>
      <select id="f-dept" onchange="updatePositionDropdown(this.value)">
        <option value="">- Pilih Departemen -</option>${deptOpts}
      </select>
    </div>
    <div class="field"><label>Jabatan</label><select id="f-pos">${initialPosOpts}</select></div>
    <div class="field"><label>Tanggal Bergabung</label><input id="f-join" type="date" value="${emp?emp.join_date:''}"></div>
    <div class="field"><label>Gaji Pokok</label><input id="f-salary" type="text" oninput="formatNumberInput(this)" value="${emp ? parseInt(emp.basic_salary).toLocaleString('id-ID') : '0'}"></div>
    <div class="field"><label>Status PTKP</label>
      <select id="f-ptkp">${['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'].map(p=>`<option value="${p}" ${emp&&emp.ptkp_status===p?'selected':(p==='TK/0'&&!emp?'selected':'')}>${p}</option>`).join('')}</select>
    </div>
    <div class="field"><label>Status</label>
      <select id="f-status">${['active','probation','resigned','terminated'].map(s=>`<option value="${s}" ${emp&&emp.employment_status===s?'selected':''}>${s}</option>`).join('')}</select>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" id="btn-save-emp" onclick="saveEmployee('${emp?emp.id:''}')">Simpan</button>
    </div>`);
}

export async function saveEmployee(id){
  const btn = document.getElementById('btn-save-emp');
  if(btn){ btn.disabled = true; btn.textContent = 'Menyimpan…'; }
  try {
    const employeeCode = el('f-code').value.trim();
    const fullName = el('f-name').value.trim();
    if(!employeeCode || !fullName){ showToast('Kode dan nama wajib diisi.', true); if(btn){ btn.disabled=false; btn.textContent='Simpan'; } return; }
    let photoUrl = el('f-photo-url').value || null;
    const photoInput = el('f-photo');
    if(photoInput?.files?.length > 0){
      const uploaded = await uploadEmployeePhoto(photoInput.files[0], employeeCode);
      if(!uploaded){ if(btn){ btn.disabled=false; btn.textContent='Simpan'; } return; }
      photoUrl = uploaded;
    }
    const payload = {
      employee_code: employeeCode, full_name: fullName,
      email: el('f-email').value.trim() || null, phone: el('f-phone').value.trim() || null,
      department_id: el('f-dept').value || null, position_id: el('f-pos').value || null,
      join_date: el('f-join').value || new Date().toISOString().slice(0,10),
      basic_salary: Number(el('f-salary').value.replace(/\./g, '')) || 0,
      employment_status: el('f-status').value,
      ptkp_status: el('f-ptkp').value || 'TK/0',
      photo_url: photoUrl
    };
    const { error } = id ? await sb.from('employees').update(payload).eq('id', id) : await sb.from('employees').insert(payload);
    if(error){ showToast(error.message, true); return; }
    if(state.me && state.me.id === id){ state.me.photo_url = photoUrl; window.updateSidebarAvatar(); }
    showToast('Data karyawan disimpan.'); closeModal(); renderEmployees();
  } catch(e){ console.error(e); showToast('Terjadi kesalahan: ' + e.message, true); }
  finally { if(btn){ btn.disabled=false; btn.textContent='Simpan'; } }
}

export function updatePositionDropdown(departmentId){
  const posSelect = document.getElementById('f-pos');
  if(!departmentId){ posSelect.innerHTML = '<option value="">- Pilih Departemen Dahulu -</option>'; return; }
  const filtered = CACHE.positions.filter(p => p.department_id === departmentId);
  posSelect.innerHTML = filtered.length === 0
    ? '<option value="">- Tidak ada jabatan -</option>'
    : '<option value="">- Pilih Jabatan -</option>' + filtered.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
}

// CSV import — samakan dengan app.js lama, fungsi openImportCSVModal, downloadCSVTemplate, processCSV
export function openImportCSVModal(){
  openModal(`
    <h3>Import Data Karyawan via CSV</h3>
    <p style="font-size:13px;color:var(--text-muted);margin-bottom:15px;">Pastikan format CSV sesuai. <a href="#" onclick="downloadCSVTemplate()" style="color:var(--accent);font-weight:600;">Download Template CSV</a></p>
    <div class="field"><label>Pilih File CSV</label><input type="file" id="csv-file" accept=".csv"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="processCSV()">Proses & Simpan</button>
    </div>`);
}

export function downloadCSVTemplate(){
  const headers = "employee_code,full_name,email,phone,department_name,position_name,join_date,basic_salary,employment_status\n";
  const example = "EMP-001,Budi Santoso,budi@email.com,08123456789,IT,Software Engineer,2024-01-15,8000000,active\n";
  const csvContent = "data:text/csv;charset=utf-8," + headers + example;
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "template_import_karyawan.csv");
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
}

export async function processCSV(){
  const fileInput = document.getElementById('csv-file');
  if(!fileInput.files.length){ showToast('Pilih file CSV dulu.', true); return; }
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    const rows = e.target.result.split('\n').filter(row => row.trim() !== '');
    if(rows.length < 2){ showToast('File CSV kosong.', true); return; }
    const rawHeaders = rows[0].split(',').map(h => h.replace(/^\uFEFF/, '').trim().toLowerCase());
    const headerMap = { 'kode karyawan':'employee_code','nama lengkap':'full_name','email':'email','telepon':'phone','departemen':'department_name','jabatan':'position_name','tanggal bergabung':'join_date','gaji pokok':'basic_salary','status':'employment_status' };
    const headers = rawHeaders.map(h => headerMap[h] || h);
    const [depts, pos] = await Promise.all([ sbAll('departments'), sbAll('positions') ]);
    const payloads = [];
    let successCount = 0;
    for(let i = 1; i < rows.length; i++){
      const values = rows[i].split(',').map(v => v.trim());
      const rowData = {};
      headers.forEach((h, idx) => { rowData[h] = values[idx] || ''; });
      const deptMatch = depts.find(d => d.name.toLowerCase() === (rowData.department_name||'').toLowerCase());
      const posMatch = pos.find(p => p.name.toLowerCase() === (rowData.position_name||'').toLowerCase() && p.department_id === (deptMatch?deptMatch.id:null));
      if(!rowData.employee_code || !rowData.full_name){ continue; }
      payloads.push({
        employee_code: rowData.employee_code, full_name: rowData.full_name,
        email: rowData.email||null, phone: rowData.phone||null,
        department_id: deptMatch?deptMatch.id:null, position_id: posMatch?posMatch.id:null,
        join_date: rowData.join_date || new Date().toISOString().slice(0,10),
        basic_salary: Number((rowData.basic_salary||'0').replace(/\./g,'')) || 0,
        employment_status: rowData.employment_status || 'active'
      });
      successCount++;
    }
    if(!payloads.length){ showToast('Tidak ada data valid.', true); return; }
    const { error } = await sb.from('employees').upsert(payloads, { onConflict: 'employee_code' });
    if(error){ showToast('Gagal import: ' + error.message, true); return; }
    showToast(`Berhasil import ${successCount} karyawan!`);
    closeModal(); renderEmployees();
  };
  reader.readAsText(file);
}
