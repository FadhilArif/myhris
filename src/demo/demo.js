// MyHRIS Demo — no Supabase, no network writes.
// Everything is generated in memory and disappears when the page is refreshed.

var departments=['Produksi','Gudang','Human Resources','Finance','Sales','Marketing','IT','Customer Service'];
var shifts=[
 {id:'S1',name:'Shift Pagi',start:'08:00',end:'16:00',tol:15},
 {id:'S2',name:'Shift Siang',start:'10:00',end:'18:00',tol:15},
 {id:'S3',name:'Shift Malam',start:'16:00',end:'00:00',tol:15},
 {id:'S4',name:'Shift Kantor',start:'09:00',end:'17:00',tol:10}
];
var names=['Aditya Pratama','Bima Saputra','Citra Lestari','Dimas Ramadhan','Eka Permadi','Fajar Nugroho','Galih Setiawan','Hana Putri','Indra Wijaya','Joko Santoso','Kiki Amelia','Lukman Hakim','Maya Sari','Nanda Kurnia','Oki Firmansyah','Putri Ayu','Qori Ananda','Raka Mahendra','Salsa Nabila','Tegar Haryanto','Umar Farhan','Vina Maharani','Wahyu Utami','Yuni Kartika','Zaki Maulana','Aulia Rahman','Bagas Wicaksono','Clara Anjani','Dani Kurniawan','Elsa Safitri','Farhan Akbar','Gita Permata','Hendra Gunawan','Intan Salsabila','Jihan Nuraini','Kevin Prakoso','Larasati Dewi','Miko Prasetyo','Nia Ramadhani','Oscar Fernando','Prita Melati','Rendi Irawan','Sinta Wulandari','Tio Setiawan','Ulfa Ningsih','Vito Kurnia','Wulan Anggraini','Yusuf Maulana','Zahra Khairunnisa','Rizky Fadillah'];
var positions=['Staff','Senior Staff','Supervisor','Coordinator','Specialist'];
var employees=[];
for(var i=0;i<50;i++){
 var n=names[i], dep=departments[i%8], sh=shifts[i%4];
 employees.push({id:'EMP'+String(i+1).padStart(3,'0'),code:'EMP'+String(i+1).padStart(3,'0'),name:n,email:n.toLowerCase().replaceAll(' ','_')+'@demo.myhris.local',phone:'0812'+String(10000000+i),department:dep,position:positions[i%5],join:'202'+(3+i%3)+'-'+String(1+i%12).padStart(2,'0')+'-'+String(1+i%25).padStart(2,'0'),shift:sh.id,status:i===47?'Inactive':'Active',salary:2650000+(i%5)*150000+(i%3)*50000,leave:12,used:2+i%6});
}
var attendance=[];
for(var ei=0;ei<50;ei++){
 for(var d=1;d<=23;d++){
  if(d%7===0||d%7===6)continue;
  var e=employees[ei],s=shifts[ei%4],late=(ei+d)%13===0,abs=(ei*3+d)%47===0;
  attendance.push({employee:e.id,date:'2026-01-'+String(d).padStart(2,'0'),shift:s.name,time:s.start+'–'+s.end,in:abs?'-':late?'08:11':s.start,out:abs?'-':s.end,status:abs?'Absent':late?'Late':'Present'});
 }
}
var leave=[],overtime=[],claims=[],payroll=[],performance=[],training=[];
for(var j=0;j<50;j++){
 var e=employees[j];
 if(j%3===0)leave.push({id:'LV'+String(j).padStart(3,'0'),employee:e.id,type:j%4?'Annual Leave':'Sick Leave',start:'2026-01-'+String(6+j%20).padStart(2,'0'),days:1+j%2,status:j%5===0?'Pending':'Approved'});
 if(j%3===1)overtime.push({id:'OT'+j,employee:e.id,date:'2026-01-'+String(5+j%20).padStart(2,'0'),hours:2+j%3,amount:(2+j%3)*75000,status:j%4===0?'Pending':'Approved',reason:j%2?'Stock opname':'Production target'});
 if(j%4===0)claims.push({id:'CL'+j,employee:e.id,date:'2026-01-'+String(4+j%20).padStart(2,'0'),category:['Transport','Medical','Meal','Business Trip'][j%4],amount:125000+(j%5)*85000,status:j%4===0?'Pending':'Approved'});
 var ot=(j%4)*150000,allow=250000+(j%3)*100000,gross=e.salary+allow+ot,bpjs=Math.round(e.salary*.01),tax=Math.max(0,Math.round((gross-4500000)*.025));
 payroll.push({employee:e.id,period:'Januari 2026',basic:e.salary,allow:allow,ot:ot,deduction:bpjs+tax,net:gross-bpjs-tax});
 performance.push({employee:e.id,score:78+j%19,rating:j%5===0?'Excellent':j%3===0?'Very Good':'Good',status:j%7===0?'Needs Review':'Completed'});
 if(j%2===0)training.push({employee:e.id,program:['K3 & Keselamatan Kerja','Leadership Essentials','Excel untuk Administrasi','Customer Service Excellence'][j%4],status:j%6===0?'Registered':'Completed'});
}
var jobs=[['Staff Gudang','Gudang',18,'Screening'],['Operator Produksi','Produksi',24,'Interview'],['HR Generalist','Human Resources',31,'Applied'],['Sales Executive','Sales',14,'Offer'],['Frontend Developer','IT',12,'Interview'],['Customer Service','Customer Service',27,'Screening'],['Finance Staff','Finance',9,'Hired'],['Digital Marketing','Marketing',21,'Applied']];
var candidates=[];
for(var q=0;q<24;q++){var job=jobs[q%jobs.length];candidates.push({name:names[(q+17)%names.length],job:job[0],department:job[1],stage:['Applied','Screening','Interview','Offer'][q%4],date:'2026-01-'+String(3+q%20).padStart(2,'0')});}
var audit=[['09:12','HR Demo','UPDATE','employees','EMP014'],['09:18','HR Demo','APPROVE','leave_requests','LV004'],['10:03','Manager Demo','APPROVE','overtime_requests','OT006'],['10:22','HR Demo','GENERATE','payroll','JAN-2026'],['11:07','Admin Demo','EXPORT','reports','attendance'],['13:44','HR Demo','UPDATE','candidate','JOB003']];

