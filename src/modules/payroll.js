import { sb } from '../lib/supabase.js';
import { state, isHR } from '../state/store.js';
import { sbAll } from '../services/db.js';
import { el, escapeHtml, openModal, closeModal, showToast, statusBadge } from '../utils/dom.js';
import { fmtMoney, fmtDate } from '../utils/format.js';
import { hitungPPh21Bulanan } from '../utils/tax.js';
import { BPJS_CAP_KESEHATAN, BPJS_CAP_JP } from '../config/constants.js';

export async function renderPayroll(){
  if(!isHR()){ el('content').innerHTML='<div class="empty-state">Akses ditolak.</div>'; return; }
  const runs=await sbAll('payroll_runs',{order:{col:'created_at',asc:false}});
  const latest=runs[0];
  let summary='';
  if(latest){
    const slips=await sbAll('payslips',{eq:{payroll_run_id:latest.id}});
    const t=slips.reduce((a,s)=>{a.gross+=Number(s.total_earnings||0);a.ded+=Number(s.total_deductions||0);a.net+=Number(s.net_salary||0);return a;},{gross:0,ded:0,net:0});
    summary=`<div class="grid grid-4" style="margin-bottom:16px;">
      <div class="stat-card"><div class="stat-num">${slips.length}</div><div class="stat-label">Slip</div></div>
      <div class="stat-card"><div class="stat-num">${fmtMoney(t.gross)}</div><div class="stat-label">Gross</div></div>
      <div class="stat-card"><div class="stat-num">${fmtMoney(t.ded)}</div><div class="stat-label">Potongan</div></div>
      <div class="stat-card"><div class="stat-num">${fmtMoney(t.net)}</div><div class="stat-label">Take Home Pay</div></div>
    </div>`;
  }
  el('content').innerHTML=`<div class="toolbar">
    <span></span>
    <button class="btn btn-primary" onclick="openPayrollRunForm()">+ Buat Periode Payroll</button>
  </div>
  ${summary}
  <div class="card" style="padding:0;">
    <div style="padding:14px 16px;border-bottom:1px solid var(--border);">
      <h3 style="margin:0;font-size:15px;">Payroll</h3>
      <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">Alur: Draft → Terhitung → Review → Disetujui → Dibayar → Terkunci</div>
    </div>
    <div style="overflow:auto;"><table>
      <thead><tr><th>Periode</th><th>Cut-off</th><th>Status</th><th>Gross</th><th>Net</th><th></th></tr></thead>
      <tbody>${runs.map(r=>`<tr>
        <td><b>${String(r.period_month).padStart(2,'0')}/${r.period_year}</b></td>
        <td>${r.attendance_cutoff_start?`${fmtDate(r.attendance_cutoff_start)} — ${fmtDate(r.attendance_cutoff_end)}`:'-'}</td>
        <td>${statusBadge(r.status)}</td>
        <td>${fmtMoney(r.total_gross||0)}</td>
        <td><b>${fmtMoney(r.total_net||0)}</b></td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick='openPayrollRun(${JSON.stringify(r.id)})'>Kelola</button></td>
      </tr>`).join('')||'<tr><td colspan="6" class="empty-state">Belum ada periode payroll.</td></tr>'}</tbody>
    </table></div>
  </div>
  <div id="payslip-area" style="margin-top:16px;"></div>`;
}

export function openPayrollRunForm(run=null){
  const now=new Date();
  const year=run?.period_year||now.getFullYear();
  const month=run?.period_month||now.getMonth()+1;
  const start=run?.attendance_cutoff_start||new Date(year,month-1,1).toISOString().slice(0,10);
  const end=run?.attendance_cutoff_end||new Date(year,month,0).toISOString().slice(0,10);
  const payment=run?.payment_date||new Date(year,month,0).toISOString().slice(0,10);
  openModal(`<h3>${run?'Atur Periode Payroll':'Buat Periode Payroll'}</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Bulan</label><input id="pr-month" type="number" min="1" max="12" value="${month}" ${run?'disabled':''}></div>
      <div class="field"><label>Tahun</label><input id="pr-year" type="number" value="${year}" ${run?'disabled':''}></div>
    </div>
    <div class="field"><label>Cut-off Mulai</label><input id="pr-start" type="date" value="${start}"></div>
    <div class="field"><label>Cut-off Berakhir</label><input id="pr-end" type="date" value="${end}"></div>
    <div class="field"><label>Tanggal Pembayaran</label><input id="pr-payment" type="date" value="${payment}"></div>
    <div class="field"><label>Catatan</label><textarea id="pr-notes" rows="3">${escapeHtml(run?.notes||'')}</textarea></div>
    ${run?`<div style="background:#FAFAF6;padding:10px 12px;border-radius:8px;margin-bottom:10px;">Status: ${statusBadge(run.status)}</div>`:''}
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Batal</button>
      <button class="btn btn-primary" onclick="${run?`updatePayrollRun('${run.id}')`:'savePayrollRun()'}">${run?'Simpan':'Buat'}</button>
    </div>`);
}

