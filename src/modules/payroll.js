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
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div class="field"><label>Hari Kerja Payroll / Bulan</label><input id="pr-working-days" type="number" min="1" max="31" step="0.5" value="${run?.working_days_per_month||22}"></div>
      <div class="field"><label>Potong Absensi Alpha/Tidak Hadir</label>
        <select id="pr-deduct-absence">
          <option value="false" ${run?.deduct_attendance_absence?'':'selected'}>Tidak</option>
          <option value="true" ${run?.deduct_attendance_absence?'selected':''}>Ya</option>
        </select>
      </div>
    </div>
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
  const workingDays=Number(el('pr-working-days').value)||22;
  const deductAbsence=el('pr-deduct-absence').value==='true';
  const notes=el('pr-notes').value.trim();
  if(!month||!year||!start||!end){showToast('Bulan, tahun, dan cut-off wajib diisi.',true);return;}
  if(start>end){showToast('Cut-off tidak valid.',true);return;}
  const {data:existing}=await sb.from('payroll_runs').select('id').eq('period_month',month).eq('period_year',year).maybeSingle();
  if(existing){showToast('Periode payroll tersebut sudah ada.',true);return;}
  const {data,error}=await sb.from('payroll_runs').insert({
    period_month:month,period_year:year,status:'draft',
    attendance_cutoff_start:start,attendance_cutoff_end:end,
    payment_date:payment||null,
    working_days_per_month:workingDays,
    deduct_attendance_absence:deductAbsence,
    notes:notes||null
  }).select().single();
  if(error){showToast(error.message,true);return;}
  await logAudit('payroll.run_create','payroll_runs',data?.id||null,null,{period_month:month,period_year:year});
  showToast('Periode payroll dibuat.');closeModal();renderPayroll();
}


function dateInRange(value, start, end){
  const d = String(value || '').slice(0,10);
  return !!d && d >= start && d <= end;
}

function overlapDays(startDate, endDate, rangeStart, rangeEnd){
  const start = new Date(startDate);
  const end = new Date(endDate);
  const rs = new Date(rangeStart);
  const re = new Date(rangeEnd);

  const from = start > rs ? start : rs;
  const to = end < re ? end : re;
  if(to < from) return 0;

  return Math.floor((to - from) / 86400000) + 1;
}

function normalizeAttendanceStatus(status){
  return String(status || '').trim().toLowerCase().replace(/[\s-]+/g,'_');
}

function buildAttendanceSummary(records, leaveRequests){
  let present = 0;
  let late = 0;
  let absent = 0;
  let other = 0;
  let missingCheckout = 0;

  const approvedLeaveDates = new Set();

  for(const leave of leaveRequests){
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)){
      approvedLeaveDates.add(d.toISOString().slice(0,10));
    }
  }

  for(const record of records){
    const status = normalizeAttendanceStatus(record.status);
    if(status === 'present') present++;
    else if(status === 'late') late++;
    else if(['absent','alpha','no_show','unpaid'].includes(status)){
      if(!approvedLeaveDates.has(String(record.work_date).slice(0,10))) absent++;
    } else {
      other++;
    }

    if(record.check_in && !record.check_out) missingCheckout++;
  }

  return {
    recorded_days: records.length,
    present_days: present,
    late_days: late,
    absent_days: absent,
    other_days: other,
    missing_checkout: missingCheckout
  };
}

