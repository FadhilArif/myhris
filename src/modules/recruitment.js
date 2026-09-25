import { sb } from '../lib/supabase.js';
import { state, CACHE, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { logAudit } from '../services/audit.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtDate, formatNumberInput } from '../utils/format.js';
import { STAGES } from '../config/constants.js';

export async function renderRecruitment(){
  const c = el('content');
  const [jobs, depts] = await Promise.all([
    sbAll('job_postings', {order:{col:'opened_date', asc:false}}),
    sbAll('departments')
  ]);

  c.innerHTML = `<div class="toolbar"><span></span>
      <button class="btn btn-outline" onclick="copyCareerPageLink()">🔗 Salin Link Halaman Karir</button>
      <button class="btn btn-primary" onclick="openJobForm()">+ Buka Lowongan</button>
    </div>
    <div class="grid grid-2">${jobs.map(j=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div><b>${escapeHtml(j.title)}</b><div style="font-size:12px;color:var(--text-muted);">${escapeHtml(depts.find(d=>d.id===j.department_id)?.name||'-')}</div></div>
          ${statusBadge(j.status)}
        </div>
        <p style="font-size:13px;color:var(--text-muted);">${escapeHtml(j.description||'')}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick='viewCandidates(${JSON.stringify(j.id)}, ${JSON.stringify(j.title)})'>Lihat Kandidat</button>
          ${j.status==='open'
            ? `<button class="btn btn-outline btn-sm" onclick='closeJobPosting(${JSON.stringify(j.id)})'>Tutup Lowongan</button>`
            : `<button class="btn btn-outline btn-sm" onclick='reopenJobPosting(${JSON.stringify(j.id)})'>Buka Kembali</button>`}
          <button class="btn btn-danger btn-sm" onclick='deleteJobPosting(${JSON.stringify(j.id)})'>Arsipkan</button>
        </div>
      </div>`).join('') || '<div class="empty-state">Belum ada lowongan dibuka.</div>'}</div>
    <div id="candidate-area" style="margin-top:18px;"></div>`;
}

export function copyCareerPageLink(){
  const url = location.origin + '/career/';
  navigator.clipboard.writeText(url).then(()=>{
    showToast('Link halaman karir disalin: '+url);
  }).catch(()=>{
    prompt('Salin link halaman karir ini secara manual:', url);
  });
}

export async function closeJobPosting(jobId){
  const { error } = await sb.from('job_postings').update({ status: 'closed' }).eq('id', jobId);
  if(error){ showToast(error.message, true); return; }

  await logAudit(
    'recruitment.job_close',
    'job_postings',
    jobId,
    { status: 'open' },
    { status: 'closed' }
  );

  showToast('Lowongan ditutup.');
  renderRecruitment();
}

export async function reopenJobPosting(jobId){
  const { error } = await sb.from('job_postings').update({ status: 'open' }).eq('id', jobId);
  if(error){ showToast(error.message, true); return; }

  await logAudit(
    'recruitment.job_reopen',
    'job_postings',
    jobId,
    { status: 'closed' },
    { status: 'open' }
  );

  showToast('Lowongan dibuka kembali.');
  renderRecruitment();
}

export async function deleteJobPosting(jobId){
  if(!confirm('Arsipkan lowongan ini? Data kandidat tetap disimpan untuk histori rekrutmen.')) return;

  const { data, error } = await sb.rpc('soft_delete_master', {
    p_table_name: 'job_postings',
    p_id: jobId
  });

  if(error){
    showToast('Gagal mengarsipkan lowongan: ' + error.message, true);
    return;
  }

  if(data !== true){
    showToast('Lowongan tidak dapat diarsipkan.', true);
    return;
  }

  await logAudit(
    'recruitment.job_archive',
    'job_postings',
    jobId,
    null,
    { deleted_at: 'soft_deleted' }
  );

  showToast('Lowongan diarsipkan. Data kandidat tetap tersimpan.');
  renderRecruitment();
}

export function openJobForm(){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  openModal(`<h3>Buka Lowongan</h3>
    <div class="field"><label>Posisi</label><input id="j-title" maxlength="160"></div>
    <div class="field"><label>Departemen</label><select id="j-dept">${deptOpts}</select></div>
    <div class="field"><label>Deskripsi</label><textarea id="j-desc" rows="3" maxlength="5000"></textarea></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="saveJob()">Simpan</button>
    </div>`);
}

export async function saveJob(){
  const title = el('j-title').value.trim();
  const description = el('j-desc').value.trim();
  const departmentId = el('j-dept').value || null;

  if(!title){
    showToast('Judul posisi wajib diisi.', true);
    return;
  }

  const { data, error } = await sb
    .from('job_postings')
    .insert({
      title,
      department_id: departmentId,
      description,
      status: 'open'
    })
    .select()
    .single();

  if(error){
    showToast(error.message, true);
    return;
  }

  await logAudit(
    'recruitment.job_create',
    'job_postings',
    data?.id || null,
    null,
    { title, department_id: departmentId, status: 'open' }
  );

  showToast('Lowongan dibuka.');
  closeModal();
  renderRecruitment();
}

export async function viewCandidates(jobId, title){
  const candidates = await sbAll('candidates', {
    eq:{job_posting_id: jobId},
    order:{col:'applied_at', asc:false}
  });

  el('candidate-area').innerHTML = `<div class="toolbar"><h3 style="margin:0;">Kandidat — ${escapeHtml(title)}</h3><button class="btn btn-primary btn-sm" onclick='openCandidateForm(${JSON.stringify(jobId)})'>+ Tambah Kandidat</button></div>
    <div class="card" style="padding:0;"><table><thead><tr><th>Nama</th><th>Kontak</th><th>Tahap</th><th></th></tr></thead>
    <tbody>${candidates.map(c=>`<tr>
      <td>${escapeHtml(c.full_name)}${c.converted_employee_id ? ' <span class="badge badge-success" style="margin-left:6px;">✓ Dikonversi</span>' : ''}</td>
      <td>${escapeHtml(c.email||c.phone||'-')}</td>
      <td><select onchange='updateCandidateStage(${JSON.stringify(c.id)}, this.value, ${JSON.stringify(jobId)}, ${JSON.stringify(title)})'>${STAGES.map(s=>`<option value="${escapeHtml(s)}" ${c.stage===s?'selected':''}>${escapeHtml(s)}</option>`).join('')}</select></td>
      <td style="text-align:right;">
        ${c.stage === 'hired' && !c.converted_employee_id
          ? `<button class="btn btn-primary btn-sm" onclick='openConvertForm(${JSON.stringify(c).replace(/'/g,"&apos;")})'>Konversi ke Karyawan</button>`
          : ''}
      </td>
    </tr>`).join('') || '<tr><td colspan="4" class="empty-state">Belum ada kandidat.</td></tr>'}</tbody></table></div>`;
}

