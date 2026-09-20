import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, Users, UserPlus, CalendarCheck, CalendarDays, WalletCards,
  FileText, ArrowLeftRight, Target, GraduationCap, LogOut, BarChart3, Settings,
  ShieldCheck, Search, Bell, ChevronDown, ChevronRight, Menu, X, Plus, Download,
  MoreHorizontal, CheckCircle2, Clock3, AlertCircle, BriefcaseBusiness,
  Building2, ClipboardList, CircleDollarSign, UserRoundCheck, RefreshCcw, Trash2
} from "lucide-react";
import { supabase, supabaseConfigured } from "./lib/supabase";
import {
  listEmployees, createEmployee, deleteEmployee,
  listCandidates, createCandidate,
  listAttendance, createAttendance,
  listLeaveRequests, createLeaveRequest, updateLeaveStatus,
  listContracts, listMovements, listPerformance, listTrainings,
  listOffboarding, listPayrollRuns
} from "./services/hris";
import "./styles.css";

const nav = [
  { id:"dashboard", label:"Dashboard", icon:LayoutDashboard },
  { id:"employees", label:"Employees", icon:Users },
  { id:"recruitment", label:"Recruitment", icon:UserPlus },
  { id:"attendance", label:"Attendance", icon:CalendarCheck },
  { id:"leave", label:"Leave & Permission", icon:CalendarDays },
  { id:"overtime", label:"Overtime", icon:Clock3 },
  { id:"payroll", label:"Payroll", icon:WalletCards },
  { id:"contracts", label:"Contracts", icon:FileText },
  { id:"movements", label:"Movement", icon:ArrowLeftRight },
  { id:"performance", label:"Performance", icon:Target },
  { id:"training", label:"Training", icon:GraduationCap },
  { id:"offboarding", label:"Offboarding", icon:LogOut },
  { id:"reports", label:"Reports", icon:BarChart3 },
  { id:"settings", label:"Settings", icon:Settings }
];

const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const dateID = s => s ? new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const initials = n => (n||"?").split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();

function Badge({children}) {
  const tone = children==="Active"||children==="Approved"||children==="Hired"||children==="Present" ? "success" :
    children==="Pending"||children==="Probation"||children==="Interview"||children==="Test"||children==="Draft" ? "warning" :
    children==="Late"||children==="Rejected" ? "danger" : "neutral";
  return <span className={"badge "+tone}>{children}</span>;
}

function PageHeader({title,desc,action}) {
  return <div className="page-title"><div><h1>{title}</h1><p>{desc}</p></div>{action}</div>
}

function EmptyState({title="No data",text="Belum ada data di database."}) {
  return <div className="empty"><div className="empty-icon"><ClipboardList size={22}/></div><b>{title}</b><span>{text}</span></div>
}

function Modal({title,onClose,children}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div>
  </div>
}

function KPI({icon:Icon,label,value,sub,tone=""}) {
  return <div className="kpi"><div className={"kpi-icon "+tone}><Icon size={20}/></div><div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div>{sub&&<div className="kpi-sub">{sub}</div>}</div></div>
}

function Table({columns,rows,renderCell}) {
  if(!rows.length) return <EmptyState title="Table is empty" text="Tambahkan data untuk melihatnya di sini."/>;
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
    {rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c}>{renderCell?renderCell(r,c):r[c]??"—"}</td>)}</tr>)}
  </tbody></table></div>
}

function FormField({label,children}) {
  return <label>{label}{children}</label>
}

