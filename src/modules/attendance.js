import { sb } from '../lib/supabase.js';
import { state } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, showToast, statusBadge, badge } from '../utils/dom.js';
import { fmtDate, fmtDateTime } from '../utils/format.js';

export async function renderAttendance(){
  const c = el('content');
  const today = new Date().toISOString().slice(0,10);
  c.innerHTML = `<div class="toolbar"><input type="date" id="att-date" value="${today}" style="max-width:180px;" onchange="loadAttendanceForDate()"><span></span></div><div id="att-table"></div>`;
  loadAttendanceForDate();
}

export async function loadAttendanceForDate(){
  const date = el('att-date').value;
  const [emps, att] = await Promise.all([ sbAll('employees'), sbAll('attendance', {eq:{work_date:date}}) ]);
  const rows = emps.map(e => {
    const a = att.find(x=>x.employee_id===e.id);
    return `<tr><td>${escapeHtml(e.full_name)}</td><td>${a&&a.check_in?fmtDateTime(a.check_in):'-'}</td><td>${a&&a.check_out?fmtDateTime(a.check_out):'-'}</td><td>${a?statusBadge(a.status):badge('Belum Absen','neutral')}</td></tr>`;
  }).join('');
  el('att-table').innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Jam Masuk</th><th>Jam Keluar</th><th>Status</th></tr></thead><tbody>${rows || '<tr><td colspan="4" class="empty-state">Belum ada data.</td></tr>'}</tbody></table></div>`;
}

export async function renderMyAttendance(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const today = new Date().toISOString().slice(0,10);
  const todays = await sbAll('attendance', {eq:{employee_id: ME.id, work_date: today}});
  const mine = todays[0];
  const history = await sbAll('attendance', {eq:{employee_id: ME.id}, order:{col:'work_date', asc:false}});
  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <div><div style="font-weight:700;font-size:15px;">${fmtDate(today)}</div>
        <div style="font-size:12.5px;color:var(--text-muted);">Masuk: ${mine&&mine.check_in?fmtDateTime(mine.check_in):'-'} • Keluar: ${mine&&mine.check_out?fmtDateTime(mine.check_out):'-'}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-primary" ${mine&&mine.check_in?'disabled':''} onclick="checkIn()">Check In</button>
        <button class="btn btn-outline" ${(!mine||!mine.check_in||mine.check_out)?'disabled':''} onclick="checkOut()">Check Out</button>
      </div>
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Tanggal</th><th>Masuk</th><th>Keluar</th><th>Status</th></tr></thead>
    <tbody>${history.map(h=>`<tr><td>${fmtDate(h.work_date)}</td><td>${h.check_in?fmtDateTime(h.check_in):'-'}</td><td>${h.check_out?fmtDateTime(h.check_out):'-'}</td><td>${statusBadge(h.status)}</td></tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada riwayat.</td></tr>'}</tbody></table></div>`;
}

export async function checkIn(){
  const today = new Date().toISOString().slice(0,10);
  const status = new Date().getHours() >= 9 ? 'late' : 'present';
  const { error } = await sb.from('attendance').insert({ employee_id: state.me.id, work_date: today, check_in: new Date().toISOString(), status });
  if(error){ showToast(error.message, true); return; }
  showToast('Check-in berhasil.'); renderMyAttendance();
}

export async function checkOut(){
  const today = new Date().toISOString().slice(0,10);
  const { error } = await sb.from('attendance').update({ check_out: new Date().toISOString() }).eq('employee_id', state.me.id).eq('work_date', today);
  if(error){ showToast(error.message, true); return; }
  showToast('Check-out berhasil.'); renderMyAttendance();
}
