import { CACHE } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml } from '../utils/dom.js';

export async function renderDirectory(){
  const c = el('content');
  const emps = await sbAll('employees', {select:'full_name, department_id, position_id, email', order:{col:'full_name'}});
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Departemen</th><th>Jabatan</th><th>Email</th></tr></thead>
    <tbody>${emps.map(e=>{
      const d = CACHE.departments.find(x=>x.id===e.department_id);
      const p = CACHE.positions.find(x=>x.id===e.position_id);
      return `<tr><td>${escapeHtml(e.full_name)}</td><td>${d?d.name:'-'}</td><td>${p?p.name:'-'}</td><td>${escapeHtml(e.email||'-')}</td></tr>`;
    }).join('') || '<tr><td colspan="4" class="empty-state">Belum ada data.</td></tr>'}</tbody></table></div>`;
}