function App(){
  const [page,setPage]=useState("dashboard");
  const [mobileOpen,setMobileOpen]=useState(false);
  const [dbState,setDbState]=useState(supabaseConfigured?"Checking...":"Config missing");
  const [employees,setEmployees]=useState([]);
  const [candidates,setCandidates]=useState([]);
  const [attendance,setAttendance]=useState([]);
  const [leave,setLeave]=useState([]);
  const [contracts,setContracts]=useState([]);
  const [movements,setMovements]=useState([]);
  const [performance,setPerformance]=useState([]);
  const [trainings,setTrainings]=useState([]);
  const [offboarding,setOffboarding]=useState([]);
  const [payrollRuns,setPayrollRuns]=useState([]);
  const [error,setError]=useState("");

  const refresh = async () => {
    if(!supabase) { setDbState("Config missing"); return; }
    setError("");
    try {
      const [e,c,a,l,ct,m,p,t,o,pr] = await Promise.all([
        listEmployees(), listCandidates(), listAttendance(), listLeaveRequests(),
        listContracts(), listMovements(), listPerformance(), listTrainings(),
        listOffboarding(), listPayrollRuns()
      ]);
      setEmployees(e); setCandidates(c); setAttendance(a); setLeave(l);
      setContracts(ct); setMovements(m); setPerformance(p); setTrainings(t);
      setOffboarding(o); setPayrollRuns(pr); setDbState("Supabase connected");
    } catch(err) {
      console.error(err);
      setDbState("Supabase error");
      setError(err.message || "Query gagal");
    }
  };

  useEffect(()=>{refresh()},[]);

  const content = page==="dashboard"
    ? <Dashboard employees={employees} candidates={candidates} leave={leave} attendance={attendance}/>
    : page==="employees" ? <Employees employees={employees} reload={refresh}/>
    : page==="recruitment" ? <Recruitment candidates={candidates} reload={refresh}/>
    : page==="attendance" ? <Attendance attendance={attendance} employees={employees} reload={refresh}/>
    : page==="leave" ? <Leave leave={leave} employees={employees} reload={refresh}/>
    : page==="payroll" ? <Payroll employees={employees} payrollRuns={payrollRuns}/>
    : <GenericModule page={page} counts={{employees,candidates,attendance,leave,contracts,movements,performance,trainings,offboarding,payrollRuns}}/>;

  const statusClass = dbState==="Supabase connected" ? "on" : "warn";

  return <div className="app">
    <header className="topbar">
      <button className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button>
      <div className="brand">People<span>Flow</span></div>
      <div className="top-search"><Search size={17}/><input placeholder="Search anything..."/></div>
      <div className="top-actions">
        <span className={"db-dot "+statusClass}></span><span className="db-status">{dbState}</span>
        <button className="icon-btn" onClick={refresh} title="Refresh"><RefreshCcw size={18}/></button>
        <button className="icon-btn"><Bell size={19}/><i/></button>
        <div className="profile"><div className="avatar">HR</div><div><b>HR Admin</b><small>Administrator</small></div><ChevronDown size={15}/></div>
      </div>
    </header>

    <aside className={"sidebar "+(mobileOpen?"open":"")}>
      <div className="side-top"><span>HR Workspace</span><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <div className="workspace"><Building2 size={16}/><span>Sample Company</span><ChevronDown size={14}/></div>
      <nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={page===n.id?"active":""} onClick={()=>{setPage(n.id);setMobileOpen(false)}}><Icon size={18}/><span>{n.label}</span>{n.id==="leave"&&leave.filter(x=>x.status==="Pending").length>0&&<em>{leave.filter(x=>x.status==="Pending").length}</em>}</button>})}</nav>
      <div className="sidebar-foot"><div className="mini-card"><ShieldCheck size={17}/><div><b>Supabase gateway</b><span>{dbState}</span></div></div></div>
    </aside>

    <main className="main">
      {error && <div className="alert"><AlertCircle size={17}/><span>{error}</span></div>}
      {content}
    </main>
    {mobileOpen&&<div className="mobile-overlay" onClick={()=>setMobileOpen(false)}/>}
  </div>
}

