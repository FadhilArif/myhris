import { sb } from '../lib/supabase.js';
import { state, CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtDate } from '../utils/format.js';

export async function renderOnboardingList(){
  const c = el('content');
  const [onboards, emps] = await Promise.all([
    sbAll('onboardings', {order:{col:'created_at', asc:false}}),
    sbAll('employees', {select:'*, departments(name), positions(name)'})
  ]);
  const inProgress = onboards.filter(o=>o.status==='in_progress').length;
  const completed = onboards.filter(o=>o.status==='completed').length;
  c.innerHTML = `
    <div class="toolbar">
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" onclick="navigate('onboarding-templates')">📋 Kelola Template</button>
      </div>
      <button class="btn btn-primary" onclick="openStartOnboardingForm()">+ Mulai Onboarding</button>
    </div>
    <div class="grid grid-3" style="margin-bottom:18px;">
      <div class="stat-card"><div class="stat-num">${onboards.length}</div><div class="stat-label">Total Onboarding</div></div>
      <div class="stat-card"><div class="stat-num">${inProgress}</div><div class="stat-label">Sedang Berjalan</div></div>
      <div class="stat-card"><div class="stat-num" style="color:var(--accent-dark);">${completed}</div><div class="stat-label">Selesai</div></div>
    </div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Mulai</th><th>Progress</th><th>Status</th><th></th></tr></thead>
    <tbody>${onboards.map(o=>{
      const e = emps.find(x=>x.id===o.employee_id);
      return `<tr>
        <td><b>${escapeHtml(e?e.full_name:'-')}</b><br><span style="font-size:11.5px;color:var(--text-muted);">${escapeHtml(e?.positions?.name||'')}</span></td>
        <td>${fmtDate(o.started_date)}</td>
        <td>${o.completed_date ? '100%' : '<span style="color:var(--text-muted);">In Progress</span>'}</td>
        <td>${statusBadge(o.status === 'in_progress' ? 'submitted' : 'completed')}</td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick="viewOnboarding('${o.id}')">Kelola</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" class="empty-state">Belum ada onboarding.</td></tr>'}</tbody></table></div>`;
}

export function openStartOnboardingForm(){
  const emps = CACHE.employees || [];
  openModal(`<h3>Mulai Onboarding</h3>
    <div class="field"><label>Karyawan</label>
      <select id="ob-emp"><option value="">- Pilih Karyawan -</option>
        ${emps.filter(e=>e.employment_status==='active'||e.employment_status==='probation').map(e=>`<option value="${e.id}">${escapeHtml(e.full_name)}</option>`).join('')}
      </select>
    </div>
    <div style="background:#FAFAF6;padding:10px 12px;border-radius:8px;font-size:12px;color:var(--text-muted);margin-bottom:12px;">
      Template default akan otomatis di-apply.
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="startOnboarding()">Mulai</button>
    </div>`);
}

export async function startOnboarding(){
  const empId = el('ob-emp').value;
  if(!empId){ showToast('Pilih karyawan.', true); return; }
  const templates = await sbAll('onboarding_templates', {eq:{is_active:true}});
  const template = templates[0];
  if(!template){ showToast('Template onboarding belum ada.', true); return; }
  const items = await sbAll('onboarding_template_items', {eq:{template_id: template.id}, order:{col:'order_index'}});
  const { data: newOnb, error: onbErr } = await sb.from('onboardings').insert({ employee_id: empId, template_id: template.id, started_date: new Date().toISOString().slice(0,10), status: 'in_progress' }).select().single();
  if(onbErr){ showToast(onbErr.message, true); return; }
  const itemsPayload = items.map(it => ({ onboarding_id: newOnb.id, task_name: it.task_name, owner_role: it.owner_role, due_date: new Date(Date.now() + it.due_days * 86400000).toISOString().slice(0,10), is_done: false }));
  if(itemsPayload.length){
    const { error: itemsErr } = await sb.from('onboarding_items').insert(itemsPayload);
    if(itemsErr){ showToast(itemsErr.message, true); return; }
  }
  showToast('Onboarding dimulai.'); closeModal(); renderOnboardingList();
}

