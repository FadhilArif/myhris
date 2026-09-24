// src/modules/team.js

import { state, isManager } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, statusBadge, showToast } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

function inMyScope(employee){
  return !!(state.me?.department_id && employee?.department_id === state.me.department_id);
}

export async function renderTeam(){
  if(!isManager()){
    el('content').innerHTML = '<div class="empty-state">Akses ditolak.</div>';
    return;
  }

  const [emps, attendance, leaveReqs] = await Promise.all([
    sbAll('employees', {select:'*, departments(name), positions(name)', order:{col:'full_name'}}),
    sbAll('attendance', {eq:{work_date:new Date().toISOString().slice(0,10)}}),
    sbAll('leave_requests', {order:{col:'created_at', asc:false}})
  ]);

  const team = emps.filter(inMyScope);
  const present = attendance.filter(a => team.some(e => e.id === a.employee_id) && ['present','late'].includes(a.status)).length;
  const pendingLeave = leaveReqs.filter(r => r.status === 'pending' && team.some(e => e.id === r.employee_id)).length;

  const rows = team.map(e => {
    const avatar = e.photo_url
      ? '<img src="' + escapeHtml(e.photo_url) + '">'
      : (e.full_name?.[0] || '?').toUpperCase();
    return '<tr>' +
      '<td>' + escapeHtml(e.employee_code || '-') + '</td>' +
      '<td><div style="display:flex;align-items:center;">' +
        '<div class="emp-avatar-sm">' + avatar + '</div>' +
        '<span style="font-weight:600;">' + escapeHtml(e.full_name) + '</span>' +
      '</div></td>' +
      '<td>' + escapeHtml(e.positions?.name || '-') + '</td>' +
      '<td>' + fmtDate(e.join_date) + '</td>' +
      '<td>' + statusBadge(e.employment_status) + '</td>' +
      '<td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick="navigate(\\'employee-detail/' + e.id + '\\')">Detail</button></td>' +
    '</tr>';
  }).join('');

  el('content').innerHTML =
    '<div class="grid grid-3" style="margin-bottom:18px;">' +
      '<div class="stat-card"><div class="stat-num">' + team.length + '</div><div class="stat-label">Anggota Tim / Departemen</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + present + '/' + team.length + '</div><div class="stat-label">Hadir Hari Ini</div></div>' +
      '<div class="stat-card"><div class="stat-num">' + pendingLeave + '</div><div class="stat-label">Cuti Menunggu</div></div>' +
    '</div>' +
    '<div class="card" style="padding:0;">' +
      '<table><thead><tr><th>Kode</th><th>Nama</th><th>Jabatan</th><th>Bergabung</th><th>Status</th><th></th></tr></thead>' +
      '<tbody>' + (rows || '<tr><td colspan="6" class="empty-state">Belum ada karyawan dalam lingkup manager ini.</td></tr>') + '</tbody>' +
      '</table>' +
    '</div>' +
    '<div style="margin-top:10px;font-size:12px;color:var(--text-muted);">Lingkup Manager saat ini mengikuti departemen yang terhubung ke profil manager.</div>';
}

export async function refreshTeam(){
  try {
    await renderTeam();
  } catch(e) {
    console.error(e);
    showToast('Gagal memuat data tim.', true);
  }
}