var role='admin',page='dashboard',query='';
var menus={
 admin:[['Utama',['dashboard|Dashboard','employees|Data Karyawan','attendance|Absensi','shifts|Shift Kerja','leave|Cuti & Izin','overtime|Lembur','payroll|Payroll']],['Talenta',['recruitment|Rekrutmen','performance|Kinerja','training|Training']],['Lainnya',['claims|Reimbursement','reports|Laporan & Audit','directory|Direktori','settings|Pengaturan']]],
 hr:[['Utama',['dashboard|Dashboard','employees|Data Karyawan','attendance|Absensi','shifts|Shift Kerja','leave|Cuti & Izin','overtime|Lembur','payroll|Payroll']],['Talenta',['recruitment|Rekrutmen','performance|Kinerja','training|Training']],['Lainnya',['claims|Reimbursement','reports|Laporan & Audit','directory|Direktori']]],
 manager:[['Tim',['dashboard|Dashboard','team|Tim Saya','attendance|Absensi Tim','leave|Cuti Tim','overtime|Lembur Tim','performance|Kinerja Tim','training|Training']],['Lainnya',['reports|Laporan Tim','directory|Direktori']]],
 employee:[['Saya',['dashboard|Dashboard','my-attendance|Absensi Saya','my-leave|Cuti Saya','my-overtime|Lembur Saya','my-payslip|Slip Gaji','my-claims|Klaim Saya','reports|Laporan Saya']],['Perusahaan',['directory|Direktori','training|Training']]]
};
var roleLabel={admin:'Administrator',hr:'Staf HR',manager:'Manager Produksi',employee:'Karyawan'};