export async function viewOnboarding(onboardingId){
  const [onbs, items, emps] = await Promise.all([
    sbAll('onboardings', {eq:{id: onboardingId}}),
    sbAll('onboarding_items', {eq:{onboarding_id: onboardingId}, order:{col:'due_date'}}),
    sbAll('employees')
  ]);
  const onb = onbs[0];
  if(!onb){ showToast('Data tidak ditemukan.', true); return; }
  const emp = emps.find(e=>e.id===onb.employee_id);
  const done = items.filter(i=>i.is_done).length;
  const progress = items.length ? Math.round(done / items.length * 100) : 0;
  openModal(`
    <h3>Onboarding — ${escapeHtml(emp?.full_name || '-')}</h3>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
      <div style="flex:1;background:#EFEDE3;border-radius:20px;height:10px;overflow:hidden;">
        <div style="width:${progress}%;background:linear-gradient(90deg,var(--accent),var(--accent-dark));height:100%;"></div>
      </div>
      <div style="font-weight:700;font-size:14px;color:var(--accent-dark);">${progress}%</div>
    </div>
    <div style="max-height:400px;overflow-y:auto;margin-bottom:16px;">
      ${items.map(it => `
        <div style="display:flex;gap:10px;padding:10px;border-bottom:1px solid var(--border);align-items:flex-start;">
          <input type="checkbox" ${it.is_done?'checked':''} onchange="toggleOnboardingItem('${it.id}', this.checked, '${onboardingId}')" style="width:auto;margin-top:4px;">
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13.5px;${it.is_done?'color:var(--text-muted);text-decoration:line-through;':''}">${escapeHtml(it.task_name)}</div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">
              ${it.owner_role ? `👤 ${it.owner_role.toUpperCase()} • ` : ''}📅 Due ${fmtDate(it.due_date)}
            </div>
          </div>
        </div>`).join('') || '<div class="empty-state">Belum ada item.</div>'}
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Tutup</button>
      ${progress === 100 && onb.status !== 'completed' ? `<button class="btn btn-primary" onclick="completeOnboarding('${onboardingId}')">Tandai Selesai</button>` : ''}
    </div>`);
}

export async function toggleOnboardingItem(itemId, checked, onboardingId){
  const { error } = await sb.from('onboarding_items').update({ is_done: checked, done_at: checked ? new Date().toISOString() : null, done_by: state.profile.employee_id || null }).eq('id', itemId);
  if(error){ showToast(error.message, true); return; }
  closeModal(); viewOnboarding(onboardingId);
}

export async function completeOnboarding(onboardingId){
  const { error } = await sb.from('onboardings').update({ status: 'completed', completed_date: new Date().toISOString().slice(0,10) }).eq('id', onboardingId);
  if(error){ showToast(error.message, true); return; }
  showToast('Onboarding selesai.'); closeModal(); renderOnboardingList();
}

export async function renderMyOnboarding(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const onbs = await sbAll('onboardings', {eq:{employee_id: ME.id}, order:{col:'created_at', asc:false}});
  if(!onbs.length){ c.innerHTML = '<div class="card"><div class="empty-state">Belum ada onboarding aktif.</div></div>'; return; }
  const onb = onbs[0];
  const items = await sbAll('onboarding_items', {eq:{onboarding_id: onb.id}, order:{col:'due_date'}});
  const done = items.filter(i=>i.is_done).length;
  const progress = items.length ? Math.round(done / items.length * 100) : 0;
  c.innerHTML = `
    <div class="card" style="margin-bottom:16px;">
      <h3 style="margin-top:0;">Onboarding Saya</h3>
      <div style="display:flex;align-items:center;gap:12px;margin-top:12px;">
        <div style="flex:1;background:#EFEDE3;border-radius:20px;height:10px;overflow:hidden;">
          <div style="width:${progress}%;background:linear-gradient(90deg,var(--accent),var(--accent-dark));height:100%;"></div>
        </div>
        <div style="font-weight:700;font-size:14px;color:var(--accent-dark);">${done}/${items.length}</div>
      </div>
      <div style="font-size:12.5px;color:var(--text-muted);margin-top:8px;">Mulai ${fmtDate(onb.started_date)}</div>
    </div>
    <div class="card" style="padding:0;">
      ${items.map(it => `
        <div style="display:flex;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border);align-items:flex-start;">
          <div style="width:24px;height:24px;border-radius:50%;background:${it.is_done?'var(--success-bg)':'#EFEDE3'};color:${it.is_done?'var(--success)':'var(--text-muted)'};display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0;font-size:12px;">
            ${it.is_done ? '✓' : '•'}
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:13.5px;${it.is_done?'color:var(--text-muted);text-decoration:line-through;':''}">${escapeHtml(it.task_name)}</div>
            <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
              ${it.owner_role ? `Dikerjakan oleh: <b>${it.owner_role.toUpperCase()}</b> • ` : ''}📅 ${fmtDate(it.due_date)}
            </div>
          </div>
        </div>`).join('')}
    </div>`;
}

