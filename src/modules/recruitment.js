import { sb } from '../lib/supabase.js';
import { CACHE } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { logAudit } from '../services/audit.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { formatNumberInput } from '../utils/format.js';
import { STAGES, STAGE_LABELS } from '../config/constants.js';

const WORK_SYSTEM_LABELS = {
  on_site: 'On-site',
  hybrid: 'Hybrid',
  remote: 'Remote'
};

function formatMoney(value){
  const n = Number(value);
  if(!Number.isFinite(n) || n <= 0) return '-';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatMoneyInput(value){
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString('id-ID') : '';
}

function parseMoneyInput(value){
  const raw = String(value || '').replace(/\D/g, '');
  if(!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatListText(value){
  return escapeHtml(value || '-').replace(/\n/g, '<br>');
}

function jobSummary(j){
  const salary = j.salary_min || j.salary_max
    ? `${formatMoney(j.salary_min)}${j.salary_max ? ' — ' + formatMoney(j.salary_max) : ''}`
    : 'Gaji dibicarakan';
  return {
    placement: j.placement || 'Tidak disebutkan',
    workSystem: WORK_SYSTEM_LABELS[j.work_system] || j.work_system || 'Tidak disebutkan',
    salary
  };
}

export async function renderRecruitment(){
  const c = el('content');
  const [jobs, depts] = await Promise.all([
    sbAll('job_postings', {order:{col:'opened_date', asc:false}}),
    sbAll('departments')
  ]);

  c.innerHTML = `<div class="toolbar" style="gap:8px;flex-wrap:wrap;">
      <span style="flex:1;"></span>
      <button class="btn btn-outline" onclick="openCareerPage()">↗ Buka Halaman Karir</button>
      <button class="btn btn-outline" onclick="copyCareerPageLink()">🔗 Salin Link Halaman Karir</button>
      <button class="btn btn-primary" onclick="openJobForm()">+ Buka Lowongan</button>
    </div>
    <div class="grid grid-2">${jobs.map(j=>{
      const summary = jobSummary(j);
      return `
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:start;gap:12px;">
          <div>
            <b style="font-size:15px;">${escapeHtml(j.title)}</b>
            <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">${escapeHtml(depts.find(d=>d.id===j.department_id)?.name||'Umum')}</div>
          </div>
          ${statusBadge(j.status)}
        </div>

        <p style="font-size:13px;color:var(--text-muted);line-height:1.5;">${escapeHtml(j.description||'')}</p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:12px 0;">
          <div style="background:#FAFAF6;border-radius:8px;padding:9px;">
            <div style="font-size:11px;color:var(--text-muted);">Penempatan</div>
            <b style="font-size:12.5px;">${escapeHtml(summary.placement)}</b>
          </div>
          <div style="background:#FAFAF6;border-radius:8px;padding:9px;">
            <div style="font-size:11px;color:var(--text-muted);">Sistem Kerja</div>
            <b style="font-size:12.5px;">${escapeHtml(summary.workSystem)}</b>
          </div>
          <div style="background:#FAFAF6;border-radius:8px;padding:9px;grid-column:1/-1;">
            <div style="font-size:11px;color:var(--text-muted);">Kisaran Gaji</div>
            <b style="font-size:12.5px;">${escapeHtml(summary.salary)}</b>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick='viewJobDetails(${JSON.stringify(j.id)})'>Detail</button>
          <button class="btn btn-outline btn-sm" onclick='editJobForm(${JSON.stringify(j.id)})'>Edit</button>
          <button class="btn btn-outline btn-sm" onclick='viewCandidates(${JSON.stringify(j.id)}, ${JSON.stringify(j.title)})'>Lihat Kandidat</button>
          ${j.status==='open'
            ? `<button class="btn btn-outline btn-sm" onclick='closeJobPosting(${JSON.stringify(j.id)})'>Tutup Lowongan</button>`
            : `<button class="btn btn-outline btn-sm" onclick='reopenJobPosting(${JSON.stringify(j.id)})'>Buka Kembali</button>`}
          <button class="btn btn-danger btn-sm" onclick='deleteJobPosting(${JSON.stringify(j.id)})'>Arsipkan</button>
        </div>
      </div>`;
    }).join('') || '<div class="empty-state">Belum ada lowongan dibuka.</div>'}</div>
    <div id="candidate-area" style="margin-top:18px;"></div>`;
}

export function openCareerPage(){
  const url = new URL('/career/', window.location.origin).href;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function copyCareerPageLink(){
  const url = new URL('/career/', window.location.origin).href;
  navigator.clipboard.writeText(url).then(()=>{
    showToast('Link halaman karir disalin: '+url);
  }).catch(()=>{
    prompt('Salin link halaman karir ini secara manual:', url);
  });
}

export function viewJobDetails(jobId){
  const job = CACHE.jobPostings?.find(j=>j.id===jobId);
  if(!job){
    showToast('Detail lowongan belum tersedia.', true);
    return;
  }

  const dept = CACHE.departments.find(d=>d.id===job.department_id)?.name || 'Umum';
  const summary = jobSummary(job);

  openModal(`
    <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
      <div>
        <div style="font-size:12px;color:var(--text-muted);">${escapeHtml(dept)}</div>
        <h3 style="margin:3px 0 0;">${escapeHtml(job.title)}</h3>
      </div>
      ${statusBadge(job.status)}
    </div>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0;">
      <div class="card" style="padding:10px;background:#FAFAF6;">
        <div style="font-size:11px;color:var(--text-muted);">Penempatan</div>
        <b style="font-size:12px;">${escapeHtml(summary.placement)}</b>
      </div>
      <div class="card" style="padding:10px;background:#FAFAF6;">
        <div style="font-size:11px;color:var(--text-muted);">Sistem Kerja</div>
        <b style="font-size:12px;">${escapeHtml(summary.workSystem)}</b>
      </div>
      <div class="card" style="padding:10px;background:#FAFAF6;">
        <div style="font-size:11px;color:var(--text-muted);">Gaji</div>
        <b style="font-size:12px;">${escapeHtml(summary.salary)}</b>
      </div>
    </div>

    <div style="display:grid;gap:14px;">
      <section>
        <h4 style="margin:0 0 6px;">Ringkasan</h4>
        <div style="font-size:13px;line-height:1.6;white-space:pre-line;">${formatListText(job.description)}</div>
      </section>
      <section>
        <h4 style="margin:0 0 6px;">Jobdesk / Tanggung Jawab</h4>
        <div style="font-size:13px;line-height:1.6;">${formatListText(job.responsibilities)}</div>
      </section>
      <section>
        <h4 style="margin:0 0 6px;">Persyaratan</h4>
        <div style="font-size:13px;line-height:1.6;">${formatListText(job.requirements)}</div>
      </section>
    </div>

    <div style="display:flex;justify-content:flex-end;margin-top:18px;">
      <button class="btn btn-outline" onclick="closeModal()">Tutup</button>
    </div>
  `);
}

export async function closeJobPosting(jobId){
  const { error } = await sb.from('job_postings').update({ status: 'closed' }).eq('id', jobId);
  if(error){ showToast(error.message, true); return; }

  await logAudit('recruitment.job_close','job_postings',jobId,{status:'open'},{status:'closed'});
  showToast('Lowongan ditutup.');
  renderRecruitment();
}

export async function reopenJobPosting(jobId){
  const { error } = await sb.from('job_postings').update({ status: 'open' }).eq('id', jobId);
  if(error){ showToast(error.message, true); return; }

  await logAudit('recruitment.job_reopen','job_postings',jobId,{status:'closed'},{status:'open'});
  showToast('Lowongan dibuka kembali.');
  renderRecruitment();
}

export async function deleteJobPosting(jobId){
  if(!confirm('Arsipkan lowongan ini? Data kandidat tetap disimpan untuk histori rekrutmen.')) return;

  const { data, error } = await sb.rpc('soft_delete_master', { p_table_name:'job_postings', p_id:jobId });
  if(error){ showToast('Gagal mengarsipkan lowongan: ' + error.message, true); return; }
  if(data !== true){ showToast('Lowongan tidak dapat diarsipkan.', true); return; }

  await logAudit('recruitment.job_archive','job_postings',jobId,null,{deleted_at:'soft_deleted'});
  showToast('Lowongan diarsipkan. Data kandidat tetap tersimpan.');
  renderRecruitment();
}

function jobFormHtml(job=null){
  const isEdit = !!job;
  const deptOpts = CACHE.departments.map(d=>`<option value="${d.id}" ${job?.department_id===d.id?'selected':''}>${escapeHtml(d.name)}</option>`).join('');

  return `
    <h3>${isEdit ? 'Edit Lowongan' : 'Buka Lowongan'}</h3>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Posisi</label><input id="j-title" maxlength="160" value="${escapeHtml(job?.title||'')}"></div>
      <div class="field"><label>Departemen</label><select id="j-dept">${deptOpts}</select></div>
    </div>

    <div class="field"><label>Ringkasan Posisi</label><textarea id="j-desc" rows="3" maxlength="5000" placeholder="Gambaran singkat posisi...">${escapeHtml(job?.description||'')}</textarea></div>
    <div class="field"><label>Jobdesk / Tanggung Jawab</label><textarea id="j-responsibilities" rows="5" maxlength="8000" placeholder="Tulis satu poin per baris...">${escapeHtml(job?.responsibilities||'')}</textarea></div>
    <div class="field"><label>Persyaratan</label><textarea id="j-requirements" rows="5" maxlength="8000" placeholder="Pendidikan, pengalaman, skill, sertifikasi, dll...${'\n'}Satu poin per baris.">${escapeHtml(job?.requirements||'')}</textarea></div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">
      <div class="field"><label>Penempatan</label><input id="j-placement" maxlength="180" placeholder="Contoh: Jakarta Selatan" value="${escapeHtml(job?.placement||'')}"></div>
      <div class="field"><label>Sistem Kerja</label>
        <select id="j-work-system">
          <option value="on_site" ${job?.work_system==='on_site'?'selected':''}>On-site</option>
          <option value="hybrid" ${job?.work_system==='hybrid'?'selected':''}>Hybrid</option>
          <option value="remote" ${job?.work_system==='remote'?'selected':''}>Remote</option>
        </select>
      </div>
      <div class="field"><label>Gaji Minimum</label><input id="j-salary-min" inputmode="numeric" oninput="formatNumberInput(this)" placeholder="Contoh: 5.000.000" value="${formatMoneyInput(job?.salary_min)}"></div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Gaji Maksimum</label><input id="j-salary-max" inputmode="numeric" oninput="formatNumberInput(this)" placeholder="Contoh: 7.000.000" value="${formatMoneyInput(job?.salary_max)}"></div>
      <div class="field">
        <label>Catatan Gaji</label>
        <div style="font-size:11.5px;color:var(--text-muted);padding:10px 0;">Kosongkan kedua nominal bila gaji ingin ditampilkan sebagai "Gaji dibicarakan".</div>
      </div>
    </div>

    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="${isEdit ? `updateJob('${job.id}')` : 'saveJob()'}">${isEdit ? 'Simpan Perubahan' : 'Publikasikan Lowongan'}</button>
    </div>`;
}

export function openJobForm(){
  openModal(jobFormHtml());
}

export async function editJobForm(jobId){
  const job = CACHE.jobPostings?.find(j=>j.id===jobId);
  if(!job){
    showToast('Data lowongan tidak ditemukan.', true);
    return;
  }
  openModal(jobFormHtml(job));
}

function collectJobForm(){
  const title = el('j-title').value.trim();
  const description = el('j-desc').value.trim();
  const responsibilities = el('j-responsibilities').value.trim();
  const requirements = el('j-requirements').value.trim();
  const placement = el('j-placement').value.trim();
  const workSystem = el('j-work-system').value;
  const salaryMin = parseMoneyInput(el('j-salary-min').value);
  const salaryMax = parseMoneyInput(el('j-salary-max').value);

  if(!title){
    showToast('Judul posisi wajib diisi.', true);
    return null;
  }

  if(salaryMin !== null && salaryMax !== null && salaryMax < salaryMin){
    showToast('Gaji maksimum tidak boleh lebih kecil dari minimum.', true);
    return null;
  }

  return {
    title,
    department_id: el('j-dept').value || null,
    description: description || null,
    responsibilities: responsibilities || null,
    requirements: requirements || null,
    placement: placement || null,
    work_system: workSystem,
    salary_min: salaryMin,
    salary_max: salaryMax
  };
}

export async function saveJob(){
  const payload = collectJobForm();
  if(!payload) return;

  const { data, error } = await sb.from('job_postings').insert({
    ...payload,
    status: 'open'
  }).select().single();

  if(error){
    showToast(error.message, true);
    return;
  }

  await logAudit('recruitment.job_create','job_postings',data?.id||null,null,payload);
  showToast('Lowongan berhasil dipublikasikan.');
  closeModal();
  await renderRecruitment();
}

export async function updateJob(jobId){
  const payload = collectJobForm();
  if(!payload) return;

  const { data: previous } = await sb.from('job_postings').select('*').eq('id',jobId).maybeSingle();
  const { error } = await sb.from('job_postings').update(payload).eq('id',jobId);

  if(error){
    showToast(error.message, true);
    return;
  }

  await logAudit('recruitment.job_update','job_postings',jobId,previous||null,payload);
  showToast('Informasi lowongan diperbarui.');
  closeModal();
  await renderRecruitment();
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
      <td>
        <select onchange='updateCandidateStage(${JSON.stringify(c.id)}, this.value, ${JSON.stringify(jobId)}, ${JSON.stringify(title)})'>
          ${STAGES.map(s=>`<option value="${s}" ${c.stage===s?'selected':''}>${escapeHtml(STAGE_LABELS[s]||s)}</option>`).join('')}
        </select>
      </td>
      <td style="text-align:right;">
        ${c.stage === 'job_offer' && !c.converted_employee_id
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

  await logAudit('recruitment.candidate_convert','candidates',candidateId,null,{converted_employee_id:newEmp.id});
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

  const { data: candidateId, error } = await sb.rpc('create_recruitment_candidate', {
    p_job_posting_id: jobId,
    p_full_name: fullName,
    p_email: email || null,
    p_phone: phone || null
  });

  if(error){
    showToast(error.message, true);
    return;
  }

  closeModal();
  showToast('Kandidat ditambahkan.');

  const job = await sb.from('job_postings').select('title').eq('id', jobId).maybeSingle();
  viewCandidates(jobId, job.data?.title || '');
}

export async function updateCandidateStage(id, stage, jobId, title){
  if(!STAGES.includes(stage)){
    showToast('Tahap kandidat tidak valid.', true);
    return;
  }

  const { error } = await sb.rpc('update_candidate_stage', {
    p_candidate_id: id,
    p_stage: stage,
    p_notes: null
  });

  if(error){
    showToast(error.message, true);
    return;
  }

  showToast('Tahap kandidat diperbarui.');
  viewCandidates(jobId, title);
}