export async function generatePayslips(runId){
  if(!confirm('Generate ulang slip gaji dengan data Attendance, Overtime, Leave, Claims, dan Adjustment?')) return;

  const btns = document.querySelectorAll('button');
  btns.forEach(b => b.disabled = true);
  showToast('Menggabungkan data HRIS ke payroll…');

  try {
    const runs = await sbAll('payroll_runs', {eq:{id:runId}});
    const run = runs[0];

    if(!run){
      showToast('Periode payroll tidak ditemukan.', true);
      return;
    }

    const pMonth = run.period_month;
    const pYear = run.period_year;
    const cutoffStart = run.attendance_cutoff_start || pYear + '-' + String(pMonth).padStart(2,'0') + '-01';
    const cutoffEnd = run.attendance_cutoff_end || new Date(Number(pYear), Number(pMonth), 0).toISOString().slice(0,10);
    const workingDays = Number(run.working_days_per_month) > 0 ? Number(run.working_days_per_month) : 22;
    const deductAttendanceAbsence = !!run.deduct_attendance_absence;
    const dailyRateDivisor = workingDays;

    const [
      emps,
      components,
      overtimeReqs,
      attendanceRows,
      leaveReqs,
      leaveTypes,
      claims,
      adjustments
    ] = await Promise.all([
      sbAll('employees', {eq:{employment_status:'active'}}),
      sbAll('payroll_components'),
      sbAll('overtime_requests', {eq:{status:'approved'}}),
      sbAll('attendance'),
      sbAll('leave_requests', {eq:{status:'approved'}}),
      sbAll('leave_types'),
      sbAll('reimbursement_claims', {eq:{status:'approved'}}),
      sbAll('payroll_adjustments', {eq:{payroll_run_id:runId}})
    ]);

    if(!emps.length){
      showToast('Tidak ada karyawan aktif.', true);
      return;
    }

    const earnings = components.filter(c => c.component_type === 'earning' && !c.deleted_at);
    const deductions = components.filter(c => c.component_type === 'deduction' && !c.deleted_at);

    const payloads = [];

    for(const e of emps){
      const details = [];
      const gajiPokok = Number(e.basic_salary) || 0;
      let totalEarn = gajiPokok;
      let totalDed = 0;

      details.push({name:'Gaji Pokok',amount:gajiPokok,type:'earning'});

      let totalTunjangan = 0;
      earnings.filter(x => x.name !== 'Gaji Pokok').forEach(comp => {
        const amount = comp.is_percentage
          ? gajiPokok * Number(comp.default_amount || 0) / 100
          : Number(comp.default_amount || 0);

        const rounded = Math.round(amount);
        details.push({name:comp.name,amount:rounded,type:'earning'});
        totalEarn += rounded;
        totalTunjangan += rounded;
      });

      const employeeAttendance = attendanceRows.filter(a =>
        a.employee_id === e.id &&
        dateInRange(a.work_date, cutoffStart, cutoffEnd)
      );

      const employeeLeaves = leaveReqs.filter(l =>
        l.employee_id === e.id &&
        overlapDays(l.start_date,l.end_date,cutoffStart,cutoffEnd) > 0
      );

      const attendanceSummary = buildAttendanceSummary(employeeAttendance, employeeLeaves);

      let attendanceAbsenceDays = 0;
      if(deductAttendanceAbsence){
        attendanceAbsenceDays = attendanceSummary.absent_days;
        if(attendanceAbsenceDays > 0){
          const amount = Math.round((gajiPokok / dailyRateDivisor) * attendanceAbsenceDays);
          details.push({
            name:'Potongan Absensi Tidak Hadir',
            amount,
            type:'deduction',
            source:'attendance'
          });
          totalDed += amount;
        }
      }

      let unpaidLeaveDays = 0;
      let paidLeaveDays = 0;
      let neutralLeaveDays = 0;

      for(const leave of employeeLeaves){
        const type = leaveTypes.find(t => t.id === leave.leave_type_id);
        const treatment = type?.payroll_treatment || 'neutral';
        const days = overlapDays(leave.start_date, leave.end_date, cutoffStart, cutoffEnd);

        if(treatment === 'unpaid') unpaidLeaveDays += days;
        else if(treatment === 'paid') paidLeaveDays += days;
        else neutralLeaveDays += days;
      }

      if(unpaidLeaveDays > 0){
        const amount = Math.round((gajiPokok / dailyRateDivisor) * unpaidLeaveDays);
        details.push({
          name:'Potongan Unpaid Leave',
          amount,
          type:'deduction',
          source:'leave'
        });
        totalDed += amount;
      }

      const myOt = overtimeReqs.filter(o =>
        o.employee_id === e.id &&
        dateInRange(o.overtime_date, cutoffStart, cutoffEnd)
      );

      const overtimeHours = myOt.reduce((sum,o) => sum + (Number(o.hours) || 0), 0);
      const totalLembur = myOt.reduce((sum,o) => sum + (Number(o.amount) || 0), 0);

      if(totalLembur > 0){
        const rounded = Math.round(totalLembur);
        details.push({
          name:'Upah Lembur',
          amount:rounded,
          type:'earning',
          source:'overtime'
        });
        totalEarn += rounded;
      }

      const employeeClaims = claims.filter(claim =>
        claim.employee_id === e.id &&
        dateInRange(claim.approved_at || claim.submitted_at, cutoffStart, cutoffEnd)
      );

      const claimTotal = employeeClaims.reduce((sum,claim) => sum + (Number(claim.amount) || 0), 0);

      if(claimTotal > 0){
        const rounded = Math.round(claimTotal);
        details.push({
          name:'Reimbursement',
          amount:rounded,
          type:'earning',
          source:'claims',
          count:employeeClaims.length
        });
        totalEarn += rounded;
      }

      const employeeAdjustments = adjustments.filter(a => a.employee_id === e.id);

      for(const adjustment of employeeAdjustments){
        const amount = Math.round(Number(adjustment.amount) || 0);
        if(amount <= 0) continue;

        details.push({
          name:adjustment.name,
          amount,
          type:adjustment.adjustment_type,
          source:'payroll_adjustment'
        });

        if(adjustment.adjustment_type === 'earning') totalEarn += amount;
        else totalDed += amount;
      }

      const bpjsKes = Math.min(gajiPokok, BPJS_CAP_KESEHATAN) * 0.01;
      const bpjsJHT = gajiPokok * 0.02;
      const bpjsJP = Math.min(gajiPokok, BPJS_CAP_JP) * 0.01;
      const ptkpKey = e.ptkp_status || 'TK/0';

      const pph21 = hitungPPh21Bulanan(
        gajiPokok,
        totalTunjangan + totalLembur,
        ptkpKey
      );

      deductions.forEach(comp => {
        let amount = 0;

        switch(comp.calc_type){
          case 'bpjs_kesehatan':
            amount = bpjsKes;
            break;
          case 'bpjs_jht':
            amount = bpjsJHT;
            break;
          case 'bpjs_jp':
            amount = bpjsJP;
            break;
          case 'pph21':
            amount = pph21;
            break;
          case 'percentage':
            amount = gajiPokok * Number(comp.default_amount || 0) / 100;
            break;
          default:
            amount = Number(comp.default_amount) || 0;
        }

        amount = Math.round(amount);
        details.push({name:comp.name,amount,type:'deduction'});
        totalDed += amount;
      });

      payloads.push({
        payroll_run_id:runId,
        employee_id:e.id,
        basic_salary:gajiPokok,
        total_earnings:Math.round(totalEarn),
        total_deductions:Math.round(totalDed),
        net_salary:Math.round(totalEarn - totalDed),
        details,
        attendance_summary:{
          ...attendanceSummary,
          deducted_absence_days:attendanceAbsenceDays,
          deducted_absence_amount:attendanceAbsenceDays
            ? Math.round((gajiPokok / dailyRateDivisor) * attendanceAbsenceDays)
            : 0
        },
        leave_summary:{
          paid_days:paidLeaveDays,
          unpaid_days:unpaidLeaveDays,
          neutral_days:neutralLeaveDays,
          unpaid_leave_amount:unpaidLeaveDays
            ? Math.round((gajiPokok / dailyRateDivisor) * unpaidLeaveDays)
            : 0
        },
        claim_summary:{
          approved_count:employeeClaims.length,
          approved_amount:Math.round(claimTotal)
        }
      });
    }

    const {error} = await sb.from('payslips')
      .upsert(payloads,{onConflict:'payroll_run_id,employee_id'});

    if(error){
      showToast('Gagal generate payroll: ' + error.message, true);
      return;
    }

    const payrollTotalGross = payloads.reduce((sum,p) => sum + Number(p.total_earnings || 0),0);
    const payrollTotalDed = payloads.reduce((sum,p) => sum + Number(p.total_deductions || 0),0);
    const payrollTotalNet = payloads.reduce((sum,p) => sum + Number(p.net_salary || 0),0);

    await sb.from('payroll_runs').update({
      status:'calculated',
      total_gross:Math.round(payrollTotalGross),
      total_deductions:Math.round(payrollTotalDed),
      total_net:Math.round(payrollTotalNet),
      generated_at:new Date().toISOString()
    }).eq('id',runId);

    const sourceTotals = payloads.reduce((acc,p) => {
      const a = p.attendance_summary || {};
      const l = p.leave_summary || {};
      const c = p.claim_summary || {};
      acc.late += Number(a.late_days || 0);
      acc.absent += Number(a.absent_days || 0);
      acc.overtime += (p.details || [])
        .filter(d=>d.source==='overtime')
        .reduce((sum,d)=>sum+Number(d.amount||0),0);
      acc.claims += Number(c.approved_amount || 0);
      acc.unpaidLeave += Number(l.unpaid_leave_amount || 0);
      return acc;
    },{late:0,absent:0,overtime:0,claims:0,unpaidLeave:0});

    await logAudit(
      'payroll.generate_integrated',
      'payroll_runs',
      runId,
      null,
      {
        employee_count:payloads.length,
        attendance_absent_days:sourceTotals.absent,
        attendance_late_days:sourceTotals.late,
        overtime_amount:sourceTotals.overtime,
        reimbursement_amount:sourceTotals.claims,
        unpaid_leave_deduction:sourceTotals.unpaidLeave
      }
    );

    showToast('✅ Payroll berhasil dihitung dari data HRIS.');
    renderPayroll();
  } finally {
    btns.forEach(b => b.disabled = false);
  }
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
  const start=el('pr-start').value,
    end=el('pr-end').value,
    payment=el('pr-payment').value,
    workingDays=Number(el('pr-working-days').value)||22,
    deductAbsence=el('pr-deduct-absence').value==='true',
    notes=el('pr-notes').value.trim();
  if(start&&end&&start>end){showToast('Cut-off tidak valid.',true);return;}
  const {error}=await sb.from('payroll_runs').update({
    attendance_cutoff_start:start||null,
    attendance_cutoff_end:end||null,
    payment_date:payment||null,
    working_days_per_month:workingDays,
    deduct_attendance_absence:deductAbsence,
    notes:notes||null
  }).eq('id',runId);
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
  const integration=slips.reduce((a,s)=>{
    const att=s.attendance_summary||{};
    const leave=s.leave_summary||{};
    const claim=s.claim_summary||{};
    const overtime=(Array.isArray(s.details)?s.details:[]).filter(d=>d.source==='overtime').reduce((sum,d)=>sum+Number(d.amount||0),0);
    a.late+=Number(att.late_days||0);
    a.absent+=Number(att.absent_days||0);
    a.overtime+=overtime;
    a.unpaidLeave+=Number(leave.unpaid_leave_amount||0);
    a.claims+=Number(claim.approved_amount||0);
    a.claimCount+=Number(claim.approved_count||0);
    return a;
  },{late:0,absent:0,overtime:0,unpaidLeave:0,claims:0,claimCount:0});
  el('payslip-area').innerHTML=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;"><div><div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">Payroll</div><h3 style="margin:3px 0;">${String(r.period_month).padStart(2,'0')}/${r.period_year}</h3><div style="font-size:12px;color:var(--text-muted);">Cut-off: ${r.attendance_cutoff_start||'-'} — ${r.attendance_cutoff_end||'-'} · Pembayaran: ${r.payment_date||'-'}</div></div>${statusBadge(r.status)}</div>
    <div class="grid grid-4" style="margin:14px 0;"><div class="stat-card"><div class="stat-num">${slips.length}</div><div class="stat-label">Slip</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.g)}</div><div class="stat-label">Gross</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.d)}</div><div class="stat-label">Potongan</div></div><div class="stat-card"><div class="stat-num">${fmtMoney(totals.n)}</div><div class="stat-label">Take Home Pay</div></div></div>
    <div style="background:#FAFAF6;border:1px solid var(--border);border-radius:9px;padding:12px 13px;margin-bottom:12px;">
      <div style="font-size:12px;font-weight:800;margin-bottom:8px;">Sumber Data Payroll</div>
      <div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;">
        <div><div style="font-size:10.5px;color:var(--text-muted);">Lembur</div><b>${fmtMoney(integration.overtime)}</b></div>
        <div><div style="font-size:10.5px;color:var(--text-muted);">Reimbursement</div><b>${fmtMoney(integration.claims)}</b><div style="font-size:10px;color:var(--text-muted);">${integration.claimCount} klaim</div></div>
        <div><div style="font-size:10.5px;color:var(--text-muted);">Unpaid Leave</div><b>${fmtMoney(integration.unpaidLeave)}</b></div>
        <div><div style="font-size:10.5px;color:var(--text-muted);">Terlambat</div><b>${integration.late} hari</b></div>
        <div><div style="font-size:10.5px;color:var(--text-muted);">Tidak Hadir</div><b>${integration.absent} hari</b></div>
      </div>
      <div style="font-size:10.5px;color:var(--text-muted);margin-top:8px;">Attendance menjadi sumber pemeriksaan/deduksi hanya bila opsi potong absensi diaktifkan pada pengaturan periode.</div>
    </div>
    ${r.payment_status&&r.payment_status!=='pending'?`<div style='background:#FAFAF6;border:1px solid var(--border);border-radius:9px;padding:11px 13px;margin-bottom:12px;'><div style='display:flex;justify-content:space-between;gap:10px;align-items:flex-start;'><div><div style='font-size:12px;font-weight:800;'>Pembayaran Bank</div><div style='font-size:11.5px;color:var(--text-muted);margin-top:3px;'>Alur manual: generate file → upload ke bank → proses bank → tandai sudah dibayar.</div></div>${statusBadge(r.payment_status)}</div>${r.payment_file_name?`<div style='font-size:11.5px;margin-top:7px;'>File: <b>${escapeHtml(r.payment_file_name)}</b></div>`:''}${r.payment_reference?`<div style='font-size:11.5px;margin-top:3px;'>Reference: <b>${escapeHtml(r.payment_reference)}</b></div>`:''}</div>`:''}
    ${missing?`<div style="background:#FBF1DE;color:#7A5A1A;padding:10px 12px;border-radius:8px;font-size:12.5px;margin-bottom:12px;">⚠ ${missing} karyawan aktif belum punya bank/rekening.</div>`:''}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">${['draft','calculated'].includes(r.status)?`<button class="btn btn-primary btn-sm" onclick='generatePayslips(${JSON.stringify(runId)})'>↻ Hitung / Generate</button>`:''}${canReview?`<button class="btn btn-outline btn-sm" onclick='submitPayrollReview(${JSON.stringify(runId)})'>Ajukan Review</button>`:''}${canApprove?`<button class="btn btn-primary btn-sm" onclick='approvePayroll(${JSON.stringify(runId)})'>✓ Approve</button>`:''}${['draft','calculated','under_review'].includes(r.status)?`<button class="btn btn-outline btn-sm" onclick='openAdjustmentManager(${JSON.stringify(runId)})'>+ Adjustment</button>`:''}${r.status==='approved'?`<button class="btn btn-outline btn-sm" onclick='generatePaymentFile(${JSON.stringify(runId)})'>⇩ Generate File Pembayaran</button>`:''}${r.status==='approved'&&r.payment_status==='generated'?`<button class="btn btn-outline btn-sm" onclick='markPaymentUploaded(${JSON.stringify(runId)})'>✓ Tandai Diunggah ke Bank</button>`:''}${r.status==='locked'?`<button class="btn btn-outline btn-sm" onclick='openCorrectionManager(${JSON.stringify(runId)})'>✎ Koreksi</button>`:''}${canPay?`<button class="btn btn-primary btn-sm" onclick='markPayrollPaid(${JSON.stringify(runId)})'>✓ Tandai Dibayar</button>`:''}${canLock?`<button class="btn btn-outline btn-sm" onclick='lockPayroll(${JSON.stringify(runId)})'>🔒 Kunci</button>`:''}${['draft','calculated','under_review'].includes(r.status)?`<button class="btn btn-outline btn-sm" onclick='openPayrollRunForm(${JSON.stringify(r)})'>Pengaturan</button>`:''}</div>
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
  if(!['uploaded','processing'].includes(run.payment_status)){showToast('Tandai file pembayaran sudah diunggah ke bank terlebih dahulu.',true);return;}
  if(!confirm('Tandai payroll sudah dibayar? Ini hanya mencatat hasil pembayaran manual dari bank.'))return;
  const payment=run.payment_date||new Date().toISOString().slice(0,10);
  await sb.from('payroll_runs').update({status:'paid',payment_status:'paid',payment_date:payment,paid_at:new Date().toISOString()}).eq('id',runId);
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