export async function savePayrollRun(){
  const month=Number(el('pr-month').value);
  const year=Number(el('pr-year').value);
  const start=el('pr-start').value;
  const end=el('pr-end').value;
  const payment=el('pr-payment').value;
  const notes=el('pr-notes').value.trim();
  if(!month||!year||!start||!end){showToast('Bulan, tahun, dan cut-off wajib diisi.',true);return;}
  if(start>end){showToast('Cut-off tidak valid.',true);return;}
  const {data:existing}=await sb.from('payroll_runs').select('id').eq('period_month',month).eq('period_year',year).maybeSingle();
  if(existing){showToast('Periode payroll tersebut sudah ada.',true);return;}
  const {data,error}=await sb.from('payroll_runs').insert({
    period_month:month,period_year:year,status:'draft',
    attendance_cutoff_start:start,attendance_cutoff_end:end,
    payment_date:payment||null,notes:notes||null
  }).select().single();
  if(error){showToast(error.message,true);return;}
  await logAudit('payroll.run_create','payroll_runs',data?.id||null,null,{period_month:month,period_year:year});
  showToast('Periode payroll dibuat.');closeModal();renderPayroll();
}


export async function generatePayslips(runId){
  if(!confirm('Generate slip gaji untuk semua karyawan aktif?')) return;
  const btns = document.querySelectorAll('button');
  btns.forEach(b => b.disabled = true);
  showToast('Memproses slip gaji…');
  try {
    const [emps, components, overtimeReqs] = await Promise.all([
      sbAll('employees', {eq:{employment_status:'active'}}),
      sbAll('payroll_components'),
      sbAll('overtime_requests', {eq:{status:'approved'}})
    ]);
    if(!emps.length){ showToast('Tidak ada karyawan aktif.', true); return; }
    const earnings = components.filter(c => c.component_type === 'earning');
    const deductions = components.filter(c => c.component_type === 'deduction');
    const runs = await sbAll('payroll_runs', {eq:{id: runId}});
    const run = runs[0];
    const pMonth = run?.period_month, pYear = run?.period_year;
    const cutoffStart = run?.attendance_cutoff_start || `${pYear}-${String(pMonth).padStart(2,'0')}-01`;
    const cutoffEnd = run?.attendance_cutoff_end || new Date(Number(pYear), Number(pMonth), 0).toISOString().slice(0,10);
    const payloads = [];
    for(const e of emps){
      const details = [];
      const gajiPokok = Number(e.basic_salary) || 0;
      let totalEarn = gajiPokok;
      details.push({ name:'Gaji Pokok', amount: gajiPokok, type:'earning' });
      let totalTunjangan = 0;
      earnings.filter(x => x.name !== 'Gaji Pokok').forEach(comp => {
        const amt = comp.is_percentage ? (gajiPokok * comp.default_amount / 100) : Number(comp.default_amount);
        details.push({ name: comp.name, amount: amt, type:'earning' }); totalEarn += amt; totalTunjangan += amt;
      });
      const myOt = overtimeReqs.filter(o => {
        if(o.employee_id !== e.id) return false;
        const d = String(o.overtime_date || '').slice(0,10);
        return d >= cutoffStart && d <= cutoffEnd;
      });
      const totalLembur = myOt.reduce((s,o) => s + (Number(o.amount)||0), 0);
      if(totalLembur > 0){ details.push({ name:'Upah Lembur', amount: totalLembur, type:'earning' }); totalEarn += totalLembur; }
      const bpjsKes = Math.min(gajiPokok, BPJS_CAP_KESEHATAN) * 0.01;
      const bpjsJHT = gajiPokok * 0.02;
      const bpjsJP = Math.min(gajiPokok, BPJS_CAP_JP) * 0.01;
      const ptkpKey = e.ptkp_status || 'TK/0';
      const pph21 = hitungPPh21Bulanan(gajiPokok, totalTunjangan + totalLembur, ptkpKey);
      let totalDed = 0;
      deductions.forEach(comp => {
        let amt = 0;
        switch(comp.calc_type){
          case 'bpjs_kesehatan': amt = bpjsKes; break;
          case 'bpjs_jht': amt = bpjsJHT; break;
          case 'bpjs_jp': amt = bpjsJP; break;
          case 'pph21': amt = pph21; break;
          case 'percentage': amt = gajiPokok * comp.default_amount / 100; break;
          default: amt = Number(comp.default_amount) || 0;
        }
        amt = Math.round(amt);
        details.push({ name: comp.name, amount: amt, type:'deduction' }); totalDed += amt;
      });
      payloads.push({ payroll_run_id: runId, employee_id: e.id, basic_salary: gajiPokok, total_earnings: Math.round(totalEarn), total_deductions: Math.round(totalDed), net_salary: Math.round(totalEarn - totalDed), details });
    }
    const { error } = await sb.from('payslips').upsert(payloads, { onConflict: 'payroll_run_id,employee_id' });
    if(error){ showToast('Gagal generate: ' + error.message, true); return; }
    const payrollTotalGross = payloads.reduce((s,p)=>s+Number(p.total_earnings||0),0);
    const payrollTotalDed = payloads.reduce((s,p)=>s+Number(p.total_deductions||0),0);
    const payrollTotalNet = payloads.reduce((s,p)=>s+Number(p.net_salary||0),0);
    await sb.from('payroll_runs').update({
      status:'calculated',
      total_gross:Math.round(payrollTotalGross),
      total_deductions:Math.round(payrollTotalDed),
      total_net:Math.round(payrollTotalNet),
      generated_at:new Date().toISOString()
    }).eq('id', runId);
    showToast(`✅ ${emps.length} slip gaji berhasil dibuat.`); renderPayroll();
  } finally { btns.forEach(b => b.disabled = false); }
}