function esc(x){return String(x==null?'':x).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]});}
function money(x){return 'Rp'+Number(x||0).toLocaleString('id-ID');}
function dt(x){return new Date(x+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});}
function emp(id){return employees.find(function(x){return x.id===id;});}
function initials(n){return n.split(' ').slice(0,2).map(function(x){return x[0];}).join('');}
function scope(){if(role==='manager')return employees.filter(function(e){return e.department==='Produksi';});if(role==='employee')return [employees[0]];return employees;}
function ids(){return new Set(scope().map(function(e){return e.id;}));}
function B(t){var c=['Approved','Present','Completed','Active','Hired','Offer','Excellent','Very Good'].includes(t)?'green':['Pending','Late','Screening','Interview','Registered','Needs Review'].includes(t)?'yellow':['Absent','Inactive','Rejected'].includes(t)?'red':'blue';return '<span class="badge '+c+'">'+esc(t)+'</span>';}
function E(e){return '<div class="employee"><span class="avatar">'+initials(e.name)+'</span><span><b>'+esc(e.name)+'</b><br><small class="muted">'+e.code+'</small></span></div>';}
function T(head,rows){return '<div class="table-wrap"><table><thead><tr>'+head.map(function(x){return '<th>'+x+'</th>';}).join('')+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+head.length+'" class="empty">Tidak ada data</td></tr>')+'</tbody></table></div>';}
function pageTitle(){var x={dashboard:'Dashboard',employees:'Data Karyawan',team:'Tim Saya',attendance:'Absensi','my-attendance':'Absensi Saya',shifts:'Shift Kerja',leave:'Cuti & Izin','my-leave':'Cuti Saya',overtime:'Lembur','my-overtime':'Lembur Saya',payroll:'Payroll','my-payslip':'Slip Gaji',recruitment:'Rekrutmen',performance:'Kinerja',training:'Training',claims:'Reimbursement','my-claims':'Klaim Saya',reports:role==='employee'?'Laporan Saya':role==='manager'?'Laporan Tim':'Laporan & Audit',directory:'Direktori Karyawan',settings:'Pengaturan'};return x[page]||'Dashboard';}

function setRole(r){role=r;page='dashboard';renderNav();render();}
window.setRole=setRole;
function go(p){page=p;query='';renderNav();render();}
window.go=go;
function renderNav(){document.getElementById('nav').innerHTML=menus[role].map(function(g){return '<div class="group"><div class="label">'+g[0]+'</div>'+g[1].map(function(x){var z=x.split('|');return '<div class="item '+(page===z[0]?'active':'')+'" onclick="go(\\''+z[0]+'\\')"><span>◆</span><span>'+z[1]+'</span></div>';}).join('')+'</div>';}).join('');}