export function openConvertForm(candidate){
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
  const now = new Date();
  const suggestedCode = 'EMP' + String(Date.now()).slice(-6);

  openModal(`
    <h3>Konversi Kandidat ke Karyawan</h3>
    <div style="background:#E9F5EE;padding:12px;border-radius:8px;font-size:13px;margin-bottom:16px;">
      <b>${escapeHtml(candidate.full_name)}</b><br>${escapeHtml(candidate.email || candidate.phone || '-')}
    </div>
    <div class="field"><label>Kode Karyawan</label><input id="cv-code" value="${escapeHtml(suggestedCode)}" maxlength="40"></div>
    <div class="field"><label>Nama Lengkap</label><input id="cv-name" value="${escapeHtml(candidate.full_name)}" maxlength="160"></div>
    <div class="field"><label>Email</label><input id="cv-email" value="${escapeHtml(candidate.email||'')}" maxlength="180"></div>
    <div class="field"><label>Telepon</label><input id="cv-phone" value="${escapeHtml(candidate.phone||'')}" maxlength="40"></div>
    <div class="field"><label>Departemen</label><select id="cv-dept">${deptOpts}</select></div>
    <div class="field"><label>Jabatan</label><select id="cv-pos"><option value="">- Pilih Departemen dahulu -</option></select></div>
    <div class="field"><label>Tanggal Bergabung</label><input id="cv-join" type="date" value="${now.toISOString().slice(0,10)}"></div>
    <div class="field"><label>Gaji Pokok</label><input id="cv-salary" type="text" oninput="formatNumberInput(this)" value="0"></div>
    <div class="field"><label>Status PTKP</label>
      <select id="cv-ptkp">${['TK/0','TK/1','TK/2','TK/3','K/0','K/1','K/2','K/3'].map(p=>`<option value="${p}">${p}</option>`).join('')}</select>
    </div>
    <div style="background:#FAFAF6;padding:10px 12px;border-radius:8px;font-size:12px;color:var(--text-muted);margin:12px 0;">
      ℹ️ Setelah konversi: karyawan baru dibuat + onboarding checklist otomatis dimulai.
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick='convertCandidate(${JSON.stringify(candidate.id)}, ${JSON.stringify(candidate.applicant_id||'')})'>Konversi Sekarang</button>
    </div>`);

  el('cv-dept').addEventListener('change', function(){
    const deptId = this.value;
    const filtered = CACHE.positions.filter(p => p.department_id === deptId);
    el('cv-pos').innerHTML = '<option value="">- Pilih Jabatan -</option>' + filtered.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  });
}