export async function viewPayslips(runId, month, year){
  const [slips, emps] = await Promise.all([ sbAll('payslips', {eq:{payroll_run_id: runId}}), sbAll('employees') ]);
  el('payslip-area').innerHTML = `<h3>Slip Gaji ${String(month).padStart(2,'0')}/${year}</h3>
    <div class="card" style="padding:0;"><table><thead><tr><th>Karyawan</th><th>Gaji Pokok</th><th>Pendapatan</th><th>Potongan</th><th>Gaji Bersih</th></tr></thead>
    <tbody>${slips.map(s=>{ const e = emps.find(x=>x.id===s.employee_id); return `<tr><td>${e?e.full_name:'-'}</td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td>${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td></tr>`; }).join('') || '<tr><td colspan="5" class="empty-state">Belum dibuat.</td></tr>'}</tbody></table></div>`;
}


export async function updatePayrollRun(runId){
  const run=await sb.from('payroll_runs').select('*').eq('id',runId).maybeSingle();
  if(run.error||!run.data){showToast('Periode tidak ditemukan.',true);return;}
  if(!['draft','calculated','under_review'].includes(run.data.status)){showToast('Periode sudah final dan tidak dapat diedit.',true);return;}
  const start=el('pr-start').value,end=el('pr-end').value,payment=el('pr-payment').value,notes=el('pr-notes').value.trim();
  if(start&&end&&start>end){showToast('Cut-off tidak valid.',true);return;}
  const {error}=await sb.from('payroll_runs').update({attendance_cutoff_start:start||null,attendance_cutoff_end:end||null,payment_date:payment||null,notes:notes||null}).eq('id',runId);
  if(error){showToast(error.message,true);return;}
  await logAudit('payroll.run_update','payroll_runs',runId,null,{attendance_cutoff_start:start,attendance_cutoff_end:end,payment_date:payment});
  closeModal();showToast('Periode diperbarui.');renderPayroll();
}

function paymentFileName(run){
  return 'PAYROLL_' + run.period_year + '-' + String(run.period_month).padStart(2,'0') + '_PAYMENT.csv';
}

function csvCell(value){
  return '"' + String(value ?? '').replace(/"/g, '""') + '"';
}

export async function generatePaymentFile(runId){
  const {data:run,error:runError}=await sb.from('payroll_runs').select('*').eq('id',runId).maybeSingle();
  if(runError||!run){showToast('Periode payroll tidak ditemukan.',true);return;}
  if(!['approved','paid','locked'].includes(run.status)){showToast('File pembayaran baru dapat dibuat setelah payroll disetujui.',true);return;}
  const [slips,emps]=await Promise.all([sbAll('payslips',{eq:{payroll_run_id:runId}}),sbAll('employees')]);
  if(!slips.length){showToast('Belum ada slip payroll untuk dibuatkan file pembayaran.',true);return;}
  const missing=slips.map(s=>emps.find(e=>e.id===s.employee_id)).filter(e=>!e||!e.bank_name||!e.bank_account_number);
  if(missing.length){showToast('Ada '+missing.length+' karyawan yang belum memiliki bank/rekening. Lengkapi data rekening terlebih dahulu.',true);return;}
  const paymentDate=run.payment_date||new Date().toISOString().slice(0,10);
  const periodRef='PAYROLL-'+run.period_year+'-'+String(run.period_month).padStart(2,'0');
  const headers=['employee_code','employee_name','bank_name','bank_account_number','amount','payment_date','reference','description'];
  const rows=slips.map(s=>{
    const e=emps.find(x=>x.id===s.employee_id)||{};
    return [e.employee_code||'',e.full_name||'',e.bank_name||'',e.bank_account_number||'',Math.round(Number(s.net_salary)||0),paymentDate,periodRef+'-'+(e.employee_code||s.employee_id),'Gaji '+String(run.period_month).padStart(2,'0')+'/'+run.period_year].map(csvCell).join(',');
  });
  const csv='\uFEFF'+[headers.map(csvCell).join(','),...rows].join('\r\n');
  const fileName=paymentFileName(run);
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  const {error}=await sb.from('payroll_runs').update({payment_status:'generated',payment_file_name:fileName,payment_file_generated_at:new Date().toISOString(),payment_file_generated_by:state.currentUser?.id||null}).eq('id',runId);
  if(error){showToast('File berhasil diunduh, tetapi metadata pembayaran gagal disimpan: '+error.message,true);return;}
  await logAudit('payroll.payment_file_generate','payroll_runs',runId,null,{file_name:fileName,row_count:rows.length,payment_date:paymentDate});
  showToast('File pembayaran '+fileName+' berhasil dibuat.');
  openPayrollRun(runId);
}

export async function markPaymentUploaded(runId){
  const {data:run,error}=await sb.from('payroll_runs').select('*').eq('id',runId).maybeSingle();
  if(error||!run){showToast('Periode payroll tidak ditemukan.',true);return;}
  if(run.status!=='approved'){showToast('Payroll harus sudah disetujui.',true);return;}
  if(!['generated','uploaded'].includes(run.payment_status)){showToast('Buat file pembayaran terlebih dahulu.',true);return;}
  const reference=prompt('Nomor batch / reference dari bank (opsional):',run.payment_reference||'');
  if(reference===null)return;
  const {error:updateError}=await sb.from('payroll_runs').update({payment_status:'uploaded',payment_uploaded_at:new Date().toISOString(),payment_uploaded_by:state.currentUser?.id||null,payment_reference:reference.trim()||null}).eq('id',runId);
  if(updateError){showToast('Gagal mencatat upload ke bank: '+updateError.message,true);return;}
  await logAudit('payroll.payment_file_uploaded','payroll_runs',runId,{payment_status:run.payment_status},{payment_status:'uploaded',payment_reference:reference.trim()||null});
  showToast('Status file pembayaran dicatat sebagai terunggah ke bank.');
  openPayrollRun(runId);
}

export async function openPayrollRun(runId){
  const run=await sb.from('payroll_runs').select('*').eq('id',runId).maybeSingle();
  if(run.error||!run.data){showToast('Periode tidak ditemukan.',true);return;}
  const r=run.data;
  const [slips,emps]=await Promise.all([sbAll('payslips',{eq:{payroll_run_id:runId}}),sbAll('employees')]);
  const missing=emps.filter(e=>e.employment_status==='active'&&(!e.bank_name||!e.bank_account_number)).length;
  const canReview=r.status==='calculated',canApprove=r.status==='under_review',canPay=r.status==='approved',canLock=r.status==='paid';
  const totals=slips.reduce((a,s)=>{a.g+=Number(s.total_earnings||0);a.d+=Number(s.total_deductions||0);a.n+=Number(s.net_salary||0);return a;},{g:0,d:0,n:0});
  el('payslip-area').innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Payroll</div><h3 style="margin:3px 0;">${String(r.period_month).padStart(2,'0')}/${r.period_year}</h3><div style="font-size:12px;color:var(--text-muted);">Cut-off: ${r.attendance_cutoff_start||'-'} — ${r.attendance_cutoff_end||'-'} · Pembayaran: ${r.payment_date||'-'}</div></div>${statusBadge(r.status)}</div>
    <div class="grid grid-4" style="margin:14px 0;"><div class="stat-card"><div class="stat-num">${slips.length}</div><div class="stat-label">Slip</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.g)}</div><div class="stat-label">Gross</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.d)}</div><div class="stat-label">Potongan</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.n)}</div><div class="stat-label">Take Home Pay</div></div></div>
    ${missing?`<div style="background:#FBF1DE;color:#7A5A1A;padding:10px 12px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">⚠ ${missing} karyawan aktif belum punya bank/rekening.</div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${['draft','calculated'].includes(r.status)?`<button class="btn btn-primary btn-sm" onclick='generatePayslips(${JSON.stringify(runId)})'>↻ Hitung / Generate</button>`:''}${canReview?`<button class="btn btn-outline btn-sm" onclick='submitPayrollReview(${JSON.stringify(runId)})'>Ajukan Review</button>`:''}${canApprove?`<button class="btn btn-primary btn-sm" onclick='approvePayroll(${JSON.stringify(runId)})'>✓ Approve</button>`:''}${canPay?`<button class="btn btn-primary btn-sm" onclick='markPayrollPaid(${JSON.stringify(runId)})'>✓ Tandai Dibayar</button>`:''}${canLock?`<button class="btn btn-outline btn-sm" onclick='lockPayroll(${JSON.stringify(runId)})'>🔒 Kunci</button>`:''}${['draft','calculated','under_review'].includes(r.status)?`<button class="btn btn-outline btn-sm" onclick='openPayrollRunForm(${JSON.stringify(r)})'>Pengaturan</button>`:''}</div>
    <div style="overflow:auto;"><table><thead><tr><th>Karyawan</th><th>Bank</th><th>Gaji Pokok</th><th>Gross</th><th>Potongan</th><th>Net</th><th></th></tr></thead><tbody>${slips.map(s=>{const e=emps.find(x=>x.id===s.employee_id)||{};return `<tr><td>${escapeHtml(e.full_name||'-')}<div style="font-size:11px;color:var(--text-muted);">${escapeHtml(e.employee_code||'-')}</div></td><td>${escapeHtml(e.bank_name||'-')}<div style="font-size:11px;color:var(--text-muted);">${escapeHtml(e.bank_account_number||'-')}</div></td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td>${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td><td><button class="btn btn-outline btn-sm" onclick='showPayslipDetail(${JSON.stringify(s)},${JSON.stringify(String(r.period_month).padStart(2,'0')+'/'+r.period_year)},${JSON.stringify(e)})'>Detail</button></td></tr>`;}).join('')||'<tr><td colspan="7" class="empty-state">Belum ada slip.</td></tr>'}</tbody></table></div>
    </div>`;
}

export async function submitPayrollReview(runId){
  const {data:run}=await sb.from('payroll_runs').select('status').eq('id',runId).maybeSingle();
  const slips=await sbAll('payslips',{eq:{payroll_run_id:runId}});
  if(run?.status!=='calculated'||!slips.length){showToast('Payroll harus sudah dihitung.',true);return;}
  await sb.from('payroll_runs').update({status:'under_review',reviewed_by:state.currentUser?.id||null,reviewed_at:new Date().toISOString()}).eq('id',runId);
  await logAudit('payroll.submit_review','payroll_runs',runId,{status:'calculated'},{status:'under_review'});
  showToast('Payroll masuk tahap review.');openPayrollRun(runId);
}

export async function approvePayroll(runId){
  const {data:run}=await sb.from('payroll_runs').select('status').eq('id',runId).maybeSingle();
  if(run?.status!=='under_review'){showToast('Payroll belum siap di-approve.',true);return;}
  if(!confirm('Approve payroll ini? Setelah disetujui, perubahan harus melalui koreksi payroll.'))return;
  await sb.from('payroll_runs').update({status:'approved',approved_by:state.currentUser?.id||null,approved_at:new Date().toISOString()}).eq('id',runId);
  await logAudit('payroll.approve','payroll_runs',runId,{status:'under_review'},{status:'approved'});
  showToast('Payroll disetujui.');openPayrollRun(runId);
}

export async function markPayrollPaid(runId){
  const {data:run}=await sb.from('payroll_runs').select('*').eq('id',runId).maybeSingle();
  if(run?.status!=='approved'){showToast('Payroll harus disetujui terlebih dahulu.',true);return;}
  if(!confirm('Tandai payroll sudah dibayar? Ini hanya mencatat status; belum terhubung ke bank.'))return;
  const payment=run.payment_date||new Date().toISOString().slice(0,10);
  await sb.from('payroll_runs').update({status:'paid',payment_date:payment,paid_at:new Date().toISOString()}).eq('id',runId);
  await logAudit('payroll.mark_paid','payroll_runs',runId,{status:'approved'},{status:'paid',payment_date:payment});
  showToast('Payroll ditandai sudah dibayar.');openPayrollRun(runId);
}

export async function lockPayroll(runId){
  const {data:run}=await sb.from('payroll_runs').select('status').eq('id',runId).maybeSingle();
  if(run?.status!=='paid'){showToast('Payroll harus sudah dibayar.',true);return;}
  if(!confirm('Kunci payroll ini? Setelah dikunci, periode dianggap final.'))return;
  await sb.from('payroll_runs').update({status:'locked',locked_at:new Date().toISOString()}).eq('id',runId);
  await logAudit('payroll.lock','payroll_runs',runId,{status:'paid'},{status:'locked'});
  showToast('Payroll dikunci.');openPayrollRun(runId);
}

export async function renderMyPayslip(){
  const c = el('content');
  const ME = state.me;
  if(!ME){ c.innerHTML = '<div class="empty-state">Akun belum ditautkan.</div>'; return; }
  const slips = await sbAll('payslips', {eq:{employee_id: ME.id}, order:{col:'created_at', asc:false}});
  const runs = await sbAll('payroll_runs');
  c.innerHTML = `<div class="card" style="padding:0;"><table><thead><tr><th>Periode</th><th>Gaji Pokok</th><th>Pendapatan</th><th>Potongan</th><th>Gaji Bersih</th><th></th></tr></thead>
    <tbody>${slips.map(s=>{
      const run = runs.find(r=>r.id===s.payroll_run_id);
      const periode = run ? String(run.period_month).padStart(2,'0')+'/'+run.period_year : '-';
      return `<tr><td><b>${periode}</b></td><td>${fmtMoney(s.basic_salary)}</td><td>${fmtMoney(s.total_earnings)}</td><td>${fmtMoney(s.total_deductions)}</td><td><b>${fmtMoney(s.net_salary)}</b></td>
        <td style="text-align:right;"><button class="btn btn-outline btn-sm" onclick="printPayslip('${s.id}')">🖨️ Cetak</button></td></tr>`;
    }).join('') || '<tr><td colspan="6" class="empty-state">Belum ada slip.</td></tr>'}</tbody></table></div>`;
}

export async function printPayslip(payslipId){
  const slips = await sbAll('payslips', { eq:{ id: payslipId } });
  const slip = slips[0];
  if(!slip){ showToast('Slip tidak ditemukan.', true); return; }
  const runs = await sbAll('payroll_runs', { eq:{ id: slip.payroll_run_id } });
  const run = runs[0];
  const periode = run ? String(run.period_month).padStart(2,'0')+'/'+run.period_year : '-';
  const emps = await sbAll('employees', { select:'*, departments(name), positions(name)', eq:{ id: slip.employee_id } });
  const emp = emps[0] || { full_name:'-', employee_code:'-', departments:{name:'-'}, positions:{name:'-'} };
  const details = Array.isArray(slip.details) ? slip.details : [];
  const earningRows = details.filter(d=>d.type==='earning').map(d => `<tr><td>${escapeHtml(d.name)}</td><td style="text-align:right;">${fmtMoney(d.amount)}</td></tr>`).join('') || `<tr><td>Gaji Pokok</td><td style="text-align:right;">${fmtMoney(slip.basic_salary)}</td></tr>`;
  const deductionRows = details.filter(d=>d.type==='deduction').map(d => `<tr><td>${escapeHtml(d.name)}</td><td style="text-align:right;">- ${fmtMoney(d.amount)}</td></tr>`).join('') || `<tr><td>Tidak ada potongan</td><td style="text-align:right;">Rp 0</td></tr>`;

  const html = `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Slip Gaji — ${periode}</title>
  <style>*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif;}body{margin:0;padding:40px;background:#fff;color:#1C2321;}
  .payslip{max-width:700px;margin:0 auto;border:1px solid #ccc;padding:32px;}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2F8F63;padding-bottom:16px;margin-bottom:24px;}
  .company{font-size:22px;font-weight:800;color:#2F8F63;}.subtitle{font-size:13px;color:#666;margin-top:2px;}
  .title{text-align:right;}.title h1{margin:0;font-size:20px;}.title .period{font-size:14px;color:#444;margin-top:4px;}
  .info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px;font-size:13px;}
  .info-grid table{width:100%;border-collapse:collapse;}.info-grid td{padding:4px 0;vertical-align:top;}
  .info-grid td:first-child{color:#666;width:120px;}.info-grid td:last-child{font-weight:600;}
  .section-title{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#2F8F63;border-bottom:1px solid #e0e0e0;padding-bottom:6px;margin:20px 0 10px;}
  table.items{width:100%;border-collapse:collapse;font-size:13px;}table.items td{padding:8px 4px;border-bottom:1px dashed #e0e0e0;}
  table.items tr:last-child td{border-bottom:none;}
  .total-box{margin-top:24px;padding:16px;background:#E9F5EE;border-radius:8px;display:flex;justify-content:space-between;align-items:center;}
  .total-box .label{font-size:14px;color:#256F4D;font-weight:600;}.total-box .amount{font-size:22px;font-weight:800;color:#2F8F63;}
  .signature{display:flex;justify-content:space-between;margin-top:50px;font-size:13px;}
  .signature div{width:40%;text-align:center;}.signature .line{border-top:1px solid #333;margin-bottom:6px;margin-top:60px;}
  .footer{margin-top:40px;font-size:11px;color:#888;text-align:center;border-top:1px solid #e0e0e0;padding-top:16px;}
  @media print{body{padding:0;}.payslip{border:none;padding:20px;max-width:100%;}.no-print{display:none!important;}}
  </style></head><body>
  <div class="payslip">
    <div class="header">
      <div><div class="company">FA TECH</div><div class="subtitle">Sistem Informasi SDM Terpadu</div></div>
      <div class="title"><h1>SLIP GAJI</h1><div class="period">Periode ${periode}</div></div>
    </div>
    <div class="info-grid">
      <table>
        <tr><td>Kode</td><td>: ${escapeHtml(emp.employee_code||'-')}</td></tr>
        <tr><td>Nama</td><td>: ${escapeHtml(emp.full_name)}</td></tr>
        <tr><td>Jabatan</td><td>: ${escapeHtml(emp.positions?.name||'-')}</td></tr>
        <tr><td>Departemen</td><td>: ${escapeHtml(emp.departments?.name||'-')}</td></tr>
      </table>
      <table>
        <tr><td>Bank</td><td>: ${escapeHtml(emp.bank_name||'-')}</td></tr>
        <tr><td>No. Rekening</td><td>: ${escapeHtml(emp.bank_account_number||'-')}</td></tr>
        <tr><td>Tanggal Cetak</td><td>: ${new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</td></tr>
        <tr><td>Status</td><td>: ${run?.status||'-'}</td></tr>
      </table>
    </div>
    <div class="section-title">PENDAPATAN</div>
    <table class="items">${earningRows}
      <tr style="background:#f9f9f9;"><td><b>Total Pendapatan</b></td><td style="text-align:right;"><b>${fmtMoney(slip.total_earnings)}</b></td></tr>
    </table>
    <div class="section-title">POTONGAN</div>
    <table class="items">${deductionRows}
      <tr style="background:#f9f9f9;"><td><b>Total Potongan</b></td><td style="text-align:right;"><b>- ${fmtMoney(slip.total_deductions)}</b></td></tr>
    </table>
    <div class="total-box"><div class="label">GAJI BERSIH (Take Home Pay)</div><div class="amount">${fmtMoney(slip.net_salary)}</div></div>
    <div class="signature">
      <div><div class="line"></div><div>Penerima</div><div style="color:#666;font-size:11px;">${escapeHtml(emp.full_name)}</div></div>
      <div><div class="line"></div><div>HR Manager</div><div style="color:#666;font-size:11px;">&nbsp;</div></div>
    </div>
    <div class="footer">Dicetak otomatis dari My HRIS pada ${new Date().toLocaleString('id-ID')}.</div>
  </div>
  <div class="no-print" style="text-align:center;margin-top:20px;">
    <button onclick="window.print()" style="padding:10px 20px;background:#2F8F63;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">🖨️ Cetak Sekarang</button>
    <button onclick="window.close()" style="padding:10px 20px;background:#eee;border:none;border-radius:6px;font-weight:600;cursor:pointer;margin-left:8px;">Tutup</button>
  </div>
  <script>window.addEventListener('load', () => setTimeout(()=>window.print(), 300));<\/script>
  </body></html>`;
  const w = window.open('', '_blank', 'width=900,height=700');
  if(!w){ showToast('Popup diblokir.', true); return; }
  w.document.open(); w.document.write(html); w.document.close();
}

export function showPayslipDetail(slip, periode, emp){
  const details = Array.isArray(slip.details) ? slip.details : [];
  const earningsRows = details.filter(d => d.type === 'earning').map(d => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="font-weight:600;">${fmtMoney(d.amount)}</span></div>`).join('') || `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;"><span>Gaji Pokok</span><span style="font-weight:600;">${fmtMoney(slip.basic_salary)}</span></div>`;
  const deductionsRows = details.filter(d => d.type === 'deduction').map(d => `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="font-weight:600;color:var(--danger);">− ${fmtMoney(d.amount)}</span></div>`).join('') || `<div style="padding:8px 0;font-size:13px;color:var(--text-muted);text-align:center;">Tidak ada potongan</div>`;
  openModal(`
    <h3 style="margin:0 0 4px;">Detail Slip Gaji</h3>
    <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 16px;">${escapeHtml(emp.full_name)} • Periode ${periode}</p>
    <div style="background:#E9F5EE;border-radius:8px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;"><div style="font-size:13px;color:#256F4D;font-weight:600;">GAJI BERSIH</div><div style="font-family:'Manrope';font-weight:800;font-size:22px;color:var(--accent-dark);">${fmtMoney(slip.net_salary)}</div></div>
    <div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--accent-dark);padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">💰 Pendapatan</div>${earningsRows}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;background:#FAFAF6;margin-top:4px;padding-left:8px;padding-right:8px;border-radius:4px;"><span>Total Pendapatan</span><span>${fmtMoney(slip.total_earnings)}</span></div></div>
    <div style="margin-bottom:14px;"><div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--danger);padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">📉 Potongan</div>${deductionsRows}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;background:#FBEAE6;margin-top:4px;padding-left:8px;padding-right:8px;border-radius:4px;color:var(--danger);"><span>Total Potongan</span><span>− ${fmtMoney(slip.total_deductions)}</span></div></div>
    <div style="display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button></div>`);
}