export async function openAdjustmentManager(runId){
  const runRows=await sbAll('payroll_runs',{eq:{id:runId}});
  const run=runRows[0];
  if(!run){showToast('Periode payroll tidak ditemukan.',true);return;}
  if(!['draft','calculated','under_review'].includes(run.status)){showToast('Adjustment hanya dapat diubah sebelum payroll disetujui.',true);return;}
  const [adjustments,emps]=await Promise.all([
    sbAll('payroll_adjustments',{eq:{payroll_run_id:runId},order:{col:'created_at',asc:false}}),
    sbAll('employees',{eq:{employment_status:'active'},order:{col:'full_name'}})
  ]);
  const html = '<div style="width:min(880px,calc(100vw - 32px));max-height:90vh;overflow:auto;">'+
    '<h3>Payroll Adjustment</h3>'+
    '<div class="card" style="background:#FAFAF6;">'+
      '<div class="field"><label>Karyawan</label><select id="adj-employee">'+emps.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.full_name)+' — '+escapeHtml(e.employee_code||'-')+'</option>').join('')+'</select></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">'+
        '<div class="field"><label>Jenis</label><select id="adj-type"><option value="earning">Pendapatan</option><option value="deduction">Potongan</option></select></div>'+
        '<div class="field"><label>Nominal</label><input id="adj-amount" inputmode="numeric" oninput="formatNumberInput(this)"></div>'+
      '</div>'+
      '<div class="field"><label>Komponen</label><input id="adj-name" maxlength="120" placeholder="Contoh: Bonus proyek"></div>'+
      '<div class="field"><label>Catatan</label><textarea id="adj-notes" rows="3" maxlength="1000"></textarea></div>'+
      '<div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="savePayrollAdjustment(\''+runId+'\')">Simpan</button></div>'+
    '</div>'+
    '<div class="card" style="padding:0;margin-top:12px;overflow:auto;"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Komponen</th><th>Nominal</th><th></th></tr></thead><tbody>'+
      (adjustments.map(a=>{const e=emps.find(x=>x.id===a.employee_id);return '<tr><td>'+escapeHtml(e?.full_name||'-')+'</td><td>'+(a.adjustment_type==='earning'?'Pendapatan':'Potongan')+'</td><td>'+escapeHtml(a.name)+'</td><td>'+fmtMoney(a.amount)+'</td><td><button class="btn btn-danger btn-sm" onclick="deletePayrollAdjustment(\''+a.id+'\',\''+runId+'\')">Hapus</button></td></tr>';}).join('')||'<tr><td colspan="5" class="empty-state">Belum ada adjustment.</td></tr>')+
    '</tbody></table></div>'+
    '<div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button></div>'+
  '</div>';
  openModal(html);
}