function dashboard(){
 var em=scope(),set=ids(),a=attendance.filter(function(x){return set.has(x.employee)&&x.date==='2026-01-15';}),present=a.filter(function(x){return x.status!=='Absent';}).length;
 var pendingLeave=leave.filter(function(x){return set.has(x.employee)&&x.status==='Pending';}).length;
 var pendingOT=overtime.filter(function(x){return set.has(x.employee)&&x.status==='Pending';}).length;
 var dept=departments.map(function(d){return employees.filter(function(e){return e.department===d;}).length;});
 return '<div class="hero"><h1>MyHRIS Demo</h1><p>Role aktif: <b>'+roleLabel[role]+'</b> · 50 karyawan simulasi · tidak terhubung ke Supabase.</p></div>'+
 '<div class="grid4"><div class="card"><div class="stat">'+em.length+'</div><div class="muted">Karyawan dalam lingkup</div></div><div class="card"><div class="stat">'+present+'/'+em.length+'</div><div class="muted">Hadir 15 Jan</div></div><div class="card"><div class="stat">'+pendingLeave+'</div><div class="muted">Cuti Menunggu</div></div><div class="card"><div class="stat">'+pendingOT+'</div><div class="muted">Lembur Menunggu</div></div></div><div style="height:14px"></div>'+
 '<div class="grid2"><div class="card"><h3 class="section-title">Komposisi Departemen</h3><div class="chart">'+dept.map(function(n,i){return '<div class="bar" style="height:'+(35+n*7)+'px"><span>'+n+'</span></div>';}).join('')+'</div><div class="muted">Produksi · Gudang · HR · Finance · Sales · Marketing · IT · CS</div></div>'+
 '<div class="card"><h3 class="section-title">Aktivitas Terbaru</h3>'+audit.map(function(x){return '<div style="padding:8px 0;border-bottom:1px solid #eee;font-size:12px"><b>'+x[1]+'</b> · '+x[2]+' <span class="muted">· '+x[0]+'</span><br><span class="muted">'+x[3]+' / '+x[4]+'</span></div>';}).join('')+'</div></div>';
}
function employeesPage(){
 var data=scope().filter(function(e){return (e.name+' '+e.code+' '+e.department).toLowerCase().includes(query.toLowerCase());});
 return '<div class="toolbar"><input placeholder="Cari karyawan..." value="'+esc(query)+'" oninput="query=this.value;render()"><button class="btn primary" onclick="demoAdd(\\'employee\\')">+ Tambah Karyawan</button></div>'+T(['Karyawan','Departemen','Jabatan','Bergabung','Status','Gaji Pokok',''],data.map(function(e){return '<tr><td>'+E(e)+'</td><td>'+e.department+'</td><td>'+e.position+'</td><td>'+dt(e.join)+'</td><td>'+B(e.status)+'</td><td>'+money(e.salary)+'</td><td><button class="btn outline" onclick="showEmployee(\\''+e.id+'\\')">Detail</button></td></tr>';}))+'<p class="muted">Dataset demo: 50 karyawan. Tambah/Edit hanya mengubah memory browser.</p>';
}
function attendancePage(){var set=ids(),data=attendance.filter(function(a){return set.has(a.employee);});return '<div class="toolbar"><input placeholder="Cari karyawan..." value="'+esc(query)+'" oninput="query=this.value;render()"><button class="btn primary" onclick="go(\\'reports\\')">Laporan Bulanan</button></div>'+T(['Tanggal','Karyawan','Shift','Masuk','Keluar','Status'],data.filter(function(a){return !query||emp(a.employee).name.toLowerCase().includes(query.toLowerCase());}).slice(0,140).map(function(a){return '<tr><td>'+dt(a.date)+'</td><td>'+E(emp(a.employee))+'</td><td>'+a.shift+'<br><small class="muted">'+a.time+'</small></td><td>'+a.in+'</td><td>'+a.out+'</td><td>'+B(a.status)+'</td></tr>';}))+'<p class="muted">Laporan dapat menampilkan seluruh dataset dalam mode demo.</p>';}
function myAttendance(){return attendancePage();}
function shiftsPage(){return '<div class="grid2">'+shifts.map(function(s){return '<div class="card"><h3 class="section-title">'+s.name+'</h3><div style="font:700 22px Manrope">'+s.start+' — '+s.end+'</div><p class="muted">Toleransi '+s.tol+' menit</p><div class="progress"><i style="width:'+(60+s.tol)+'%"></i></div></div>';}).join('')+'</div>';}
function leavePage(){var set=ids(),rows=leave.filter(function(x){return set.has(x.employee);});return '<div class="toolbar"><span class="muted">'+rows.length+' pengajuan cuti demo</span><button class="btn primary" onclick="demoAdd(\\'leave\\')">+ Ajukan Cuti</button></div>'+T(['Pengajuan','Karyawan','Jenis','Mulai','Hari','Status'],rows.map(function(x){return '<tr><td>'+x.id+'</td><td>'+E(emp(x.employee))+'</td><td>'+x.type+'</td><td>'+dt(x.start)+'</td><td>'+x.days+'</td><td>'+B(x.status)+'</td></tr>';}));}
function myLeave(){return '<div class="grid4"><div class="card"><div class="stat">'+(employees[0].leave-employees[0].used)+'</div><div class="muted">Sisa Cuti</div></div><div class="card"><div class="stat">'+employees[0].used+'</div><div class="muted">Terpakai</div></div><div class="card"><div class="stat">'+employees[0].leave+'</div><div class="muted">Hak Tahunan</div></div><div class="card"><button class="btn primary" onclick="demoAdd(\\'leave\\')">Ajukan Cuti</button></div></div><div style="height:14px"></div>'+leavePage();}
function overtimePage(){var set=ids(),rows=overtime.filter(function(x){return set.has(x.employee);});return '<div class="toolbar"><button class="btn primary" onclick="demoAdd(\\'overtime\\')">+ Pengajuan Lembur</button></div>'+T(['Tanggal','Karyawan','Jam','Nilai','Status'],rows.map(function(x){return '<tr><td>'+dt(x.date)+'</td><td>'+E(emp(x.employee))+'</td><td>'+x.hours+' jam</td><td>'+money(x.amount)+'</td><td>'+B(x.status)+'</td></tr>';}));}
function payrollPage(){var set=ids(),rows=payroll.filter(function(x){return set.has(x.employee);});return '<div class="toolbar"><span class="muted">Januari 2026 · '+rows.length+' slip demo</span><button class="btn primary" onclick="go(\\'reports\\')">Laporan Payroll</button></div>'+T(['Periode','Karyawan','Gaji Pokok','Tunjangan','Lembur','Potongan','THP'],rows.map(function(x){return '<tr><td>'+x.period+'</td><td>'+E(emp(x.employee))+'</td><td>'+money(x.basic)+'</td><td>'+money(x.allow)+'</td><td>'+money(x.ot)+'</td><td>'+money(x.deduction)+'</td><td><b>'+money(x.net)+'</b></td></tr>';}));}
function myPayslip(){var x=payroll[0],e=employees[0];return '<div class="hero"><h1>Slip Gaji — Januari 2026</h1><p>'+e.name+' · '+e.code+'</p></div><div class="grid2"><div class="card"><h3 class="section-title">Pendapatan</h3><p>Gaji Pokok <b style="float:right">'+money(x.basic)+'</b></p><p>Tunjangan <b style="float:right">'+money(x.allow)+'</b></p><p>Lembur <b style="float:right">'+money(x.ot)+'</b></p></div><div class="card"><h3 class="section-title">Potongan & THP</h3><p>Potongan <b style="float:right">'+money(x.deduction)+'</b></p><hr><p><b>Take Home Pay</b><b style="float:right;color:var(--accent)">'+money(x.net)+'</b></p></div></div>';}
function recruitmentPage(){return '<div class="grid4">'+jobs.map(function(j){return '<div class="card"><div class="muted">'+j[1]+'</div><h3 class="section-title">'+j[0]+'</h3><div class="stat">'+j[2]+'</div><div class="muted">pelamar · '+B(j[3])+'</div></div>';}).join('')+'</div><div style="height:14px"></div>'+T(['Kandidat','Lowongan','Departemen','Tanggal','Tahap'],candidates.map(function(c){return '<tr><td>'+c.name+'</td><td>'+c.job+'</td><td>'+c.department+'</td><td>'+dt(c.date)+'</td><td>'+B(c.stage)+'</td></tr>';}));}
function performancePage(){var set=ids(),rows=performance.filter(function(x){return set.has(x.employee);}),avg=Math.round(rows.reduce(function(a,x){return a+x.score;},0)/Math.max(1,rows.length));return '<div class="grid4"><div class="card"><div class="stat">'+rows.length+'</div><div class="muted">Penilaian</div></div><div class="card"><div class="stat">'+avg+'</div><div class="muted">Rata-rata skor</div></div><div class="card"><div class="stat">'+rows.filter(function(x){return x.score>=90;}).length+'</div><div class="muted">Top performer</div></div><div class="card"><div class="stat">'+rows.filter(function(x){return x.status==='Needs Review';}).length+'</div><div class="muted">Perlu review</div></div></div><div style="height:14px"></div>'+T(['Karyawan','Skor','Rating','Status'],rows.map(function(x){return '<tr><td>'+E(emp(x.employee))+'</td><td><b>'+x.score+'</b></td><td>'+B(x.rating)+'</td><td>'+B(x.status)+'</td></tr>';}));}
function trainingPage(){var set=ids(),rows=training.filter(function(x){return set.has(x.employee);});return '<div class="grid2">'+['K3 & Keselamatan Kerja','Leadership Essentials','Excel untuk Administrasi','Customer Service Excellence'].map(function(p,i){return '<div class="card"><div class="muted">MyHRIS Academy · Januari 2026</div><h3 class="section-title">'+p+'</h3><div>'+(12+i*3)+' peserta</div><div class="progress" style="margin-top:8px"><i style="width:'+(60+i*8)+'%"></i></div></div>';}).join('')+'</div><div style="height:14px"></div>'+T(['Karyawan','Program','Status'],rows.map(function(x){return '<tr><td>'+E(emp(x.employee))+'</td><td>'+x.program+'</td><td>'+B(x.status)+'</td></tr>';}));}
function claimsPage(){var set=ids(),rows=claims.filter(function(x){return set.has(x.employee);});return '<div class="toolbar"><button class="btn primary" onclick="demoAdd(\\'claim\\')">+ Ajukan Klaim</button></div>'+T(['Tanggal','Karyawan','Kategori','Nominal','Status'],rows.map(function(x){return '<tr><td>'+dt(x.date)+'</td><td>'+E(emp(x.employee))+'</td><td>'+x.category+'</td><td>'+money(x.amount)+'</td><td>'+B(x.status)+'</td></tr>';}));}

