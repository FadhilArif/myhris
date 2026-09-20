// =====================================================================
// STATE GLOBAL
// =====================================================================
let CURRENT_USER = null;   // auth.users row
let PROFILE = null;        // profiles row (role, employee_id)
let ME = null;             // employees row milik user login (jika ada)
let CACHE = { departments: [], positions: [], leaveTypes: [], employees: [] };

const ICONS = {
  dashboard:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  employees:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17.5" cy="8.5" r="2.5"/><path d="M22 20c0-2.6-1.8-4.8-4.2-5.6"/></svg>',
  attendance:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  leave:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  payroll:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2.5" y="5.5" width="19" height="13" rx="2"/><circle cx="12" cy="12" r="3"/></svg>',
  recruit:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M17 8l1.5 1.5L21.5 6"/></svg>',
  perf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>',
  training:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12.5V17c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5"/></svg>',
  claims:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 3h16v18l-3-2-2.5 2-2.5-2-2.5 2L7 19l-3 2Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06A2 2 0 1 1 7 4.24l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.36.22.76.22 1.18"/></svg>',
  directory:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>'
};

// =====================================================================
// HELPERS UMUM
// =====================================================================
// Fungsi untuk memformat input angka menjadi Rupiah secara real-time
function formatNumberInput(el) {
    // Hapus semua karakter selain angka
    let value = el.value.replace(/[^0-9]/g, '');
    if (value) {
        // Format dengan titik sebagai pemisah ribuan
        el.value = parseInt(value, 10).toLocaleString('id-ID');
    } else {
        el.value = '';
    }
}
function el(id){ return document.getElementById(id); }
function fmtMoney(n){ return 'Rp' + Math.round(n||0).toLocaleString('id-ID'); }
function fmtDate(d){ if(!d) return '-'; return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); }
function fmtDateTime(d){ if(!d) return '-'; return new Date(d).toLocaleString('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}); }
function showToast(msg, isError){
  const t = document.createElement('div');
  t.className = 'toast';
  if(isError) t.style.background = '#B3402F';
  t.textContent = msg;
  el('toast-root').appendChild(t);
  setTimeout(()=>t.remove(), 3200);
}
function isHR(){ return PROFILE && (PROFILE.role === 'admin' || PROFILE.role === 'hr'); }
function badge(text, kind){ return `<span class="badge badge-${kind}">${text}</span>`; }
function statusBadge(status){
  const map = {
    present:['Hadir','success'], late:['Terlambat','warning'], absent:['Absen','danger'], on_leave:['Cuti','neutral'], holiday:['Libur','neutral'],
    pending:['Menunggu','warning'], approved:['Disetujui','success'], rejected:['Ditolak','danger'], cancelled:['Dibatalkan','neutral'], paid:['Dibayar','success'],
    active:['Aktif','success'], probation:['Probation','warning'], resigned:['Resign','neutral'], terminated:['Diberhentikan','danger'],
    open:['Dibuka','success'], closed:['Ditutup','neutral'], on_hold:['Ditunda','warning'],
    applied:['Melamar','neutral'], screening:['Screening','warning'], interview:['Interview','warning'], offer:['Penawaran','warning'], hired:['Diterima','success'],
    draft:['Draft','neutral'], processed:['Diproses','warning'], submitted:['Terkirim','warning'], acknowledged:['Diakui','success'],
    enrolled:['Terdaftar','neutral'], completed:['Selesai','success']
  };
  const v = map[status] || [status,'neutral'];
  return badge(v[0], v[1]);
}
function escapeHtml(s){ return (s==null?'':String(s)).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

function openModal(html){
  el('modal-root').innerHTML = `<div class="modal-backdrop" onclick="if(event.target===this) closeModal()"><div class="modal">${html}</div></div>`;
}
function closeModal(){ el('modal-root').innerHTML = ''; }

async function sbAll(table, opts={}){
  let q = sb.from(table).select(opts.select || '*');
  if(opts.eq) for(const k in opts.eq) q = q.eq(k, opts.eq[k]);
  if(opts.order) q = q.order(opts.order.col, {ascending: opts.order.asc !== false});
  const { data, error } = await q;
  if(error){ console.error(error); showToast('Gagal memuat data: '+error.message, true); return []; }
  return data || [];
}

// =====================================================================
// AUTH
// =====================================================================
const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.3A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.1 3.8M6.5 6.6C4 8.3 2 11 2 11a13.7 13.7 0 0 0 5.1 5.1"/></svg>';
function togglePassword(inputId, iconEl){
  const input = el(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  iconEl.innerHTML = isHidden ? EYE_CLOSED : EYE_OPEN;
}
function toggleSignup(){
  const box = el('signup-extra');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}
async function doSignup(){
  const email = el('login-email').value.trim();
  const password = el('login-password').value;
  const name = el('signup-name').value.trim();
  if(!email || !password || !name){ showLoginError('Lengkapi email, kata sandi, dan nama.'); return; }
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ showLoginError(error.message); return; }
   if(data.user){
    const { error: insertError } = await sb.from('profiles').insert({ id: data.user.id, full_name: name, role: 'employee' });
    if (insertError) {
      showLoginError("Gagal membuat profil: " + insertError.message);
      return;
    }
    showToast('Akun dibuat. Silakan masuk.');
    toggleSignup();
  }
  }
}
function showLoginError(msg){
  const box = el('login-error');
  box.textContent = msg;
  box.style.display = 'block';
}
async function doLogin(){
  const email = el('login-email').value.trim();
  const password = el('login-password').value;
  if(!email || !password){ showLoginError('Isi email dan kata sandi.'); return; }
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if(error){ showLoginError(error.message); return; }
  await bootAfterLogin(data.user);
}
async function doLogout(){
  await sb.auth.signOut();
  CURRENT_USER = null; PROFILE = null; ME = null;
  el('app').style.display = 'none';
  el('login-screen').style.display = 'flex';
}
async function bootAfterLogin(user){
  CURRENT_USER = user;
  let { data: profile, error: profileError } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
  
  if(!profile){
    // Fallback: buat profile default jika belum ada
    const { data: created, error: insertError } = await sb.from('profiles')
      .insert({ id: user.id, full_name: user.email, role: 'employee' })
      .select()
      .maybeSingle();
      
    if (insertError) {
      console.error("Gagal membuat profil:", insertError);
      alert("Gagal membuat profil. Pastikan policy RLS sudah diperbaiki. Error: " + insertError.message);
      return; // Hentikan proses login jika profil benar-benar gagal dibuat
    }
    profile = created;
  }

  PROFILE = profile;
  
  // Amankan pengecekan employee_id
  if(PROFILE && PROFILE.employee_id){
    const { data: emp } = await sb.from('employees').select('*, departments(name), positions(name)').eq('id', PROFILE.employee_id).maybeSingle();
    ME = emp;
  }
  
  el('login-screen').style.display = 'none';
  el('app').style.display = 'block';
  el('user-name').textContent = PROFILE.full_name;
  el('user-role').textContent = ({admin:'Administrator', hr:'Staf HR', manager:'Manajer', employee:'Karyawan'})[PROFILE.role] || PROFILE.role;
  el('user-avatar').textContent = (PROFILE.full_name||'?').slice(0,1).toUpperCase();
  
  await preloadMaster();
  buildNav();
  
  const startRoute = location.hash.replace('#','') || 'dashboard';
  navigate(startRoute);
  el('topbar-date').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
}
async function preloadMaster(){
  CACHE.departments = await sbAll('departments', {order:{col:'name'}});
  CACHE.positions = await sbAll('positions', {order:{col:'name'}});
  CACHE.leaveTypes = await sbAll('leave_types', {order:{col:'name'}});
  if(isHR()) CACHE.employees = await sbAll('employees', {select:'*, departments(name), positions(name)', order:{col:'full_name'}});
}

window.addEventListener('load', async () => {
  const { data } = await sb.auth.getSession();
  if(data.session) await bootAfterLogin(data.session.user);
});

// =====================================================================
// NAVIGASI
// =====================================================================
const NAV_HR = [
  {group:'Utama', items:[
    {route:'dashboard', label:'Dashboard', icon:'dashboard'},
    {route:'employees', label:'Data Karyawan', icon:'employees'},
    {route:'attendance', label:'Absensi', icon:'attendance'},
    {route:'leave', label:'Cuti & Izin', icon:'leave'},
    {route:'payroll', label:'Payroll', icon:'payroll'},
  ]},
  {group:'Talenta', items:[
    {route:'recruitment', label:'Rekrutmen', icon:'recruit'},
    {route:'performance', label:'Kinerja', icon:'perf'},
    {route:'training', label:'Training', icon:'training'},
  ]},
  {group:'Lainnya', items:[
    {route:'claims', label:'Reimbursement', icon:'claims'},
    {route:'settings', label:'Pengaturan', icon:'settings'},
  ]}
];
const NAV_EMPLOYEE = [
  {group:'Utama', items:[
    {route:'dashboard', label:'Dashboard', icon:'dashboard'},
    {route:'my-attendance', label:'Absensi Saya', icon:'attendance'},
    {route:'my-leave', label:'Cuti Saya', icon:'leave'},
    {route:'my-payslip', label:'Slip Gaji', icon:'payroll'},
    {route:'my-claims', label:'Klaim Saya', icon:'claims'},
  ]},
  {group:'Perusahaan', items:[
    {route:'directory', label:'Direktori Karyawan', icon:'directory'},
    {route:'training', label:'Training', icon:'training'},
  ]}
];
function buildNav(){
  const nav = isHR() ? NAV_HR : NAV_EMPLOYEE;
  el('nav-container').innerHTML = nav.map(g => `
    <div class="nav-group">
      <div class="nav-label">${g.group}</div>
      ${g.items.map(it => `<a class="nav-item" data-route="${it.route}" onclick="navigate('${it.route}')">${ICONS[it.icon]}<span>${it.label}</span></a>`).join('')}
    </div>`).join('');
}
function navigate(route){
  location.hash = route;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === route));
  const titles = {
    dashboard:'Dashboard', employees:'Data Karyawan', attendance:'Absensi', leave:'Cuti & Izin', payroll:'Payroll',
    recruitment:'Rekrutmen', performance:'Penilaian Kinerja', training:'Training & Development', claims:'Reimbursement',
    settings:'Pengaturan', 'my-attendance':'Absensi Saya', 'my-leave':'Cuti Saya', 'my-payslip':'Slip Gaji Saya',
    'my-claims':'Klaim Saya', directory:'Direktori Karyawan'
  };
  el('page-title').textContent = titles[route] || 'Dashboard';
  const renderers = {
    dashboard: renderDashboard, employees: renderEmployees, attendance: renderAttendance, leave: renderLeave,
    payroll: renderPayroll, recruitment: renderRecruitment, performance: renderPerformance, training: renderTraining,
    claims: renderClaims, settings: renderSettings, 'my-attendance': renderMyAttendance, 'my-leave': renderMyLeave,
    'my-payslip': renderMyPayslip, 'my-claims': renderMyClaims, directory: renderDirectory
  };
  (renderers[route] || renderDashboard)();
}
window.addEventListener('hashchange', () => { if(PROFILE) navigate(location.hash.replace('#','') || 'dashboard'); });

