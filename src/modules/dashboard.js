import { sbAll } from '../services/db.js';
import { CACHE, isHR, state } from '../state/store.js';
import { el, escapeHtml, statusBadge } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

export async function renderDashboard(){
  const c = el('content');
  c.innerHTML = `<div class="empty-state">Memuat ringkasan…</div>`;
  if(isHR()){
    const today = new Date().toISOString().slice(0,10);
    const [emps, todayAtt, pendingLeave, pendingClaims] = await Promise.all([
      sbAll('employees'), sbAll('attendance', {eq:{work_date:today}}),
      sbAll('leave_requests', {eq:{status:'pending'}}), sbAll('reimbursement_claims', {eq:{status:'pending'}})
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
        <div class="stat-card"><div class="stat-num">${pendingLeave.length}</div><div class="stat-label">Cuti Menunggu</div></div>
        <div class="stat-card"><div class="stat-num">${pendingClaims.length}</div><div class="stat-label">Klaim Menunggu</div></div>
      </div>
      <div class="grid grid-2">
        <div class="card"><h3 style="margin-top:0;">Karyawan per Departemen</h3>
          ${Object.entries(byDept).map(([name,n])=>`
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:9px;">
              <div style="width:110px;font-size:12.5px;color:var(--text-muted);">${escapeHtml(name)}</div>
              <div style="flex:1;background:#EFEDE3;border-radius:5px;height:9px;overflow:hidden;"><div style="width:${(n/maxDept)*100}%;background:var(--accent);height:100%;"></div></div>
              <div style="width:24px;text-align:right;font-size:12.5px;font-weight:600;">${n}</div>
            </div>`).join('') || '<p class="empty-state">Belum ada data.</p>'}
        </div>
        <div class="card"><h3 style="margin-top:0;">Pengajuan Cuti Menunggu</h3>
          ${pendingLeave.length ? pendingLeave.slice(0,6).map(l=>{
            const emp = emps.find(e=>e.id===l.employee_id);
            return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px;">
              <span>${escapeHtml(emp?emp.full_name:'-')}</span><span style="color:var(--text-muted);">${fmtDate(l.start_date)} - ${fmtDate(l.end_date)}</span></div>`;
          }).join('') : '<p class="empty-state">Tidak ada pengajuan.</p>'}
        </div>
      </div>`;
  } else {
    const ME = state.me;
    const [myLeaveReqs, myClaims] = await Promise.all([
      ME ? sbAll('leave_requests', {eq:{employee_id: ME.id}}) : [],
      ME ? sbAll('reimbursement_claims', {eq:{employee_id: ME.id}}) : []
    ]);
    c.innerHTML = `
      <div class="grid grid-4" style="margin-bottom:18px;">
        <div class="stat-card"><div class="stat-num">${ME?ME.full_name.split(' ')[0]:'-'}</div><div class="stat-label">Selamat bekerja!</div></div>
        <div class="stat-card"><div class="stat-num">${myLeaveReqs.filter(l=>l.status==='pending').length}</div><div class="stat-label">Cuti Menunggu</div></div>
        <div class="stat-card"><div class="stat-num">${myClaims.filter(c=>c.status==='pending').length}</div><div class="stat-label">Klaim Menunggu</div></div>
        <div class="stat-card"><div class="stat-num">${ME?fmtDate(ME.join_date):'-'}</div><div class="stat-label">Bergabung</div></div>
      </div>
      ${!ME ? '<div class="card">Akun belum ditautkan ke data karyawan. Hubungi HR.</div>' : `
      <div class="card"><h3 style="margin-top:0;">Ringkasan Kamu</h3>
        <table><tbody>
          <tr><td style="color:var(--text-muted);width:160px;">Departemen</td><td>${ME.departments?.name||'-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Jabatan</td><td>${ME.positions?.name||'-'}</td></tr>
          <tr><td style="color:var(--text-muted);">Status</td><td>${statusBadge(ME.employment_status)}</td></tr>
        </tbody></table>
      </div>`}`;
  }
}