function reportsPage(){
 return '<div class="hero"><h1>Laporan & Audit</h1><p>Gunakan filter untuk mendemokan kebutuhan laporan HR, Manager, dan Employee.</p></div><div class="card"><div class="toolbar"><select id="rt" onchange="demoReport()"><option value="attendance">Absensi</option><option value="leave">Cuti</option><option value="overtime">Lembur</option><option value="payroll">Payroll</option><option value="recruitment">Rekrutmen</option><option value="performance">Kinerja</option><option value="training">Training</option><option value="claims">Reimbursement</option><option value="employees">Karyawan</option><option value="audit">Audit Log</option></select><select id="re" onchange="demoReport()"><option value="">Semua dalam lingkup</option>'+scope().map(function(e){return '<option value="'+e.id+'">'+e.code+' — '+e.name+'</option>';}).join('')+'</select><input id="rs" type="date" value="2026-01-01"><input id="re2" type="date" value="2026-01-31"><button class="btn outline" onclick="downloadCSV()">CSV</button><button class="btn outline" onclick="downloadExcel()">Excel</button><button class="btn primary" onclick="window.print()">PDF / Cetak</button></div><div id="rr"></div></div>';
}
function demoReport(){
 var type=document.getElementById('rt').value,selected=document.getElementById('re').value,set=ids(),rows=[],head=[];
 function ok(x){return set.has(x.employee)&&(!selected||x.employee===selected);}
 if(type==='attendance'){head=['Tanggal','Karyawan','Shift','Masuk','Keluar','Status'];rows=attendance.filter(ok).map(function(x){return [dt(x.date),emp(x.employee).name,x.shift,x.in,x.out,x.status];});}
 if(type==='leave'){head=['Karyawan','Jenis','Mulai','Hari','Status'];rows=leave.filter(ok).map(function(x){return [emp(x.employee).name,x.type,dt(x.start),x.days,x.status];});}
 if(type==='overtime'){head=['Tanggal','Karyawan','Jam','Nilai','Status'];rows=overtime.filter(ok).map(function(x){return [dt(x.date),emp(x.employee).name,x.hours,money(x.amount),x.status];});}
 if(type==='payroll'){head=['Periode','Karyawan','Gaji Pokok','Tunjangan','Lembur','Potongan','THP'];rows=payroll.filter(ok).map(function(x){return [x.period,emp(x.employee).name,money(x.basic),money(x.allow),money(x.ot),money(x.deduction),money(x.net)];});}
 if(type==='recruitment'){head=['Kandidat','Lowongan','Departemen','Tanggal','Tahap'];rows=candidates.map(function(x){return [x.name,x.job,x.department,dt(x.date),x.stage];});}
 if(type==='performance'){head=['Karyawan','Skor','Rating','Status'];rows=performance.filter(ok).map(function(x){return [emp(x.employee).name,x.score,x.rating,x.status];});}
 if(type==='training'){head=['Karyawan','Program','Status'];rows=training.filter(ok).map(function(x){return [emp(x.employee).name,x.program,x.status];});}
 if(type==='claims'){head=['Tanggal','Karyawan','Kategori','Nominal','Status'];rows=claims.filter(ok).map(function(x){return [dt(x.date),emp(x.employee).name,x.category,money(x.amount),x.status];});}
 if(type==='employees'){head=['Kode','Nama','Departemen','Jabatan','Status'];rows=scope().filter(function(x){return !selected||x.id===selected;}).map(function(x){return [x.code,x.name,x.department,x.position,x.status];});}
 if(type==='audit'){head=['Waktu','User','Aksi','Entitas','ID'];rows=audit;}
 document.getElementById('rr').innerHTML=T(head,rows.map(function(r){return '<tr>'+r.map(function(v){return '<td>'+esc(v)+'</td>';}).join('')+'</tr>';}));
}
window.demoReport=demoReport;
function downloadCSV(){var t=document.querySelector('#rr table');if(!t)return;var lines=[].slice.call(t.rows).map(function(r){return [].slice.call(r.cells).map(function(c){return '"'+c.innerText.replace(/"/g,'""')+'"';}).join(',');});var blob=new Blob(['\\uFEFF'+lines.join('\\r\\n')],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='MyHRIS-Demo-Report.csv';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},500);}
function downloadExcel(){alert('Demo UI: tombol Excel tersedia sebagai simulasi. Versi production memakai export XLSX dari modul laporan.');}
function directoryPage(){return T(['Karyawan','Departemen','Jabatan','Kontak'],scope().map(function(e){return '<tr><td>'+E(e)+'</td><td>'+e.department+'</td><td>'+e.position+'</td><td>'+e.email+'<br>'+e.phone+'</td></tr>';}));}
function settingsPage(){return '<div class="card"><h3 class="section-title">Demo Environment</h3><p class="muted">Mode Demo aktif. Tidak ada Supabase client, auth, atau database write pada halaman ini.</p><hr><p><b>Dataset:</b> 50 karyawan · 4 shift · absensi · cuti · lembur · payroll · klaim · rekrutmen · kinerja · training · audit log.</p><p><b>Role:</b> gunakan selector kiri untuk melihat perbedaan menu dan lingkup data.</p></div>';}
function showEmployee(id){var e=emp(id),p=payroll.find(function(x){return x.employee===id;});document.getElementById('modalBox').innerHTML='<span class="close" onclick="closeModal()">×</span><h2 style="font-family:Manrope">'+esc(e.name)+'</h2><p class="muted">'+e.code+' · '+e.department+' · '+e.position+'</p><div class="grid2" style="margin-top:14px"><div class="card"><b>Employment</b><p>Bergabung: '+dt(e.join)+'</p><p>Status: '+B(e.status)+'</p><p>Shift: '+shifts.find(function(s){return s.id===e.shift;}).name+'</p></div><div class="card"><b>Payroll Januari</b><p>Gaji Pokok: '+money(p.basic)+'</p><p>THP: <b>'+money(p.net)+'</b></p></div></div>';document.getElementById('modal').classList.add('show');}
window.showEmployee=showEmployee;
function closeModal(){document.getElementById('modal').classList.remove('show');}
window.closeModal=closeModal;
function demoAdd(type){
 var e=scope()[0];
 if(type==='leave')leave.unshift({id:'DEMO-LV-'+Date.now(),employee:e.id,type:'Annual Leave',start:'2026-02-03',days:2,status:'Pending'});
 if(type==='overtime')overtime.unshift({id:'DEMO-OT-'+Date.now(),employee:e.id,date:'2026-02-05',hours:2,amount:150000,status:'Pending'});
 if(type==='claim')claims.unshift({id:'DEMO-CL-'+Date.now(),employee:e.id,date:'2026-02-06',category:'Transport',amount:100000,status:'Pending'});
 if(type==='employee')employees.push({id:'DEMO-'+Date.now(),code:'DEMO'+(employees.length+1),name:'Karyawan Demo Baru',email:'new@demo.local',phone:'0800000000',department:'IT',position:'Staff',join:'2026-01-01',shift:'S1',status:'Active',salary:3000000,leave:12,used:0});
 alert('Data berhasil disimulasikan. TIDAK masuk Supabase dan hanya hidup di halaman demo.');
 render();
}

function render(){
 document.getElementById('title').textContent=pageTitle();
 var fn={dashboard:dashboard,employees:employeesPage,team:employeesPage,attendance:attendancePage,'my-attendance':myAttendance,shifts:shiftsPage,leave:leavePage,'my-leave':myLeave,overtime:overtimePage,'my-overtime':overtimePage,payroll:payrollPage,'my-payslip':myPayslip,recruitment:recruitmentPage,performance:performancePage,training:trainingPage,claims:claimsPage,'my-claims':claimsPage,reports:reportsPage,directory:directoryPage,settings:settingsPage};
 document.getElementById('content').innerHTML=(fn[page]||dashboard)();
 if(page==='reports')demoReport();
}
window.render=render;
renderNav();render();