function Dashboard({employees,candidates,leave,attendance}) {
  const active=employees.filter(e=>e.status==="Active").length;
  const pending=leave.filter(x=>x.status==="Pending").length;
  const late=attendance.filter(x=>x.status==="Late").length;
  const payrollTotal=employees.reduce((s,e)=>s+Number(e.salary||0),0);
  return <div className="page">
    <PageHeader title="Good morning, HR 👋" desc="Ringkasan aktivitas people hari ini." action={<button className="btn primary"><Plus size={16}/> Quick Action</button>}/>
    <div className="kpi-grid">
      <KPI icon={Users} label="Total Employees" value={employees.length} sub={`${active} active`} tone="green"/>
      <KPI icon={UserPlus} label="Candidates" value={candidates.length} sub="From Supabase" tone="blue"/>
      <KPI icon={CalendarDays} label="Pending Leave" value={pending} sub="Need approval" tone="orange"/>
      <KPI icon={CircleDollarSign} label="Monthly Base Salary" value={money(payrollTotal)} sub="Current employee master" tone="purple"/>
    </div>
    <div className="grid-2">
      <section className="card">
        <div className="card-head"><div><h2>Attendance</h2><span>Latest records from Supabase</span></div></div>
        <div className="attendance-summary">
          <div><strong>{attendance.filter(x=>x.status==="Present").length}</strong><span>Present records</span></div>
          <div><strong>{late}</strong><span>Late</span></div>
          <div><strong>{attendance.filter(x=>x.status==="Leave").length}</strong><span>Leave</span></div>
          <div><strong>{attendance.filter(x=>x.status==="Absent").length}</strong><span>Absent</span></div>
        </div>
        <Table columns={["Employee","Check in","Check out","Status"]} rows={attendance.slice(0,5)} renderCell={(r,c)=>
          c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee_name)}</div><span>{r.employee_name}</span></div>:
          c==="Check in"?r.check_in||"—":c==="Check out"?r.check_out||"—":c==="Status"?<Badge>{r.status}</Badge>:"—"
        }/>
      </section>
      <section className="card">
        <div className="card-head"><div><h2>Leave Requests</h2><span>Latest approvals</span></div></div>
        {leave.slice(0,5).map(x=><div className="request" key={x.id}>
          <div className="avatar">{initials(x.employee_name)}</div><div className="request-main"><b>{x.employee_name}</b><span>{x.leave_type} · {x.days} day(s)</span><small>{dateID(x.start_date)} – {dateID(x.end_date)}</small></div><Badge>{x.status}</Badge>
        </div>)}
        {!leave.length&&<EmptyState/>}
      </section>
    </div>
    <section className="card">
      <div className="card-head"><div><h2>Headcount</h2><span>By department</span></div></div>
      <div className="bars">{[...new Set(employees.map(e=>e.department).filter(Boolean))].map(d=>{const n=employees.filter(e=>e.department===d).length;const pct=Math.max(10,employees.length?(n/employees.length)*100:0);return <div className="bar-row" key={d}><span>{d}</span><div className="bar"><i style={{width:pct+"%"}}/></div><b>{n}</b></div>})}</div>
      {!employees.length&&<EmptyState/>}
    </section>
  </div>
}

function Employees({employees,reload}){
  const [q,setQ]=useState(""); const [modal,setModal]=useState(false); const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:"",position:"",department:"",type:"PKWTT",status:"Active",joined:new Date().toISOString().slice(0,10),salary:"",email:"",phone:""});
  const filtered=employees.filter(e=>Object.values(e).join(" ").toLowerCase().includes(q.toLowerCase()));
  const save=async()=>{if(!form.name.trim())return;setSaving(true);try{await createEmployee(form);setModal(false);setForm({...form,name:"",position:"",salary:"",email:"",phone:""});await reload()}catch(e){alert(e.message)}finally{setSaving(false)}};
  const remove=async(id)=>{if(!confirm("Delete employee "+id+"?"))return;try{await deleteEmployee(id);await reload()}catch(e){alert(e.message)}};
  return <div className="page"><PageHeader title="Employees" desc="Master data karyawan yang tersimpan di Supabase." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Add Employee</button>}/>
    <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search employee, ID, department..."/></div><button className="btn ghost" onClick={()=>downloadCSV(filtered,"employees.csv")}><Download size={16}/> Export CSV</button></div>
    <section className="card"><Table columns={["Employee","Position","Department","Employment","Status","Joined","Salary",""]} rows={filtered} renderCell={(r,c)=>{
      if(c==="Employee")return <div className="person"><div className="avatar">{initials(r.name)}</div><div><b>{r.name}</b><small>{r.id}</small></div></div>;
      if(c==="Position")return r.position||"—"; if(c==="Department")return r.department||"—"; if(c==="Employment")return r.type||"—"; if(c==="Status")return <Badge>{r.status}</Badge>; if(c==="Joined")return dateID(r.joined); if(c==="Salary")return money(r.salary);
      return <button className="icon-btn danger-text" title="Delete" onClick={()=>remove(r.id)}><Trash2 size={16}/></button>;
    }}/></section>
    {modal&&<Modal title="Add employee" onClose={()=>setModal(false)}>
      <div className="form-grid">
        <FormField label="Full name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FormField>
        <FormField label="Position"><input value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/></FormField>
        <FormField label="Department"><select value={form.department} onChange={e=>setForm({...form,department:e.target.value})}><option value="">Select...</option>{["Human Resources","Finance","Warehouse","Sales","IT","Customer Service"].map(x=><option key={x}>{x}</option>)}</select></FormField>
        <FormField label="Employment"><select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>PKWTT</option><option>PKWT</option></select></FormField>
        <FormField label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}><option>Active</option><option>Probation</option><option>On Leave</option></select></FormField>
        <FormField label="Join date"><input type="date" value={form.joined} onChange={e=>setForm({...form,joined:e.target.value})}/></FormField>
        <FormField label="Monthly salary"><input type="number" value={form.salary} onChange={e=>setForm({...form,salary:e.target.value})}/></FormField>
        <FormField label="Email"><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></FormField>
        <FormField label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></FormField>
      </div>
      <div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save employee"}</button></div>
    </Modal>}
  </div>
}