export async function savePayrollAdjustment(runId){
  const runRows=await sbAll('payroll_runs',{eq:{id:runId}});
  const run=runRows[0];
  if(!run||!['draft','calculated','under_review'].includes(run.status)){showToast('Adjustment tidak dapat ditambahkan pada status ini.',true);return;}
  const employeeId=el('adj-employee')?.value;
  const type=el('adj-type')?.value;
  const name=el('adj-name')?.value.trim();
  const amount=Number((el('adj-amount')?.value||'').replace(/\D/g,''))||0;
  const notes=el('adj-notes')?.value.trim();
  if(!employeeId||!type||!name||amount<=0||!notes){showToast('Lengkapi seluruh data adjustment.',true);return;}
  const {data,error}=await sb.from('payroll_adjustments').insert({payroll_run_id:runId,employee_id:employeeId,adjustment_type:type,name,amount,notes,created_by:state.currentUser?.id}).select().single();
  if(error){showToast('Gagal menyimpan adjustment: '+error.message,true);return;}
  await logAudit('payroll.adjustment_create','payroll_adjustments',data?.id||null,null,{payroll_run_id:runId,employee_id:employeeId,amount,type});
  showToast('Adjustment disimpan. Silakan hitung ulang payroll.');
  openAdjustmentManager(runId);
}