export async function renderOnboardingTemplates(){
  const c = el('content');
  const [templates, items] = await Promise.all([
    sbAll('onboarding_templates', {order:{col:'name'}}),
    sbAll('onboarding_template_items', {order:{col:'order_index'}})
  ]);
  c.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-outline" onclick="navigate('onboarding')">← Kembali</button>
      <button class="btn btn-primary" onclick="openTemplateForm()">+ Template Baru</button>
    </div>
    ${templates.map(t=>{
      const tItems = items.filter(i=>i.template_id===t.id);
      return `<div class="card" style="margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div><div style="font-weight:700;font-size:15px;">${escapeHtml(t.name)}</div>
            <div style="font-size:12.5px;color:var(--text-muted);margin-top:3px;">${tItems.length} task</div></div>
          <div style="display:flex;gap:6px;">
            <button class="btn btn-outline btn-sm" onclick='openTemplateItemForm("${t.id}")'>+ Tambah Task</button>
            <button class="btn btn-danger btn-sm" onclick="deleteTemplate('${t.id}')">Hapus</button>
          </div>
        </div>
        <div style="margin-top:12px;">
          ${tItems.map(i=>`
            <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed var(--border);font-size:13px;">
              <span>${escapeHtml(i.task_name)}</span>
              <span style="color:var(--text-muted);font-size:11.5px;">${i.owner_role.toUpperCase()} • ${i.due_days} hari</span>
            </div>`).join('') || '<div style="padding:10px;color:var(--text-muted);font-size:12.5px;">Belum ada task.</div>'}
        </div>
      </div>`;
    }).join('')}`;
}

export function openTemplateForm(){
  openModal(`<h3>Template Baru</h3>
    <div class="field"><label>Nama Template</label><input id="tpl-name" placeholder="Contoh: Onboarding IT Support"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveTemplate()">Simpan</button>
    </div>`);
}

export async function saveTemplate(){
  const name = el('tpl-name').value.trim();
  if(!name){ showToast('Nama wajib diisi.', true); return; }
  const { error } = await sb.from('onboarding_templates').insert({ name });
  if(error){ showToast(error.message, true); return; }
  showToast('Template dibuat.'); closeModal(); renderOnboardingTemplates();
}

export function openTemplateItemForm(templateId){
  openModal(`<h3>Tambah Task</h3>
    <div class="field"><label>Nama Task</label><input id="ti-name" placeholder="Contoh: Setup akun email"></div>
    <div class="field"><label>Owner</label>
      <select id="ti-owner">
        <option value="hr">HR</option><option value="it">IT</option>
        <option value="finance">Finance</option><option value="manager">Manager</option>
        <option value="employee">Karyawan</option>
      </select>
    </div>
    <div class="field"><label>Target Selesai (hari)</label><input id="ti-days" type="number" value="7"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveTemplateItem('${templateId}')">Simpan</button>
    </div>`);
}

export async function saveTemplateItem(templateId){
  const { error } = await sb.from('onboarding_template_items').insert({
    template_id: templateId, task_name: el('ti-name').value.trim(),
    owner_role: el('ti-owner').value, due_days: Number(el('ti-days').value) || 7
  });
  if(error){ showToast(error.message, true); return; }
  showToast('Task ditambahkan.'); closeModal(); renderOnboardingTemplates();
}

export async function deleteTemplate(id){
  if(!confirm('Hapus template ini? Item di dalamnya akan ikut terhapus.')) return;
  const { error } = await sb.from('onboarding_templates').delete().eq('id', id);
  if(error){ showToast(error.message, true); return; }
  showToast('Template dihapus.'); renderOnboardingTemplates();
}