export async function convertCandidate(candidateId, applicantId){
  const salaryRaw = el('cv-salary').value.replace(/\./g,'');

  const empData = {
    employee_code: el('cv-code').value.trim(),
    full_name: el('cv-name').value.trim(),
    email: el('cv-email').value.trim() || null,
    phone: el('cv-phone').value.trim() || null,
    department_id: el('cv-dept').value || null,
    position_id: el('cv-pos').value || null,
    join_date: el('cv-join').value,
    basic_salary: Number(salaryRaw) || 0,
    ptkp_status: el('cv-ptkp').value,
    employment_status: 'probation'
  };

  if(!empData.employee_code || !empData.full_name){
    showToast('Kode & nama wajib diisi.', true);
    return;
  }

  const { data: newEmp, error: empErr } = await sb.from('employees').insert(empData).select().single();
  if(empErr){
    showToast('Gagal buat karyawan: ' + empErr.message, true);
    return;
  }

  const { error: candidateUpdateError } = await sb
    .from('candidates')
    .update({ converted_employee_id: newEmp.id })
    .eq('id', candidateId);

  if(candidateUpdateError){
    showToast('Karyawan berhasil dibuat, tetapi status kandidat gagal diperbarui: ' + candidateUpdateError.message, true);
    return;
  }

  if(applicantId){
    const { data: existingProfile } = await sb
      .from('profiles')
      .select('*')
      .eq('id', applicantId)
      .maybeSingle();

    if(existingProfile){
      await sb
        .from('profiles')
        .update({ employee_id: newEmp.id, role: 'employee' })
        .eq('id', applicantId);
    }
  }

  const templates = await sbAll('onboarding_templates', {eq:{is_active:true}});
  if(templates.length){
    const template = templates[0];
    const items = await sbAll('onboarding_template_items', {
      eq:{template_id: template.id},
      order:{col:'order_index'}
    });
    const { data: newOnb } = await sb
      .from('onboardings')
      .insert({
        employee_id: newEmp.id,
        template_id: template.id,
        started_date: new Date().toISOString().slice(0,10),
        status: 'in_progress'
      })
      .select()
      .single();

    if(newOnb && items.length){
      await sb.from('onboarding_items').insert(items.map(it => ({
        onboarding_id: newOnb.id,
        task_name: it.task_name,
        owner_role: it.owner_role,
        due_date: new Date(Date.now() + it.due_days * 86400000).toISOString().slice(0,10),
        is_done: false
      })));
    }
  }

  await logAudit(
    'recruitment.candidate_convert',
    'candidates',
    candidateId,
    null,
    { converted_employee_id: newEmp.id }
  );

  showToast(`✅ ${empData.full_name} berhasil dikonversi jadi karyawan!`);
  closeModal();
  renderRecruitment();
}

export function openCandidateForm(jobId){
  openModal(`<h3>Tambah Kandidat</h3>
    <div class="field"><label>Nama</label><input id="cd-name" maxlength="160"></div>
    <div class="field"><label>Email</label><input id="cd-email" maxlength="180"></div>
    <div class="field"><label>Telepon</label><input id="cd-phone" maxlength="40"></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick='saveCandidate(${JSON.stringify(jobId)})'>Simpan</button>
    </div>`);
}

export async function saveCandidate(jobId){
  const fullName = el('cd-name').value.trim();
  const email = el('cd-email').value.trim();
  const phone = el('cd-phone').value.trim();

  if(!fullName || (!email && !phone)){
    showToast('Nama dan minimal email atau telepon wajib diisi.', true);
    return;
  }

  const { data, error } = await sb
    .from('candidates')
    .insert({
      job_posting_id: jobId,
      full_name: fullName,
      email: email || null,
      phone: phone || null,
      stage: 'applied'
    })
    .select()
    .single();

  if(error){
    showToast(error.message, true);
    return;
  }

  await logAudit(
    'recruitment.candidate_create',
    'candidates',
    data?.id || null,
    null,
    { job_posting_id: jobId, stage: 'applied' }
  );

  closeModal();
  showToast('Kandidat ditambahkan.');

  const job = await sb
    .from('job_postings')
    .select('title')
    .eq('id', jobId)
    .maybeSingle();

  viewCandidates(jobId, job.data?.title || '');
}

export async function updateCandidateStage(id, stage, jobId, title){
  if(!STAGES.includes(stage)){
    showToast('Tahap kandidat tidak valid.', true);
    return;
  }

  const { data: previous } = await sb
    .from('candidates')
    .select('stage')
    .eq('id', id)
    .maybeSingle();

  const { error } = await sb
    .from('candidates')
    .update({ stage })
    .eq('id', id);

  if(error){
    showToast(error.message, true);
    return;
  }

  await logAudit(
    'recruitment.candidate_stage_update',
    'candidates',
    id,
    { stage: previous?.stage || null },
    { stage }
  );

  showToast('Tahap kandidat diperbarui.');
  viewCandidates(jobId, title);
}