function Recruitment({candidates,reload}){
  const [modal,setModal]=useState(false),[saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:"",position:"",stage:"Screening",source:"Job Portal",email:"",phone:""});
  const save=async()=>{if(!form.name.trim())return;setSaving(true);try{await createCandidate(form);setModal(false);setForm({...form,name:"",position:"",email:"",phone:""});await reload()}catch(e){alert(e.message)}finally{setSaving(false)}};
  return <div className="page"><PageHeader title="Recruitment" desc="ATS sederhana: vacancy, screening, test, interview, hiring." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Add Candidate</button>}/>
    <div className="kpi-grid mini"><KPI icon={BriefcaseBusiness} label="Pipeline" value={candidates.length} sub="Candidates" tone="blue"/><KPI icon={Clock3} label="Interview" value={candidates.filter(x=>x.stage==="Interview").length} sub="Candidates" tone="orange"/><KPI icon={CheckCircle2} label="Hired" value={candidates.filter(x=>x.stage==="Hired").length} sub="Candidates" tone="green"/><KPI icon={AlertCircle} label="Rejected" value={candidates.filter(x=>x.stage==="Rejected").length} sub="Candidates" tone="red"/></div>
    <section className="card"><Table columns={["Candidate","Position","Stage","Source","Applied"]} rows={candidates} renderCell={(r,c)=>c==="Candidate"?<div className="person"><div className="avatar">{initials(r.name)}</div><b>{r.name}</b></div>:c==="Stage"?<Badge>{r.stage}</Badge>:c==="Applied"?dateID(r.applied):r[c.toLowerCase()]||"—"}/></section>
    {modal&&<Modal title="Add candidate" onClose={()=>setModal(false)}><div className="form-grid">
      <FormField label="Name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></FormField>
      <FormField label="Position"><input value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/></FormField>
      <FormField label="Stage"><select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{["Screening","Test","Interview","Hired","Rejected"].map(x=><option key={x}>{x}</option>)}</select></FormField>
      <FormField label="Source"><select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{["Job Portal","Referral","LinkedIn","Career Page"].map(x=><option key={x}>{x}</option>)}</select></FormField>
      <FormField label="Email"><input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></FormField>
      <FormField label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></FormField>
    </div><div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save candidate"}</button></div></Modal>}
  </div>
}