export async function deletePayrollAdjustment(id,runId){
  if(!confirm('Hapus adjustment ini?'))return;
  const {error}=await sb.from('payroll_adjustments').delete().eq('id',id);
  if(error){showToast('Gagal menghapus adjustment: '+error.message,true);return;}
  await logAudit('payroll.adjustment_delete','payroll_adjustments',id,null,{payroll_run_id:runId});
  showToast('Adjustment dihapus.');
  openAdjustmentManager(runId);
}
export async function openPayrollReports(){
  const runs=await sbAll('payroll_runs',{order:{col:'created_at',asc:false}});
  if(!runs.length){showToast('Belum ada payroll.',true);return;}
  const years=[...new Set(runs.map(r=>r.period_year))].sort((a,b)=>b-a);
  const html='<div style="width:min(980px,calc(100vw - 32px));max-height:90vh;overflow:auto;">'+
    '<h3>Laporan Payroll</h3>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px;">'+
      '<div class="field"><label>Tahun</label><select id="rpt-year">'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></div>'+
      '<div class="field"><label>Periode</label><select id="rpt-run"><option value="">Pilih periode…</option></select></div>'+
    '</div>'+
    '<div id="payroll-report-body" class="empty-state">Pilih periode.</div>'+
    '<div style="display:flex;justify-content:flex-end;gap:8px;margin-top:12px;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button><button class="btn btn-primary" onclick="exportPayrollReport()">Export CSV</button></div>'+
  '</div>';
  openModal(html);
  const yearEl=el('rpt-year'), runEl=el('rpt-run');
  const refreshRuns=()=>{const y=Number(yearEl.value);runEl.innerHTML='<option value="">Pilih periode…</option>'+runs.filter(r=>r.period_year===y).map(r=>'<option value="'+r.id+'">'+String(r.period_month).padStart(2,'0')+'/'+r.period_year+'</option>').join('');};
  yearEl.addEventListener('change',()=>{refreshRuns();renderPayrollReport();});
  runEl.addEventListener('change',renderPayrollReport);
  refreshRuns();
}

async function renderPayrollReport(){
  const runId=el('rpt-run')?.value;
  if(!runId){el('payroll-report-body').innerHTML='<div class="empty-state">Pilih periode.</div>';return;}
  const [runs,slips,emps,depts,adjustments]=await Promise.all([
    sbAll('payroll_runs',{eq:{id:runId}}),sbAll('payslips',{eq:{payroll_run_id:runId}}),sbAll('employees'),sbAll('departments'),sbAll('payroll_adjustments',{eq:{payroll_run_id:runId}})
  ]);
  const run=runs[0];
  const deptMap={};
  slips.forEach(s=>{const e=emps.find(x=>x.id===s.employee_id)||{};const id=e.department_id||'unknown';if(!deptMap[id])deptMap[id]={name:'Umum',count:0,gross:0,ded:0,net:0};deptMap[id].count++;deptMap[id].gross+=Number(s.total_earnings||0);deptMap[id].ded+=Number(s.total_deductions||0);deptMap[id].net+=Number(s.net_salary||0);});
  Object.keys(deptMap).forEach(id=>{if(id!=='unknown')deptMap[id].name=depts.find(d=>d.id===id)?.name||'Tidak diketahui';});
  const intg=slips.reduce((a,s)=>{const at=s.attendance_summary||{},lv=s.leave_summary||{},cl=s.claim_summary||{};a.absent+=Number(at.absent_days||0);a.late+=Number(at.late_days||0);a.claim+=Number(cl.approved_amount||0);a.unpaid+=Number(lv.unpaid_leave_amount||0);(Array.isArray(s.details)?s.details:[]).filter(d=>d.source==='overtime').forEach(d=>a.ot+=Number(d.amount||0));return a;},{absent:0,late:0,claim:0,unpaid:0,ot:0});
  el('payroll-report-body').innerHTML='<div class="grid grid-4" style="margin-bottom:12px;">'+
    '<div class="stat-card"><div class="stat-num">'+slips.length+'</div><div class="stat-label">Karyawan</div></div>'+
    '<div class="stat-card"><div class="stat-num">'+fmtMoney(run?.total_gross||0)+'</div><div class="stat-label">Gross</div></div>'+
    '<div class="stat-card"><div class="stat-num">'+fmtMoney(run?.total_deductions||0)+'</div><div class="stat-label">Potongan</div></div>'+
    '<div class="stat-card"><div class="stat-num">'+fmtMoney(run?.total_net||0)+'</div><div class="stat-label">Net</div></div>'+
  '</div>'+
  '<div class="card" style="background:#FAFAF6;"><b>Sumber Payroll</b><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:8px;font-size:12px;">'+
    '<div>Lembur<br><b>'+fmtMoney(intg.ot)+'</b></div><div>Claim<br><b>'+fmtMoney(intg.claim)+'</b></div><div>Unpaid Leave<br><b>'+fmtMoney(intg.unpaid)+'</b></div><div>Terlambat<br><b>'+intg.late+' hari</b></div><div>Tidak Hadir<br><b>'+intg.absent+' hari</b></div>'+
  '</div></div>'+
  '<div class="card" style="padding:0;margin-top:12px;overflow:auto;"><table><thead><tr><th>Departemen</th><th>Karyawan</th><th>Gross</th><th>Potongan</th><th>Net</th></tr></thead><tbody>'+
    Object.values(deptMap).sort((a,b)=>b.net-a.net).map(d=>'<tr><td>'+escapeHtml(d.name)+'</td><td>'+d.count+'</td><td>'+fmtMoney(d.gross)+'</td><td>'+fmtMoney(d.ded)+'</td><td><b>'+fmtMoney(d.net)+'</b></td></tr>').join('')+
  '</tbody></table></div>'+
  '<div style="font-size:11.5px;color:var(--text-muted);margin-top:8px;">Status payroll: '+escapeHtml(run?.status||'-')+' • Adjustment '+adjustments.length+' item.</div>';
}