// =====================================================================
// MODUL: DASHBOARD
// =====================================================================
async function renderDashboard(){
  const c = el('content');
  c.innerHTML = `<div class="empty-state">Memuat ringkasan…</div>`;
  if(isHR()){
    const today = new Date().toISOString().slice(0,10);
    const [emps, todayAtt, pendingLeave, pendingClaims] = await Promise.all([
      sbAll('employees'),
      sbAll('attendance', {eq:{work_date:today}}),
      sbAll('leave_requests', {eq:{status:'pending'}}),
      sbAll('reimbursement_claims', {eq:{status:'pending'}})
    ]);
    const active = emps.filter(e=>e.employment_status==='active').length;
    const presentToday = todayAtt.filter(a=>a.status==='present'||a.status==='late').length;
    const byDept = {};
    emps.forEach(e=>{ const d = CACHE.departments.find(x=>x.id===e.department_id); const name = d?d.name:'Tanpa Departemen'; byDept[name]=(byDept[name]||0)+1; });
    const maxDept = Math.max(1, ...Object.values(byDept));
    c.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-num">${active}</div><div class="stat-label">Karyawan Aktif</div></div>
        <div class="stat-card"><div class="stat-num">${presentToday}/${active}</div><div class="stat-label">Hadir Hari Ini</div></div>
        <div class="stat-card"><div class="stat-num">${pendingLeave.length}</div><div class="stat-label">Cuti Menunggu Approval</div></div>
        <div class="stat-card"><div class="stat-num">${pendingClaims.length}</div><div class="stat-label">Klaim Menunggu Approval</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card">
          <h3 style="margin-top:0;">Karyawan per Departemen</h3>
          ${Object.entries(byDept).map(([name,n])=>`
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
              <div style="width:110px;font-size:12.5px;color:var(--text-muted);">${escapeHtml(name)}</div>
              <div style="flex:1;background:#EFEDE3;border-radius:5px;height:9px;overflow:hidden;"><div style="width:${(n/maxDept)*100}%;background:var(--accent);height:100%;"></div></div>
              <div style="width:24px;text-align:right;font-size:12.5px;font-weight:600;">${n}</div>
            </div>`).join('') || '<p class="empty-state">Belum ada data.</p>'}
        </div>
        <div class="card">
          <h3 style="margin-top:0;">Pengajuan Cuti Menunggu</h3>
          ${pendingLeave.length ? pendingLeave.slice(0,6).map(l=>{
            const emp = emps.find(e=>e.id===l.employee_id);
            return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
              <span>${escapeHtml(emp?emp.full_name:'-')}</span><span style="color:var(--text-muted);">${fmtDate(l.start_date)} - ${fmtDate(l.end_date)}</span>
            </div>`;
          }).join('') : '<p class="empty-state">Tidak ada pengajuan menunggu.</p>'}
        </div>
      </div>`;
  } else {
    const [myLeaveReqs, myClaims] = await Promise.all([
      ME ? sbAll('leave_requests', {eq:{employee_id: ME.id}}) : [],
      ME ? sbAll('reimbursement_claims', {eq:{employee_id: ME.id}}) : []
    ]);
    c.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-num">${ME?ME.full_name.split(' ')[0]:'-'}</div><div class="stat-label">Selamat bekerja!</div></div>
        <div class="stat-card"><div class="stat-num">${myLeaveReqs.filter(l=>l.status==='pending').length}</div><div class="stat-label">Cuti Menunggu</div></div>
        <div class="stat-card"><div class="stat-num">${myClaims.filter(c=>c.status==='pending').length}</div><div class="stat-label">Klaim Menunggu</div></div>
        <div class="stat-card"><div class="stat-num">${ME?fmtDate(ME.join_date):'-'}</div><div class="stat-label">Tanggal Bergabung</div></div>
      </div>
      ${!ME ? '<div class="card">Akun kamu belum ditautkan ke data karyawan. Hubungi HR untuk penautan akun.</div>' : `
      <div class="card">
        <h3 style="margin-top:0;">Ringkasan Kamu</h3>
        <table><tbody>
          <tr><td style="color:var(--text-muted);width:160px;">Departemen</td><td>${ME.departments?.name||'-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Jabatan</td><td>${ME.positions?.name||'-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Status</td><td>${statusBadge(ME.employment_status)}</td></tr>
        </tbody></table>
      </div>`}`;
  }
}

// =====================================================================
// MODUL: DATA KARYAWAN
// =====================================================================
async function renderEmployees(){
  CACHE.employees = await sbAll('employees', {select:'*, departments(name), positions(name)', order:{col:'full_name'}});
  paintEmployees(CACHE.employees);
}
function paintEmployees(list, query){
  const c = el('content');
  const filtered = query ? list.filter(e => e.full_name.toLowerCase().includes(query.toLowerCase()) || (e.employee_code||'').toLowerCase().includes(query.toLowerCase())) : list;
  c.innerHTML = `
    <div class="toolbar">
      <input class="search-input" placeholder="Cari nama atau kode karyawan..." oninput="paintEmployees(CACHE.employees, this.value)" value="${escapeHtml(query||'')}">
      <button class="btn btn-primary" onclick="openEmployeeForm()">+ Tambah Karyawan</button>
    </div>
    <div class="card" style="padding:0;">
      <table>
        <thead><tr><th>Kode</th><th>Nama</th><th>Departemen</th><th>Jabatan</th><th>Bergabung</th><th>Status</th><th></th></tr></thead>
        <tbody>
          ${filtered.map(e => `<tr>
            <td>${escapeHtml(e.employee_code)}</td>
            <td>${escapeHtml(e.full_name)}</td>
            <td>${escapeHtml(e.departments?.name||'-')}</td>
            <td>${escapeHtml(e.positions?.name||'-')}</td>
            <td>${fmtDate(e.join_date)}</td>
            <td>${statusBadge(e.employment_status)}</td>
            <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openEmployeeForm(${JSON.stringify(e).replace(/'/g,"&apos;")})'>Edit</button></td>
          </tr>`).join('') || `<tr><td colspan="7" class="empty-state">Belum ada data karyawan.</td></tr>`}
        </tbody>
      </table>
    </div>`;
}
function openEmployeeForm(emp){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}" ${emp&&emp.department_id===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('');
  
  // Logika baru: Jika sedang edit, filter jabatan sesuai departemennya. Jika tambah baru, kosongkan dulu.
  let initialPosOpts = '<option value="">- Pilih Departemen Dahulu -</option>';
  if (emp && emp.department_id) {
      initialPosOpts = CACHE.positions
          .filter(p => p.department_id === emp.department_id)
          .map(p => `<option value="${p.id}" ${emp.position_id===p.id?'selected':''}>${escapeHtml(p.name)}</option>`)
          .join('');
  }

  openModal(`
    <h3>${emp?'Edit':'Tambah'} Karyawan</h3>
    <div class="field"><label>Kode Karyawan</label><input id="f-code" value="${emp?escapeHtml(emp.employee_code):''}"></div>
    <div class="field"><label>Nama Lengkap</label><input id="f-name" value="${emp?escapeHtml(emp.full_name):''}"></div>
    <div class="field"><label>Email</label><input id="f-email" type="email" value="${emp?escapeHtml(emp.email||''):''}"></div>
    <div class="field"><label>Telepon</label><input id="f-phone" value="${emp?escapeHtml(emp.phone||''):''}"></div>
    
    <div class="field"><label>Departemen</label>
      <select id="f-dept" onchange="updatePositionDropdown(this.value)">
        <option value="">- Pilih Departemen -</option>
        ${deptOpts}
      </select>
    </div>
    
    <div class="field"><label>Jabatan</label>
      <select id="f-pos">
        ${initialPosOpts}
      </select>
    </div>
    
    <div class="field"><label>Tanggal Bergabung</label><input id="f-join" type="date" value="${emp?emp.join_date:''}"></div>
  <div class="field"><label>Gaji Pokok</label>
  <input id="f-salary" type="text" oninput="formatNumberInput(this)" value="${emp ? parseInt(emp.basic_salary).toLocaleString('id-ID') : '0'}">
</div>
    <div class="field"><label>Status</label><select id="f-status">
      ${['active','probation','resigned','terminated'].map(s=>`<option value="${s}" ${emp&&emp.employment_status===s?'selected':''}>${s}</option>`).join('')}
    </select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveEmployee('${emp?emp.id:''}')">Simpan</button>
    </div>`);
}
function updatePositionDropdown(departmentId) {
    const posSelect = document.getElementById('f-pos');
    
    // Jika departemen kosong, kosongkan dropdown jabatan
    if (!departmentId) {
        posSelect.innerHTML = '<option value="">- Pilih Departemen Dahulu -</option>';
        return;
    }
    
    // Filter jabatan berdasarkan department_id yang dipilih
    const filteredPositions = CACHE.positions.filter(p => p.department_id === departmentId);
    
    if (filteredPositions.length === 0) {
        posSelect.innerHTML = '<option value="">- Tidak ada jabatan di unit ini -</option>';
    } else {
        posSelect.innerHTML = '<option value="">- Pilih Jabatan -</option>' + 
            filteredPositions.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    }
}
async function saveEmployee(id){
  const payload = {
    employee_code: el('f-code').value.trim(), full_name: el('f-name').value.trim(),
    email: el('f-email').value.trim() || null, phone: el('f-phone').value.trim() || null,
    department_id: el('f-dept').value || null, position_id: el('f-pos').value || null,
    join_date: el('f-join').value || new Date().toISOString().slice(0,10),
    basic_salary: Number(el('f-salary').value.replace(/\./g, '')) || 0
  };
  if(!payload.employee_code || !payload.full_name){ showToast('Kode dan nama wajib diisi.', true); return; }
  const { error } = id ? await sb.from('employees').update(payload).eq('id', id) : await sb.from('employees').insert(payload);
  if(error){ showToast(error.message, true); return; }
  showToast('Data karyawan disimpan.'); closeModal(); renderEmployees();
}

// =====================================================================
// MODUL: ABSENSI (VIEW HR)
// =====================================================================
async function renderAttendance(){
  const c = el('content');
  const today = new Date().toISOString().slice(0,10);
  c.innerHTML = `<div class="toolbar">
      <input type="date" id="att-date" value="${today}" style="max-width:180px;" onchange="loadAttendanceForDate()">
      <span></span>
    </div><div id="att-table"></div>`;
  loadAttendanceForDate();
}
async function loadAttendanceForDate(){
  const date = el('att-date').value;
  const [emps, att] = await Promise.all([ sbAll('employees'), sbAll('attendance', {eq:{work_date:date}}) ]);
  const rows = emps.map(e => {
    const a = att.find(x=>x.employee_id===e.id);
    return `<tr>
      <td>${escapeHtml(e.full_name)}</td>
      <td>${a && a.check_in ? fmtDateTime(a.check_in) : '-'}</td>
      <td>${a && a.check_out ? fmtDateTime(a.check_out) : '-'}</td>
      <td>${a ? statusBadge(a.status) : badge('Belum Absen','neutral')}</td>
    </tr>`;
  }).join('');
  el('att-table').innerHTML = `<div class="card" style="padding:0;">
    <table><thead><tr><th>Karyawan</th><th>Jam Masuk</th><th>Jam Keluar</th><th>Status</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="4" class="empty-state">Belum ada data.</td></tr>'}</tbody></table></div>`;
}

// ---- Absensi milik sendiri (employee) ----
async function renderMyAttendance(){
  const c = el('content');
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan ke data karyawan.</div>'; return; }
  const today = new Date().toISOString().slice(0,10);
  const todays = await sbAll('attendance', {eq:{employee_id: ME.id, work_date: today}});
  const mine = todays[0];
  const history = await sbAll('attendance', {eq:{employee_id: ME.id}, order:{col:'work_date', asc:false}});
  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:700;font-size:15px;">${fmtDate(today)}</div>
        <div style="font-size:12.5px;color:var(--text-muted);">Masuk: ${mine&&mine.check_in?fmtDateTime(mine.check_in):'-'} &nbsp;•&nbsp; Keluar: ${mine&&mine.check_out?fmtDateTime(mine.check_out):'-'}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" ${mine&&mine.check_in?'disabled':''} onclick="checkIn()">Check In</button>
        <button class="btn btn-outline" ${(!mine||!mine.check_in||mine.check_out)?'disabled':''} onclick="checkOut()">Check Out</button>
      </div>
    </div>
    <div class="card" style="padding:0;">
      <table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Status</th></tr></thead>
        <tbody>${history.map(h=>`<tr><td>${fmtDate(h.work_date)}</td><td>${h.check_in?fmtDateTime(h.check_in):'-'}</td><td>${h.check_out?fmtDateTime(h.check_out):'-'}</td><td>${statusBadge(h.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada riwayat.</td></tr>'}</tbody></table>
    </div>`;
}
async function checkIn(){
  const today = new Date().toISOString().slice(0,10);
  const nowHour = new Date().getHours();
  const status = nowHour >= 9 ? 'late' : 'present';
  const { error } = await sb.from('attendance').insert({ employee_id: ME.id, work_date: today, check_in: new Date().toISOString(), status });
  if(error){ showToast(error.message, true); return; }
  showToast('Check-in berhasil.'); renderMyAttendance();
}
async function checkOut(){
  const today = new Date().toISOString().slice(0,10);
  const { error } = await sb.from('attendance').update({ check_out: new Date().toISOString() }).eq('employee_id', ME.id).eq('work_date', today);
  if(error){ showToast(error.message, true); return; }
  showToast('Check-out berhasil.'); renderMyAttendance();
}

// =====================================================================
// MODUL: CUTI & IZIN (HR VIEW)
// =====================================================================
async function renderLeave(){
  const c = el('content');
  c.innerHTML = `<div class="tab-row">
      <div class="tab active" data-tab="requests" onclick="switchLeaveTab('requests')">Pengajuan</div>
      <div class="tab" data-tab="balances" onclick="switchLeaveTab('balances')">Saldo Cuti</div>
    </div><div id="leave-body"></div>`;
  switchLeaveTab('requests');
}
function switchLeaveTab(tab){
  document.querySelectorAll('#content .tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  tab === 'requests' ? loadLeaveRequests() : loadLeaveBalances();
}
async function loadLeaveRequests(){
  const [reqs, emps, types] = await Promise.all([
    sbAll('leave_requests', {order:{col:'created_at', asc:false}}), sbAll('employees'), sbAll('leave_types')
  ]);
  el('leave-body').innerHTML = `<div class="card" style="padding:0;">
    <table><thead><tr><th>Karyawan</th><th>Jenis Cuti</th><th>Tanggal</th><th>Hari</th><th>Alasan</th><th>Status</th><th></th></tr></thead>
    <tbody>${reqs.map(r=>{
      const emp = emps.find(e=>e.id===r.employee_id); const type = types.find(t=>t.id===r.leave_type_id);
      return `<tr>
        <td>${escapeHtml(emp?emp.full_name:'-')}</td><td>${escapeHtml(type?type.name:'-')}</td>
        <td>${fmtDate(r.start_date)} - ${fmtDate(r.end_date)}</td><td>${r.total_days}</td>
        <td>${escapeHtml(r.reason||'-')}</td><td>${statusBadge(r.status)}</td>
        <td style="text-align:right;">${r.status==='pending' ? `
          <button class="btn btn-primary btn-sm" onclick="decideLeave('${r.id}','approved','${r.employee_id}','${r.leave_type_id}',${r.total_days})">Setujui</button>
          <button class="btn btn-danger btn-sm" onclick="decideLeave('${r.id}','rejected')">Tolak</button>` : ''}</td>
      </tr>`;
    }).join('') || '<tr><td colspan="7" class="empty-state">Belum ada pengajuan.</td></tr>'}</tbody></table></div>`;
}
async function decideLeave(id, decision, employeeId, leaveTypeId, days){
  const { error } = await sb.from('leave_requests').update({ status: decision, approved_at: new Date().toISOString(), approved_by: PROFILE.employee_id||null }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  if(decision === 'approved' && employeeId){
    const year = new Date().getFullYear();
    const { data: bal } = await sb.from('leave_balances').select('*').eq('employee_id', employeeId).eq('leave_type_id', leaveTypeId).eq('year', year).maybeSingle();
    if(bal) await sb.from('leave_balances').update({ used_days: Number(bal.used_days)+Number(days) }).eq('id', bal.id);
  }
  showToast('Status cuti diperbarui.'); loadLeaveRequests();
}
async function loadLeaveBalances(){
  const [emps, types, balances] = await Promise.all([ sbAll('employees'), sbAll('leave_types'), sbAll('leave_balances') ]);
  el('leave-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openBalanceForm()">+ Set Saldo Cuti</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Jenis Cuti</th><th>Tahun</th><th>Total</th><th>Terpakai</th><th>Sisa</th></tr></thead>
    <tbody>${balances.map(b=>{
      const emp = emps.find(e=>e.id===b.employee_id); const type = types.find(t=>t.id===b.leave_type_id);
      return `<tr><td>${escapeHtml(emp?emp.full_name:'-')}</td><td>${escapeHtml(type?type.name:'-')}</td><td>${b.year}</td><td>${b.total_days}</td><td>${b.used_days}</td><td>${(b.total_days-b.used_days).toFixed(1)}</td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada saldo cuti.</td></tr>'}</tbody></table></div>`;
}
function openBalanceForm(){
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
async function saveBalance(){
  const payload = { employee_id: el('b-emp').value, leave_type_id: el('b-type').value, year: Number(el('b-year').value), total_days: Number(el('b-total').value), used_days: 0 };
  const { error } = await sb.from('leave_balances').upsert(payload, { onConflict: 'employee_id,leave_type_id,year' });
  if(error){ showToast(error.message, true); return; }
  showToast('Saldo cuti disimpan.'); closeModal(); loadLeaveBalances();
}

// ---- Cuti milik sendiri (employee) ----
async function renderMyLeave(){
  const c = el('content');
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan ke data karyawan.</div>'; return; }
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
function openLeaveRequestForm(){
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
async function submitLeaveRequest(){
  const start = el('lr-start').value, end = el('lr-end').value;
  if(!start || !end){ showToast('Lengkapi tanggal.', true); return; }
  const days = Math.round((new Date(end)-new Date(start))/86400000) + 1;
  if(days <= 0){ showToast('Tanggal selesai harus setelah tanggal mulai.', true); return; }
  const { error } = await sb.from('leave_requests').insert({ employee_id: ME.id, leave_type_id: el('lr-type').value, start_date: start, end_date: end, total_days: days, reason: el('lr-reason').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Pengajuan cuti terkirim.'); closeModal(); renderMyLeave();
}

// =====================================================================
// MODUL: PAYROLL
// =====================================================================
async function renderPayroll(){
  const c = el('content');
  const runs = await sbAll('payroll_runs', {order:{col:'created_at', asc:false}});
  c.innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openPayrollRunForm()">+ Buat Periode Payroll</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Periode</th><th>Status</th><th></th></tr></thead>
    <tbody>${runs.map(r=>`<tr><td>${String(r.period_month).padStart(2,'0')}/${r.period_year}</td><td>${statusBadge(r.status)}</td>
      <td style="text-align:right;">
        ${r.status==='draft'?`<button class="btn btn-primary btn-sm" onclick="generatePayslips('${r.id}')">Generate Slip</button>`:''}
        <button class="btn btn-outline btn-sm" onclick="viewPayslips('${r.id}','${r.period_month}','${r.period_year}')">Lihat Slip</button>
      </td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada periode payroll.</td></tr>'}</tbody></table></div>
    <div id="payslip-area" style="margin-top:16px;"></div>`;
}
function openPayrollRunForm(){
  const now = new Date();
  openModal(`<h3>Buat Periode Payroll</h3>
    <div class="field"><label>Bulan</label><input id="pr-month" type="number" min="1" max="12" value="${now.getMonth()+1}"></div>
    <div class="field"><label>Tahun</label><input id="pr-year" type="number" value="${now.getFullYear()}"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePayrollRun()">Buat</button>
    </div>`);
}
async function savePayrollRun(){
  const { error } = await sb.from('payroll_runs').insert({ period_month: Number(el('pr-month').value), period_year: Number(el('pr-year').value) });
  if(error){ showToast(error.message, true); return; }
  showToast('Periode payroll dibuat.'); closeModal(); renderPayroll();
}
async function generatePayslips(runId){
  const [emps, components] = await Promise.all([ sbAll('employees', {eq:{employment_status:'active'}}), sbAll('payroll_components') ]);
  const earnings = components.filter(c=>c.component_type==='earning');
  const deductions = components.filter(c=>c.component_type==='deduction');
  for(const e of emps){
    const details = [];
    let totalEarn = Number(e.basic_salary)||0;
    details.push({ name:'Gaji Pokok', amount: totalEarn, type:'earning' });
    earnings.filter(x=>x.name!=='Gaji Pokok').forEach(comp=>{
      const amt = comp.is_percentage ? (e.basic_salary * comp.default_amount/100) : comp.default_amount;
      details.push({ name: comp.name, amount: amt, type:'earning' }); totalEarn += amt;
    });
    let totalDed = 0;
    deductions.forEach(comp=>{
      const amt = comp.is_percentage ? (e.basic_salary * comp.default_amount/100) : comp.default_amount;
      details.push({ name: comp.name, amount: amt, type:'deduction' }); totalDed += amt;
    });
    const payload = { payroll_run_id: runId, employee_id: e.id, basic_salary: e.basic_salary||0, total_earnings: totalEarn, total_deductions: totalDed, net_salary: totalEarn-totalDed, details };
    await sb.from('payslips').upsert(payload, { onConflict: 'payroll_run_id,employee_id' });
  }
  await sb.from('payroll_runs').update({ status: 'processed' }).eq('id', runId);
  showToast('Slip gaji berhasil dibuat untuk semua karyawan aktif.'); renderPayroll();
}
async function viewPayslips(runId, month, year){
  const [slips, emps] = await Promise.all([ sbAll('payslips', {eq:{payroll_run_id: runId}}), sbAll('employees') ]);
  el('payslip-area').innerHTML = `<h3>Slip Gaji Periode ${String(month).padStart(2,'0')}/${year}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Gaji Pokok</th><th>Total Pendapatan</th><th>Total Potongan</th><th>Gaji Bersih</th></tr></thead>
    <tbody>${slips.map(s=>{ const e = emps.find(x=>x.id===s.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td>${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Slip belum dibuat.</td></tr>'}</tbody></table></div>`;
}

// ---- Slip gaji milik sendiri (employee) ----
async function renderMyPayslip(){
  const c = el('content');
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan ke data karyawan.</div>'; return; }
  const slips = await sbAll('payslips', {eq:{employee_id: ME.id}, order:{col:'created_at', asc:false}});
  const runs = await sbAll('payroll_runs');
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Periode</th><th>Gaji Pokok</th><th>Pendapatan</th><th>Potongan</th><th>Gaji Bersih</th></tr></thead>
    <tbody>${slips.map(s=>{ const run = runs.find(r=>r.id===s.payroll_run_id); return `<tr><td>${run?String(run.period_month).padStart(2,'0')+'/'+run.period_year:'-'}</td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td>${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada slip gaji.</td></tr>'}</tbody></table></div>`;
}

// =====================================================================
// MODUL: REKRUTMEN / ATS
// =====================================================================
async function renderRecruitment(){
  const c = el('content');
  const [jobs, depts] = await Promise.all([ sbAll('job_postings', {order:{col:'opened_date', asc:false}}), sbAll('departments') ]);
  c.innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openJobForm()">+ Buka Lowongan</button></div>
    <div class="grid grid-2">${jobs.map(j=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><b>${escapeHtml(j.title)}</b><div style="font-size:12px;color:var(--text-muted);">${depts.find(d=>d.id===j.department_id)?.name||'-'}</div></div>
          ${statusBadge(j.status)}
        </div>
        <p style="font-size:13px;color:var(--text-muted);">${escapeHtml(j.description||'')}</p>
        <button class="btn btn-outline btn-sm" onclick="viewCandidates('${j.id}','${escapeHtml(j.title)}')">Lihat Kandidat</button>
      </div>`).join('') || '<div class="empty-state">Belum ada lowongan dibuka.</div>'}</div>
    <div id="candidate-area" style="margin-top:18px;"></div>`;
}
function openJobForm(){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  openModal(`<h3>Buka Lowongan</h3>
    <div class="field"><label>Posisi</label><input id="j-title"></div>
    <div class="field"><label>Departemen</label><select id="j-dept">${deptOpts}</select></div>
    <div class="field"><label>Deskripsi</label><textarea id="j-desc" rows="3"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveJob()">Simpan</button>
    </div>`);
}
async function saveJob(){
  const { error } = await sb.from('job_postings').insert({ title: el('j-title').value.trim(), department_id: el('j-dept').value||null, description: el('j-desc').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Lowongan dibuka.'); closeModal(); renderRecruitment();
}
const STAGES = ['applied','screening','interview','offer','hired','rejected'];
async function viewCandidates(jobId, title){
  const candidates = await sbAll('candidates', {eq:{job_posting_id: jobId}, order:{col:'applied_at', asc:false}});
  el('candidate-area').innerHTML = `<div class="toolbar"><h3 style="margin:0;">Kandidat — ${title}</h3><button class="btn btn-primary btn-sm" onclick="openCandidateForm('${jobId}')">+ Tambah Kandidat</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Kontak</th><th>Tahap</th></tr></thead>
    <tbody>${candidates.map(c=>`<tr><td>${escapeHtml(c.full_name)}</td><td>${escapeHtml(c.email||c.phone||'-')}</td>
      <td><select onchange="updateCandidateStage('${c.id}', this.value, '${jobId}', '${title.replace(/'/g,"\\'")}')">${STAGES.map(s=>`<option value="${s}" ${c.stage===s?'selected':''}>${s}</option>`).join('')}</select></td>
    </tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada kandidat.</td></tr>'}</tbody></table></div>`;
}
function openCandidateForm(jobId){
  openModal(`<h3>Tambah Kandidat</h3>
    <div class="field"><label>Nama</label><input id="cd-name"></div>
    <div class="field"><label>Email</label><input id="cd-email"></div>
    <div class="field"><label>Telepon</label><input id="cd-phone"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveCandidate('${jobId}')">Simpan</button>
    </div>`);
}
async function saveCandidate(jobId){
  const { error } = await sb.from('candidates').insert({ job_posting_id: jobId, full_name: el('cd-name').value.trim(), email: el('cd-email').value.trim(), phone: el('cd-phone').value.trim() });
  if(error){ showToast(error.message, true); return; }
  closeModal(); showToast('Kandidat ditambahkan.');
  const job = await sb.from('job_postings').select('title').eq('id', jobId).maybeSingle();
  viewCandidates(jobId, job.data?.title||'');
}
async function updateCandidateStage(id, stage, jobId, title){
  const { error } = await sb.from('candidates').update({ stage }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Tahap kandidat diperbarui.'); viewCandidates(jobId, title);
}

// =====================================================================
// MODUL: PENILAIAN KINERJA
// =====================================================================
async function renderPerformance(){
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
function openCycleForm(){
  openModal(`<h3>Buat Siklus Penilaian</h3>
    <div class="field"><label>Nama Siklus</label><input id="cy-name" placeholder="Contoh: Q1 2026"></div>
    <div class="field"><label>Mulai</label><input id="cy-start" type="date"></div>
    <div class="field"><label>Selesai</label><input id="cy-end" type="date"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveCycle()">Simpan</button>
    </div>`);
}
async function saveCycle(){
  const { error } = await sb.from('performance_cycles').insert({ name: el('cy-name').value.trim(), start_date: el('cy-start').value, end_date: el('cy-end').value });
  if(error){ showToast(error.message, true); return; }
  showToast('Siklus dibuat.'); closeModal(); renderPerformance();
}
async function viewReviews(cycleId, cycleName){
  const [emps, reviews] = await Promise.all([ sbAll('employees'), sbAll('performance_reviews', {eq:{cycle_id: cycleId}}) ]);
  el('review-area').innerHTML = `<h3>Penilaian — ${escapeHtml(cycleName)}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Skor</th><th>Kekuatan</th><th>Area Perbaikan</th><th>Status</th><th></th></tr></thead>
    <tbody>${emps.map(e=>{
      const r = reviews.find(x=>x.employee_id===e.id);
      return `<tr><td>${escapeHtml(e.full_name)}</td><td>${r?r.score:'-'}</td><td>${escapeHtml(r?.strengths||'-')}</td><td>${escapeHtml(r?.improvements||'-')}</td><td>${r?statusBadge(r.status):badge('Belum Dinilai','neutral')}</td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openReviewForm("${cycleId}","${e.id}","${escapeHtml(e.full_name)}",${JSON.stringify(r||null).replace(/'/g,"&apos;")})'>${r?'Edit':'Nilai'}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
}
function openReviewForm(cycleId, employeeId, name, r){
  openModal(`<h3>Penilaian — ${escapeHtml(name)}</h3>
    <div class="field"><label>Skor (0-100)</label><input id="rv-score" type="number" value="${r?r.score:''}"></div>
    <div class="field"><label>Kekuatan</label><textarea id="rv-strengths" rows="2">${r?escapeHtml(r.strengths||''):''}</textarea></div>
    <div class="field"><label>Area Perbaikan</label><textarea id="rv-improve" rows="2">${r?escapeHtml(r.improvements||''):''}</textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveReview('${cycleId}','${employeeId}')">Simpan</button>
    </div>`);
}
async function saveReview(cycleId, employeeId){
  const payload = { cycle_id: cycleId, employee_id: employeeId, score: Number(el('rv-score').value)||null, strengths: el('rv-strengths').value.trim(), improvements: el('rv-improve').value.trim(), status: 'submitted' };
  const { error } = await sb.from('performance_reviews').upsert(payload, { onConflict: 'cycle_id,employee_id' });
  if(error){ showToast(error.message, true); return; }
  showToast('Penilaian disimpan.'); closeModal(); renderPerformance();
}

// =====================================================================
// MODUL: TRAINING & DEVELOPMENT (dipakai HR & employee)
// =====================================================================
async function renderTraining(){
  const c = el('content');
  const programs = await sbAll('training_programs', {order:{col:'start_date', asc:false}});
  const myEnroll = ME ? await sbAll('training_enrollments', {eq:{employee_id: ME.id}}) : [];
  c.innerHTML = `${isHR()?`<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openProgramForm()">+ Buat Program</button></div>`:''}
    <div class="grid grid-2">${programs.map(p=>{
      const mine = myEnroll.find(x=>x.program_id===p.id);
      return `<div class="card">
        <b>${escapeHtml(p.name)}</b>
        <div style="font-size:12.5px;color:var(--text-muted);margin:4px 0;">${escapeHtml(p.provider||'-')} • ${fmtDate(p.start_date)} - ${fmtDate(p.end_date)}</div>
        <p style="font-size:13px;color:var(--text-muted);">${escapeHtml(p.description||'')}</p>
        ${isHR() ? `<button class="btn btn-outline btn-sm" onclick="viewEnrollments('${p.id}','${escapeHtml(p.name)}')">Lihat Peserta</button>` :
          (ME ? (mine ? statusBadge(mine.status) : `<button class="btn btn-primary btn-sm" onclick="enrollTraining('${p.id}')">Ikuti Training</button>`) : '')}
      </div>`;
    }).join('') || '<div class="empty-state">Belum ada program training.</div>'}</div>
    <div id="enroll-area" style="margin-top:18px;"></div>`;
}
function openProgramForm(){
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
async function saveProgram(){
  const { error } = await sb.from('training_programs').insert({ name: el('tp-name').value.trim(), provider: el('tp-provider').value.trim(), start_date: el('tp-start').value||null, end_date: el('tp-end').value||null, description: el('tp-desc').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Program dibuat.'); closeModal(); renderTraining();
}
async function enrollTraining(programId){
  const { error } = await sb.from('training_enrollments').insert({ program_id: programId, employee_id: ME.id });
  if(error){ showToast(error.message, true); return; }
  showToast('Kamu terdaftar di program ini.'); renderTraining();
}
async function viewEnrollments(programId, name){
  const [enrolls, emps] = await Promise.all([ sbAll('training_enrollments', {eq:{program_id: programId}}), sbAll('employees') ]);
  el('enroll-area').innerHTML = `<h3>Peserta — ${escapeHtml(name)}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Status</th><th></th></tr></thead>
    <tbody>${enrolls.map(en=>{ const e = emps.find(x=>x.id===en.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${statusBadge(en.status)}</td>
      <td style="text-align:right;">${en.status!=='completed'?`<button class="btn btn-outline btn-sm" onclick="markTrainingComplete('${en.id}','${programId}','${escapeHtml(name)}')">Tandai Selesai</button>`:''}</td></tr>`; }).join('') || '<tr><td colspan="3" class="empty-state">Belum ada peserta.</td></tr>'}</tbody></table></div>`;
}
async function markTrainingComplete(id, programId, name){
  const { error } = await sb.from('training_enrollments').update({ status:'completed', completion_date: new Date().toISOString().slice(0,10) }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Peserta ditandai selesai.'); viewEnrollments(programId, name);
}

// =====================================================================
// MODUL: REIMBURSEMENT / KLAIM
// =====================================================================
async function renderClaims(){
  const c = el('content');
  const [claims, emps] = await Promise.all([ sbAll('reimbursement_claims', {order:{col:'submitted_at', asc:false}}), sbAll('employees') ]);
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Kategori</th><th>Jumlah</th><th>Keterangan</th><th>Status</th><th></th></tr></thead>
    <tbody>${claims.map(c=>{ const e = emps.find(x=>x.id===c.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${escapeHtml(c.category)}</td><td>${fmtMoney(c.amount)}</td><td>${escapeHtml(c.description||'-')}</td><td>${statusBadge(c.status)}</td>
      <td style="text-align:right;">${c.status==='pending'?`
        <button class="btn btn-primary btn-sm" onclick="decideClaim('${c.id}','approved')">Setujui</button>
        <button class="btn btn-danger btn-sm" onclick="decideClaim('${c.id}','rejected')">Tolak</button>`:
        c.status==='approved'?`<button class="btn btn-outline btn-sm" onclick="decideClaim('${c.id}','paid')">Tandai Dibayar</button>`:''}</td></tr>`; }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada klaim.</td></tr>'}</tbody></table></div>`;
}
async function decideClaim(id, status){
  const { error } = await sb.from('reimbursement_claims').update({ status, approved_by: PROFILE.employee_id||null, approved_at: new Date().toISOString() }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Status klaim diperbarui.'); renderClaims();
}

// ---- Klaim milik sendiri (employee) ----
async function renderMyClaims(){
  const c = el('content');
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan ke data karyawan.</div>'; return; }
  const claims = await sbAll('reimbursement_claims', {eq:{employee_id: ME.id}, order:{col:'submitted_at', asc:false}});
  c.innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary" onclick="openClaimForm()">+ Ajukan Klaim</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Kategori</th><th>Jumlah</th><th>Keterangan</th><th>Status</th></tr></thead>
    <tbody>${claims.map(c=>`<tr><td>${escapeHtml(c.category)}</td><td>${fmtMoney(c.amount)}</td><td>${escapeHtml(c.description||'-')}</td><td>${statusBadge(c.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada klaim.</td></tr>'}</tbody></table></div>`;
}
function openClaimForm(){
  openModal(`<h3>Ajukan Klaim Reimbursement</h3>
    <div class="field"><label>Kategori</label><input id="rc-cat" placeholder="Transport, Medis, dll"></div>
<div class="field"><label>Jumlah</label>
  <input id="rc-amount" type="text" oninput="formatNumberInput(this)" placeholder="0">
</div>
    <div class="field"><label>Keterangan</label><textarea id="rc-desc" rows="3"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="submitClaim()">Ajukan</button>
    </div>`);
}
async function submitClaim(){
  const { error } = await sb.from('reimbursement_claims').insert({ employee_id: ME.id, category: el('rc-cat').value.trim(), amount: Number(el('rc-amount').value.replace(/\./g, '')) || 0 });
  if(error){ showToast(error.message, true); return; }
  showToast('Klaim terkirim.'); closeModal(); renderMyClaims();
}
// =====================================================================
// DIREKTORI KARYAWAN (untuk employee)
// =====================================================================
async function renderDirectory(){
  const c = el('content');
  const emps = await sbAll('employees', {select:'full_name, department_id, position_id, email', order:{col:'full_name'}});
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Departemen</th><th>Jabatan</th><th>Email</th></tr></thead>
    <tbody>${emps.map(e=>{ const d=CACHE.departments.find(x=>x.id===e.department_id); const p=CACHE.positions.find(x=>x.id===e.position_id); return `<tr><td>${escapeHtml(e.full_name)}</td><td>${d?d.name:'-'}</td><td>${p?p.name:'-'}</td><td>${escapeHtml(e.email||'-')}</td></tr>`; }).join('') || '<tr><td colspan="4" class="empty-state">Belum ada data.</td></tr>'}</tbody></table></div>`;
}

// =====================================================================
// MODUL: PENGATURAN (master data: departemen, jabatan, jenis cuti, komponen payroll)
// =====================================================================
async function renderSettings(){
  const c = el('content');
  c.innerHTML = `<div class="tab-row">
      <div class="tab active" data-tab="dept" onclick="switchSettingsTab('dept')">Departemen</div>
      <div class="tab" data-tab="pos" onclick="switchSettingsTab('pos')">Jabatan</div>
      <div class="tab" data-tab="leavetype" onclick="switchSettingsTab('leavetype')">Jenis Cuti</div>
      <div class="tab" data-tab="payrollcomp" onclick="switchSettingsTab('payrollcomp')">Komponen Payroll</div>
      <div class="tab" data-tab="users" onclick="switchSettingsTab('users')">Pengguna & Role</div>
    </div><div id="settings-body"></div>`;
  switchSettingsTab('dept');
}
function switchSettingsTab(tab){
  document.querySelectorAll('#content .tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===tab));
  ({dept:loadDeptSettings, pos:loadPosSettings, leavetype:loadLeaveTypeSettings, payrollcomp:loadPayrollCompSettings, users:loadUserSettings})[tab]();
}
async function loadDeptSettings(){
  const list = await sbAll('departments', {order:{col:'name'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="quickAdd('departments',{name:''},'Nama Departemen','loadDeptSettings')">+ Tambah Departemen</button></div>
    <div class="card" style="padding:0;"><table><tbody>${list.map(d=>`<tr><td>${escapeHtml(d.name)}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('departments','${d.id}','loadDeptSettings')">Hapus</button></td></tr>`).join('') || '<tr><td class="empty-state">Belum ada departemen.</td></tr>'}</tbody></table></div>`;
}
async function loadPosSettings(){
  const [list, depts] = await Promise.all([ sbAll('positions', {order:{col:'name'}}), sbAll('departments') ]);
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openPositionForm()">+ Tambah Jabatan</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Jabatan</th><th>Departemen</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${depts.find(d=>d.id===p.department_id)?.name||'-'}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('positions','${p.id}','loadPosSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada jabatan.</td></tr>'}</tbody></table></div>`;
}
function openPositionForm(){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  openModal(`<h3>Tambah Jabatan</h3>
    <div class="field"><label>Nama Jabatan</label><input id="p-name"></div>
    <div class="field"><label>Departemen</label><select id="p-dept">${deptOpts}</select></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePosition()">Simpan</button>
    </div>`);
}
async function savePosition(){
  const { error } = await sb.from('positions').insert({ name: el('p-name').value.trim(), department_id: el('p-dept').value||null });
  if(error){ showToast(error.message, true); return; }
  showToast('Jabatan ditambahkan.'); closeModal(); CACHE.positions = await sbAll('positions'); loadPosSettings();
}
async function loadLeaveTypeSettings(){
  const list = await sbAll('leave_types', {order:{col:'name'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openLeaveTypeForm()">+ Tambah Jenis Cuti</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Default Hari/Tahun</th><th></th></tr></thead>
    <tbody>${list.map(t=>`<tr><td>${escapeHtml(t.name)}</td><td>${t.default_days_per_year}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('leave_types','${t.id}','loadLeaveTypeSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="3" class="empty-state">Belum ada jenis cuti.</td></tr>'}</tbody></table></div>`;
}
function openLeaveTypeForm(){
  openModal(`<h3>Tambah Jenis Cuti</h3>
    <div class="field"><label>Nama</label><input id="lt-name"></div>
    <div class="field"><label>Default Hari/Tahun</label><input id="lt-days" type="number" value="12"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveLeaveType()">Simpan</button>
    </div>`);
}
async function saveLeaveType(){
  const { error } = await sb.from('leave_types').insert({ name: el('lt-name').value.trim(), default_days_per_year: Number(el('lt-days').value)||0 });
  if(error){ showToast(error.message, true); return; }
  showToast('Jenis cuti ditambahkan.'); closeModal(); CACHE.leaveTypes = await sbAll('leave_types'); loadLeaveTypeSettings();
}
async function loadPayrollCompSettings(){
  const list = await sbAll('payroll_components', {order:{col:'component_type'}});
  el('settings-body').innerHTML = `<div class="toolbar"><span></span><button class="btn btn-primary btn-sm" onclick="openPayrollCompForm()">+ Tambah Komponen</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Tipe</th><th>Nilai</th><th></th></tr></thead>
    <tbody>${list.map(p=>`<tr><td>${escapeHtml(p.name)}</td><td>${p.component_type==='earning'?'Pendapatan':'Potongan'}</td><td>${p.is_percentage?p.default_amount+'%':fmtMoney(p.default_amount)}</td><td style="text-align:right;"><button class="btn btn-danger btn-sm" onclick="quickDelete('payroll_components','${p.id}','loadPayrollCompSettings')">Hapus</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada komponen.</td></tr>'}</tbody></table></div>`;
}
function openPayrollCompForm(){
  openModal(`<h3>Tambah Komponen Payroll</h3>
    <div class="field"><label>Nama</label><input id="pc-name"></div>
    <div class="field"><label>Tipe</label><select id="pc-type"><option value="earning">Pendapatan</option><option value="deduction">Potongan</option></select></div>
    <div class="field"><label>Nilai adalah Persentase?</label><select id="pc-pct"><option value="false">Tidak (nominal tetap)</option><option value="true">Ya (%)</option></select></div>
<div class="field"><label>Nilai Default</label>
  <input id="pc-amount" type="text" oninput="formatNumberInput(this)" value="0">
</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="savePayrollComp()">Simpan</button>
    </div>`);
}
async function savePayrollComp(){
  const { error } = await sb.from('payroll_components').insert({ name: el('pc-name').value.trim(), component_type: el('pc-type').value, is_percentage: el('pc-pct').value === 'true', default_amount: Number(el('pc-amount').value.replace(/\./g, '')) || 0 });
  if(error){ showToast(error.message, true); return; }
  showToast('Komponen ditambahkan.'); closeModal(); loadPayrollCompSettings();
}
async function loadUserSettings(){
  const [profiles, emps] = await Promise.all([ sbAll('profiles'), sbAll('employees') ]);
  el('settings-body').innerHTML = `<p style="font-size:13px;color:var(--text-muted);">Tautkan akun pengguna ke data karyawan dan atur role akses.</p>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama Akun</th><th>Role</th><th>Karyawan Tertaut</th><th></th></tr></thead>
    <tbody>${profiles.map(p=>`<tr><td>${escapeHtml(p.full_name)}</td><td>${p.role}</td><td>${emps.find(e=>e.id===p.employee_id)?.full_name||'-'}</td>
      <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openUserLinkForm(${JSON.stringify(p).replace(/'/g,"&apos;")})'>Kelola</button></td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada pengguna.</td></tr>'}</tbody></table></div>`;
}
function openUserLinkForm(p){
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
async function saveUserLink(id){
  const { error } = await sb.from('profiles').update({ role: el('u-role').value, employee_id: el('u-emp').value || null }).eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Akses pengguna diperbarui.'); closeModal(); loadUserSettings();
}
async function quickAdd(table, field, label, reload){
  openModal(`<h3>Tambah</h3><div class="field"><label>${label}</label><input id="quick-input"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="quickSave('${table}','${reload}')">Simpan</button>
    </div>`);
}
async function quickSave(table, reload){
  const { error } = await sb.from(table).insert({ name: el('quick-input').value.trim() });
  if(error){ showToast(error.message, true); return; }
  showToast('Tersimpan.'); closeModal();
  CACHE.departments = await sbAll('departments');
  window[reload]();
}
async function quickDelete(table, id, reload){
  if(!confirm('Hapus data ini?')) return;
  const { error } = await sb.from(table).delete().eq('id', id);
  if(error){ showToast('Gagal menghapus: '+error.message, true); return; }
  showToast('Data dihapus.'); window[reload]();
}