function Attendance({attendance,employees,reload}){
  const [modal,setModal]=useState(false),[saving,setSaving]=useState(false);
  const [form,setForm]=useState({employee_id:"",attendance_date:new Date().toISOString().slice(0,10),check_in:"08:00",check_out:"17:00",status:"Present",late_minutes:0});
  const save=async()=>{if(!form.employee_id)return;setSaving(true);try{await createAttendance(form);setModal(false);await reload()}catch(e){alert(e.message)}finally{setSaving(false)}};
  return <div className="page"><PageHeader title="Attendance" desc="Check-in/out, late, absence, leave, dan shift." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Manual Attendance</button>}/>
    <div className="kpi-grid mini"><KPI icon={UserRoundCheck} label="Present" value={attendance.filter(x=>x.status==="Present").length} sub="Records" tone="green"/><KPI icon={Clock3} label="Late" value={attendance.filter(x=>x.status==="Late").length} sub="Records" tone="orange"/><KPI icon={AlertCircle} label="Absent" value={attendance.filter(x=>x.status==="Absent").length} sub="Records" tone="red"/><KPI icon={CalendarDays} label="Leave" value={attendance.filter(x=>x.status==="Leave").length} sub="Records" tone="purple"/></div>
    <section className="card"><Table columns={["Date","Employee","Check in","Check out","Late","Status"]} rows={attendance} renderCell={(r,c)=>c==="Date"?dateID(r.attendance_date):c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee_name)}</div><span>{r.employee_name}</span></div>:c==="Check in"?r.check_in||"—":c==="Check out"?r.check_out||"—":c==="Late"?`${r.late_minutes||0} min`:c==="Status"?<Badge>{r.status}</Badge>:"—"}/></section>
    {modal&&<Modal title="Manual attendance" onClose={()=>setModal(false)}><div className="form-grid">
      <FormField label="Employee"><select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}</select></FormField>
      <FormField label="Date"><input type="date" value={form.attendance_date} onChange={e=>setForm({...form,attendance_date:e.target.value})}/></FormField>
      <FormField label="Check in"><input type="time" value={form.check_in} onChange={e=>setForm({...form,check_in:e.target.value})}/></FormField>
      <FormField label="Check out"><input type="time" value={form.check_out} onChange={e=>setForm({...form,check_out:e.target.value})}/></FormField>
      <FormField label="Status"><select value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{["Present","Late","Absent","Leave"].map(x=><option key={x}>{x}</option>)}</select></FormField>
      <FormField label="Late minutes"><input type="number" value={form.late_minutes} onChange={e=>setForm({...form,late_minutes:e.target.value})}/></FormField>
    </div><div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Saving...":"Save attendance"}</button></div></Modal>}
  </div>
}

function Leave({leave,employees,reload}){
  const [modal,setModal]=useState(false),[saving,setSaving]=useState(false),[form,setForm]=useState({employee_id:"",leave_type:"Annual Leave",start_date:new Date().toISOString().slice(0,10),end_date:new Date().toISOString().slice(0,10),days:1,reason:""});
  const save=async()=>{if(!form.employee_id)return;setSaving(true);try{await createLeaveRequest(form);setModal(false);await reload()}catch(e){alert(e.message)}finally{setSaving(false)}};
  const approve=async(id,status)=>{try{await updateLeaveStatus(id,status);await reload()}catch(e){alert(e.message)}};
  return <div className="page"><PageHeader title="Leave & Permission" desc="Pengajuan, saldo cuti, izin, dan approval." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> New Request</button>}/>
    <div className="kpi-grid mini"><KPI icon={CalendarDays} label="Pending" value={leave.filter(x=>x.status==="Pending").length} sub="Need approval" tone="orange"/><KPI icon={CheckCircle2} label="Approved" value={leave.filter(x=>x.status==="Approved").length} sub="Requests" tone="green"/><KPI icon={Clock3} label="Total requests" value={leave.length} sub="From DB" tone="blue"/><KPI icon={Users} label="Employees" value={employees.length} sub="Current" tone="purple"/></div>
    <section className="card"><Table columns={["Request","Employee","Type","Period","Days","Status",""]} rows={leave} renderCell={(r,c)=>c==="Request"?String(r.id).slice(0,8):c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee_name)}</div><b>{r.employee_name}</b></div>:c==="Type"?r.leave_type:c==="Period"?`${dateID(r.start_date)} – ${dateID(r.end_date)}`:c==="Days"?r.days:c==="Status"?<Badge>{r.status}</Badge>:<div className="row-actions">{r.status==="Pending"&&<><button className="icon-btn" title="Approve" onClick={()=>approve(r.id,"Approved")}><CheckCircle2 size={17}/></button><button className="icon-btn danger" title="Reject" onClick={()=>approve(r.id,"Rejected")}><X size={17}/></button></>}</div>}/></section>
    {modal&&<Modal title="New leave request" onClose={()=>setModal(false)}><div className="form-grid">
      <FormField label="Employee"><select value={form.employee_id} onChange={e=>setForm({...form,employee_id:e.target.value})}><option value="">Select...</option>{employees.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select></FormField>
      <FormField label="Leave type"><select value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})}><option>Annual Leave</option><option>Sick Leave</option><option>Permission</option><option>Other</option></select></FormField>
      <FormField label="Start"><input type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></FormField>
      <FormField label="End"><input type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></FormField>
      <FormField label="Days"><input type="number" value={form.days} onChange={e=>setForm({...form,days:e.target.value})}/></FormField>
      <FormField label="Reason"><input value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></FormField>
    </div><div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" disabled={saving} onClick={save}>{saving?"Saving...":"Submit request"}</button></div></Modal>}
  </div>
}