export async function exportPayrollReport(){
  const runId=el('rpt-run')?.value;
  if(!runId){showToast('Pilih periode.',true);return;}
  const [runs,slips,emps,depts]=await Promise.all([sbAll('payroll_runs',{eq:{id:runId}}),sbAll('payslips',{eq:{payroll_run_id:runId}}),sbAll('employees'),sbAll('departments')]);
  const run=runs[0];
  const out=[['Kode','Nama','Departemen','Bank','No Rekening','Gaji Pokok','Gross','Potongan','Net'].map(csvCell).join(',')];
  slips.forEach(s=>{const e=emps.find(x=>x.id===s.employee_id)||{};const d=depts.find(x=>x.id===e.department_id)||{};out.push([e.employee_code||'',e.full_name||'',d.name||'',e.bank_name||'',e.bank_account_number||'',s.basic_salary||0,s.total_earnings||0,s.total_deductions||0,s.net_salary||0].map(csvCell).join(','));});
  const csv='\uFEFF'+out.join('\r\n');
  const name='PAYROLL_REPORT_'+run.period_year+'-'+String(run.period_month).padStart(2,'0')+'.csv';
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  await logAudit('payroll.report_export','payroll_runs',runId,null,{file_name:name,row_count:slips.length});
  showToast('Laporan payroll berhasil diexport.');
}
export async function openThrManager(){
  const runs=await sbAll('payroll_special_runs',{order:{col:'created_at',asc:false}});
  const rows=runs.map(r=>'<tr><td>'+escapeHtml(r.title)+'</td><td>'+r.period_year+'</td><td>'+statusBadge(r.status)+'</td><td>'+fmtMoney(r.total_amount)+'</td><td>'+(r.payment_date?fmtDate(r.payment_date):'-')+'</td><td><button class="btn btn-outline btn-sm" onclick="openThrRun(\''+r.id+'\')">Kelola</button></td></tr>').join('')||'<tr><td colspan="6" class="empty-state">Belum ada batch THR.</td></tr>';
  openModal('<div style="width:min(980px,calc(100vw - 32px));max-height:90vh;overflow:auto;"><div style="display:flex;justify-content:space-between;align-items:flex-start;"><div><h3>THR / Special Payroll</h3><div style="font-size:12px;color:var(--text-muted);">Batch THR dipisahkan dari payroll bulanan.</div></div><button class="btn btn-primary" onclick="openThrForm()">+ Buat THR</button></div><div class="card" style="padding:0;margin-top:14px;overflow:auto;"><table><thead><tr><th>Judul</th><th>Tahun</th><th>Status</th><th>Total</th><th>Bayar</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button></div></div>');
}

export function openThrForm(){
  const y=new Date().getFullYear();
  openModal('<h3>Buat Batch THR</h3><div class="field"><label>Judul</label><input id="thr-title" value="THR '+y+'"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field"><label>Tahun</label><input id="thr-year" type="number" value="'+y+'"></div><div class="field"><label>Tanggal Pembayaran</label><input id="thr-payment" type="date"></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field"><label>Pengali Gaji Pokok</label><input id="thr-multiplier" type="number" min="0" step="0.01" value="1"></div><div class="field"><label>Prorata Masa Kerja?</label><select id="thr-prorate"><option value="true">Ya</option><option value="false">Tidak</option></select></div></div><div class="field"><label>Catatan Kebijakan Internal</label><textarea id="thr-notes" rows="3"></textarea></div><div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="saveThrRun()">Buat Batch</button></div>');
}

export async function saveThrRun(){
  const title=el('thr-title').value.trim(),year=Number(el('thr-year').value),payment=el('thr-payment').value||null,multiplier=Number(el('thr-multiplier').value)||1,prorate=el('thr-prorate').value==='true',notes=el('thr-notes').value.trim();
  if(!title||!year){showToast('Judul dan tahun wajib.',true);return;}
  const {data,error}=await sb.from('payroll_special_runs').insert({run_type:'thr',title,period_year:year,payment_date:payment,status:'draft',base_multiplier:multiplier,prorate_enabled:prorate,notes:notes||null}).select().single();
  if(error){showToast(error.message,true);return;}
  await logAudit('payroll.thr_create','payroll_special_runs',data.id,null,{title,year});
  closeModal();openThrManager();
}

export async function openThrRun(runId){
  const runs=await sbAll('payroll_special_runs',{eq:{id:runId}});const run=runs[0];if(!run){showToast('Batch THR tidak ditemukan.',true);return;}
  const [items,emps]=await Promise.all([sbAll('payroll_special_items',{eq:{special_run_id:runId}}),sbAll('employees',{eq:{employment_status:'active'}})]);
  const total=items.reduce((s,i)=>s+Number(i.amount||0),0);
  const rows=items.map(i=>{const e=emps.find(x=>x.id===i.employee_id)||{};return '<tr><td>'+escapeHtml(e.full_name||'-')+'</td><td>'+fmtMoney(i.base_salary)+'</td><td>'+i.service_months+'/'+i.entitlement_months+'</td><td><b>'+fmtMoney(i.amount)+'</b></td></tr>';}).join('')||'<tr><td colspan="4" class="empty-state">Belum dihitung.</td></tr>';
  const actions=(['draft','calculated'].includes(run.status)?'<button class="btn btn-primary btn-sm" onclick="calculateThr(\''+runId+'\')">↻ Hitung</button>':'')+(run.status==='calculated'?'<button class="btn btn-outline btn-sm" onclick="approveThr(\''+runId+'\')">✓ Approve</button>':'')+(run.status==='approved'?'<button class="btn btn-outline btn-sm" onclick="generateThrPaymentFile(\''+runId+'\')">⇩ File Pembayaran</button>':'')+(run.status==='approved'&&run.payment_status==='generated'?'<button class="btn btn-outline btn-sm" onclick="markThrUploaded(\''+runId+'\')">✓ Diunggah</button>':'')+(run.status==='approved'&&['uploaded','processing'].includes(run.payment_status)?'<button class="btn btn-primary btn-sm" onclick="markThrPaid(\''+runId+'\')">✓ Dibayar</button>':'')+(run.status==='paid'?'<button class="btn btn-outline btn-sm" onclick="lockThr(\''+runId+'\')">🔒 Kunci</button>':'');
  openModal('<div style="width:min(980px,calc(100vw - 32px));max-height:90vh;overflow:auto;"><h3>'+escapeHtml(run.title)+'</h3><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0;">'+statusBadge(run.status)+statusBadge(run.payment_status||'pending')+'</div><div class="grid grid-3"><div class="stat-card"><div class="stat-num">'+items.length+'</div><div class="stat-label">Karyawan</div></div><div class="stat-card"><div class="stat-num">'+fmtMoney(total)+'</div><div class="stat-label">Total THR</div></div><div class="stat-card"><div class="stat-num">'+run.base_multiplier+'x</div><div class="stat-label">Pengali</div></div></div><div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">'+actions+'</div><div class="card" style="padding:0;overflow:auto;"><table><thead><tr><th>Nama</th><th>Gaji Pokok</th><th>Masa Kerja</th><th>THR</th></tr></thead><tbody>'+rows+'</tbody></table></div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-outline" onclick="openThrManager()">Kembali</button></div></div>');
}

export async function calculateThr(runId){
  const rows=await sbAll('payroll_special_runs',{eq:{id:runId}});const run=rows[0];if(!run||!['draft','calculated'].includes(run.status)){showToast('THR tidak dapat dihitung.',true);return;}
  const emps=await sbAll('employees',{eq:{employment_status:'active'}});if(!emps.length){showToast('Tidak ada karyawan aktif.',true);return;}
  const items=emps.map(e=>{const join=e.join_date?new Date(e.join_date):null;const start=new Date(run.period_year,0,1);let months=12;if(join&&join>start){months=Math.max(0,Math.min(12,(run.period_year-join.getFullYear())*12+(11-join.getMonth())+1));}const base=Number(e.basic_salary||0);const amount=Math.round(run.prorate_enabled?base*Number(run.base_multiplier||1)*(months/12):base*Number(run.base_multiplier||1));return {special_run_id:runId,employee_id:e.id,base_salary:base,service_months:months,entitlement_months:12,amount,notes:null};});
  await sb.from('payroll_special_items').delete().eq('special_run_id',runId);
  const {error}=await sb.from('payroll_special_items').insert(items);if(error){showToast(error.message,true);return;}
  const total=items.reduce((s,i)=>s+i.amount,0);
  await sb.from('payroll_special_runs').update({status:'calculated',total_amount:total,generated_at:new Date().toISOString()}).eq('id',runId);
  await logAudit('payroll.thr_calculate','payroll_special_runs',runId,null,{employee_count:items.length,total});
  openThrRun(runId);
}

export async function approveThr(runId){const {data:run}=await sb.from('payroll_special_runs').select('*').eq('id',runId).maybeSingle();if(!run||run.status!=='calculated'){showToast('THR belum dihitung.',true);return;}if(!confirm('Approve batch THR ini?'))return;await sb.from('payroll_special_runs').update({status:'approved',approved_by:state.currentUser?.id||null,approved_at:new Date().toISOString()}).eq('id',runId);await logAudit('payroll.thr_approve','payroll_special_runs',runId,{status:'calculated'},{status:'approved'});openThrRun(runId);}

export async function generateThrPaymentFile(runId){const {data:run}=await sb.from('payroll_special_runs').select('*').eq('id',runId).maybeSingle();if(!run||run.status!=='approved'){showToast('THR harus disetujui.',true);return;}const [items,emps]=await Promise.all([sbAll('payroll_special_items',{eq:{special_run_id:runId}}),sbAll('employees')]);const missing=items.map(i=>emps.find(e=>e.id===i.employee_id)).filter(e=>!e?.bank_name||!e?.bank_account_number);if(missing.length){showToast('Ada penerima THR tanpa bank/rekening.',true);return;}const header=['employee_code','employee_name','bank_name','bank_account_number','amount','payment_date','reference','description'].map(csvCell).join(',');const rows=items.map(i=>{const e=emps.find(x=>x.id===i.employee_id)||{};return [e.employee_code||'',e.full_name||'',e.bank_name||'',e.bank_account_number||'',Math.round(i.amount||0),run.payment_date||'', 'THR-'+run.period_year+'-'+(e.employee_code||e.id),run.title].map(csvCell).join(',');});const csv='\uFEFF'+[header,...rows].join('\r\n');const name='THR_'+run.period_year+'.csv';const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);await sb.from('payroll_special_runs').update({payment_status:'generated',payment_file_name:name,payment_file_generated_at:new Date().toISOString(),payment_file_generated_by:state.currentUser?.id||null}).eq('id',runId);openThrRun(runId);}

export async function markThrUploaded(runId){const {data:run}=await sb.from('payroll_special_runs').select('*').eq('id',runId).maybeSingle();if(!run||run.status!=='approved'||run.payment_status!=='generated'){showToast('Generate file terlebih dahulu.',true);return;}const ref=prompt('Reference bank (opsional):',run.payment_reference||'');if(ref===null)return;await sb.from('payroll_special_runs').update({payment_status:'uploaded',payment_reference:ref.trim()||null}).eq('id',runId);openThrRun(runId);}

export async function markThrPaid(runId){const {data:run}=await sb.from('payroll_special_runs').select('*').eq('id',runId).maybeSingle();if(!run||run.status!=='approved'||!['uploaded','processing'].includes(run.payment_status)){showToast('THR belum siap dibayar.',true);return;}if(!confirm('Tandai THR sudah dibayar?'))return;await sb.from('payroll_special_runs').update({status:'paid',payment_status:'paid',paid_at:new Date().toISOString()}).eq('id',runId);openThrRun(runId);}