function Payroll({employees,payrollRuns}){
  const gross=employees.reduce((s,e)=>s+Number(e.salary||0),0);
  return <div className="page"><PageHeader title="Payroll" desc="Payroll run, salary components, deductions, dan payslip foundation." action={<button className="btn primary"><Plus size={16}/> New Payroll Run</button>}/>
    <div className="kpi-grid mini"><KPI icon={WalletCards} label="Base Payroll" value={money(gross)} sub="Current master salary" tone="blue"/><KPI icon={CircleDollarSign} label="Employees" value={employees.length} sub="Included" tone="green"/><KPI icon={FileText} label="Payroll Runs" value={payrollRuns.length} sub="Saved in DB" tone="purple"/><KPI icon={Clock3} label="Current status" value={payrollRuns[0]?.status||"Draft"} sub={payrollRuns[0]?.period||"No run"} tone="orange"/></div>
    <section className="card"><div className="card-head"><div><h2>Employee payroll preview</h2><span>Base salary only — business rules can be added next</span></div></div>
      <Table columns={["Employee","Basic Salary","Allowance","Deduction","Net Preview","Status"]} rows={employees} renderCell={(r,c)=>c==="Employee"?<div className="person"><div className="avatar">{initials(r.name)}</div><b>{r.name}</b></div>:c==="Basic Salary"?money(r.salary):c==="Allowance"?money(0):c==="Deduction"?money(0):c==="Net Preview"?<b>{money(r.salary)}</b>:<Badge>Ready</Badge>}/>
    </section>
  </div>
}

function GenericModule({page,counts}){
  const map={
    overtime:["Overtime","Pengajuan, approval, dan perhitungan lembur.", "overtime_requests"],
    contracts:["Contracts","PKWT, PKWTT, masa berlaku, renewal, dan dokumen.", "contracts"],
    movements:["Employee Movement","Mutasi, promosi, demosi, dan perubahan jabatan.", "movements"],
    performance:["Performance","KPI, appraisal, score, reviewer, dan komentar.", "performance"],
    training:["Training & Development","Program training, peserta, budget, dan sertifikasi.", "trainings"],
    offboarding:["Offboarding","Resign, termination, exit interview, dan clearance.", "offboarding"],
    reports:["Reports & Analytics","Headcount, turnover, attendance, payroll, dan people metrics.", "reports"],
    settings:["Settings","Company, roles, permissions, workflow, dan audit log.", "settings"]
  };
  const [title,desc,key]=map[page]||["Module","HRIS module",""];
  const count = key && counts[key] ? counts[key].length : 0;
  return <div className="page"><PageHeader title={title} desc={desc} action={<button className="btn primary"><Plus size={16}/> Add</button>}/>
    <div className="kpi-grid mini"><KPI icon={ShieldCheck} label="Module status" value="Ready" sub="Schema available" tone="green"/><KPI icon={ClipboardList} label="Database records" value={count} sub="Loaded from Supabase" tone="blue"/><KPI icon={Settings} label="Workflow" value="4 steps" sub="Create → Review → Approve → Complete" tone="purple"/><KPI icon={FileText} label="Audit" value="Available" sub="audit_logs table" tone="orange"/></div>
    <section className="card feature-card"><div className="feature-icon"><ShieldCheck size={26}/></div><h2>{title} module</h2><p>Schema dan menu sudah ada. Modul ini berikutnya bisa diisi dengan CRUD, approval workflow, file upload, dan reporting sesuai quest belajar HR-mu.</p><div className="feature-grid"><div><b>Database</b><span>{key||"core"} table sudah disiapkan</span></div><div><b>Workflow</b><span>Create → Review → Approve → Complete</span></div><div><b>Security</b><span>RLS + audit_logs foundation</span></div></div></section>
  </div>
}

function downloadCSV(rows,filename){
  if(!rows.length)return alert("Tidak ada data untuk diexport.");
  const headers=Object.keys(rows[0]);
  const esc=v=>`"${String(v??"").replaceAll('"','""')}"`;
  const csv=[headers.join(","),...rows.map(r=>headers.map(h=>esc(r[h])).join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=filename;a.click();URL.revokeObjectURL(a.href);
}

createRoot(document.getElementById("root")).render(<App/>);