export async function lockThr(runId){const {data:run}=await sb.from('payroll_special_runs').select('status').eq('id',runId).maybeSingle();if(run?.status!=='paid'){showToast('THR harus dibayar dahulu.',true);return;}if(!confirm('Kunci batch THR?'))return;await sb.from('payroll_special_runs').update({status:'locked',locked_at:new Date().toISOString()}).eq('id',runId);openThrRun(runId);}
export async function openCorrectionManager(runId){
  const rows=await sbAll('payroll_runs',{eq:{id:runId}});const run=rows[0];if(!run||run.status!=='locked'){showToast('Koreksi hanya dibuat setelah payroll terkunci.',true);return;}
  const [items,emps]=await Promise.all([sbAll('payroll_corrections',{eq:{payroll_run_id:runId},order:{col:'created_at',asc:false}}),sbAll('employees',{eq:{employment_status:'active'},order:{col:'full_name'}})]);
  const body=items.map(i=>{const e=emps.find(x=>x.id===i.employee_id)||{};return '<tr><td>'+escapeHtml(e.full_name||'-')+'</td><td>'+(i.correction_type==='earning'?'Tambahan':'Potongan')+'</td><td>'+escapeHtml(i.name)+'</td><td>'+fmtMoney(i.amount)+'</td><td>'+statusBadge(i.status)+'</td><td>'+escapeHtml(i.reason)+'</td></tr>';}).join('')||'<tr><td colspan="6" class="empty-state">Belum ada koreksi.</td></tr>';
  openModal('<div style="width:min(900px,calc(100vw - 32px));max-height:90vh;overflow:auto;"><h3>Koreksi Payroll</h3><div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">Payroll terkunci tidak diubah. Koreksi dibuat sebagai supplemental payment terpisah.</div><div class="card" style="background:#FAFAF6;"><div class="field"><label>Karyawan</label><select id="cor-employee">'+emps.map(e=>'<option value="'+e.id+'">'+escapeHtml(e.full_name)+' — '+escapeHtml(e.employee_code||'-')+'</option>').join('')+'</select></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;"><div class="field"><label>Jenis</label><select id="cor-type"><option value="earning">Tambahan</option><option value="deduction">Potongan</option></select></div><div class="field"><label>Nominal</label><input id="cor-amount" inputmode="numeric" oninput="formatNumberInput(this)"></div></div><div class="field"><label>Komponen</label><input id="cor-name" maxlength="120" placeholder="Contoh: Koreksi lembur"></div><div class="field"><label>Alasan / Bukti</label><textarea id="cor-reason" rows="3" maxlength="2000"></textarea></div><div style="display:flex;justify-content:flex-end;"><button class="btn btn-primary" onclick="savePayrollCorrection(\''+runId+'\')">Simpan Koreksi</button></div></div><div class="card" style="padding:0;margin-top:12px;overflow:auto;"><table><thead><tr><th>Karyawan</th><th>Jenis</th><th>Komponen</th><th>Nominal</th><th>Status</th><th>Alasan</th></tr></thead><tbody>'+body+'</tbody></table></div><div style="display:flex;justify-content:flex-end;margin-top:12px;"><button class="btn btn-outline" onclick="closeModal()">Tutup</button></div></div>');
}

export async function savePayrollCorrection(runId){
  const rows=await sbAll('payroll_runs',{eq:{id:runId}});const run=rows[0];if(!run||run.status!=='locked'){showToast('Payroll belum terkunci.',true);return;}
  const employeeId=el('cor-employee')?.value,type=el('cor-type')?.value,name=el('cor-name')?.value.trim(),amount=Number((el('cor-amount')?.value||'').replace(/\D/g,''))||0,reason=el('cor-reason')?.value.trim();
  if(!employeeId||!name||amount<=0||!reason){showToast('Lengkapi data koreksi.',true);return;}
  const {data,error}=await sb.from('payroll_corrections').insert({payroll_run_id:runId,employee_id:employeeId,correction_type:type,name,amount,reason,status:'draft',created_by:state.currentUser?.id}).select().single();
  if(error){showToast('Gagal menyimpan koreksi: '+error.message,true);return;}
  await logAudit('payroll.correction_create','payroll_corrections',data?.id||null,null,{payroll_run_id:runId,employee_id:employeeId,amount,type});
  showToast('Koreksi tersimpan sebagai supplemental payment.');openCorrectionManager(runId);
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
  const attendance = slip.attendance_summary || {};
  const leave = slip.leave_summary || {};
  const claims = slip.claim_summary || {};
  const overtimeAmount = details
    .filter(d=>d.source==='overtime')
    .reduce((sum,d)=>sum+Number(d.amount||0),0);

  const earningsRows = details.filter(d => d.type === 'earning').map(d =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="font-weight:600;">${fmtMoney(d.amount)}</span></div>`
  ).join('') || `<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:13px;"><span>Gaji Pokok</span><span style="font-weight:600;">${fmtMoney(slip.basic_salary)}</span></div>`;

  const deductionsRows = details.filter(d => d.type === 'deduction').map(d =>
    `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px dashed #e0e0e0;font-size:13px;"><span>${escapeHtml(d.name)}</span><span style="font-weight:600;color:var(--danger);">− ${fmtMoney(d.amount)}</span></div>`
  ).join('') || `<div style="padding:8px 0;font-size:13px;color:var(--text-muted);text-align:center;">Tidak ada potongan</div>`;

  c = `
    <h3 style="margin:0 0 4px;">Detail Slip Gaji</h3>
    <p style="font-size:12.5px;color:var(--text-muted);margin:0 0 16px;">${escapeHtml(emp.full_name)} • Periode ${periode}</p>
    <div style="background:#E9F5EE;border-radius:8px;padding:14px 16px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:13px;color:#256F4D;font-weight:600;">GAJI BERSIH</div>
      <div style="font-family:'Manrope';font-weight:800;font-size:22px;color:var(--accent-dark);">${fmtMoney(slip.net_salary)}</div>
    </div>
    <div class="card" style="background:#FAFAF6;margin-bottom:14px;">
      <div style="font-size:12px;font-weight:800;margin-bottom:8px;">Sumber Perhitungan</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;font-size:12px;">
        <div><span style="color:var(--text-muted);">Lembur</span><br><b>${fmtMoney(overtimeAmount)}</b></div>
        <div><span style="color:var(--text-muted);">Reimbursement</span><br><b>${fmtMoney(claims.approved_amount||0)}</b></div>
        <div><span style="color:var(--text-muted);">Unpaid Leave</span><br><b>${fmtMoney(leave.unpaid_leave_amount||0)}</b></div>
        <div><span style="color:var(--text-muted);">Hadir</span><br><b>${attendance.present_days||0} hari</b></div>
        <div><span style="color:var(--text-muted);">Terlambat</span><br><b>${attendance.late_days||0} hari</b></div>
        <div><span style="color:var(--text-muted);">Tidak Hadir</span><br><b>${attendance.absent_days||0} hari</b></div>
      </div>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--accent-dark);padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">Pendapatan</div>
      ${earningsRows}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;background:#FAFAF6;margin-top:4px;padding-left:8px;padding-right:8px;border-radius:4px;"><span>Total Pendapatan</span><span>${fmtMoney(slip.total_earnings)}</span></div>
    </div>
    <div style="margin-bottom:14px;">
      <div style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--danger);padding-bottom:6px;border-bottom:2px solid var(--border);margin-bottom:6px;">Potongan</div>
      ${deductionsRows}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-weight:700;background:#FBEAE6;margin-top:4px;padding-left:8px;padding-right:8px;border-radius:4px;color:var(--danger);"><span>Total Potongan</span><span>− ${fmtMoney(slip.total_deductions)}</span></div>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;">
      <button class="btn btn-outline" onclick="closeModal()">Tutup</button>
    </div>`;
  openModal(c);
}
