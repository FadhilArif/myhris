import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, Users, UserPlus, CalendarCheck, CalendarDays, WalletCards,
  FileText, ArrowLeftRight, Target, GraduationCap, LogOut, BarChart3, Settings,
  ShieldCheck, Search, Bell, ChevronDown, ChevronRight, Menu, X, Plus, Download,
  MoreHorizontal, Pencil, Trash2, CheckCircle2, Clock3, AlertCircle, BriefcaseBusiness,
  Building2, ClipboardList, CircleDollarSign, UserRoundCheck, PanelLeftClose
} from "lucide-react";
import "./styles.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const nav = [
  { id:"dashboard", label:"Dashboard", icon:LayoutDashboard },
  { id:"employees", label:"Employees", icon:Users, group:"People" },
  { id:"recruitment", label:"Recruitment", icon:UserPlus, group:"People" },
  { id:"attendance", label:"Attendance", icon:CalendarCheck, group:"Time & Leave" },
  { id:"leave", label:"Leave & Permission", icon:CalendarDays, group:"Time & Leave" },
  { id:"overtime", label:"Overtime", icon:Clock3, group:"Time & Leave" },
  { id:"payroll", label:"Payroll", icon:WalletCards, group:"Compensation" },
  { id:"contracts", label:"Contracts", icon:FileText, group:"Employment" },
  { id:"movements", label:"Movement", icon:ArrowLeftRight, group:"Employment" },
  { id:"performance", label:"Performance", icon:Target, group:"Development" },
  { id:"training", label:"Training", icon:GraduationCap, group:"Development" },
  { id:"offboarding", label:"Offboarding", icon:LogOut, group:"Employment" },
  { id:"reports", label:"Reports", icon:BarChart3, group:"Analytics" },
  { id:"settings", label:"Settings", icon:Settings, group:"System" },
];

const mockEmployees = [
  {id:"EMP-001", name:"Aulia Rahma", position:"HR Generalist", department:"Human Resources", status:"Active", type:"PKWTT", joined:"2023-04-17", salary:7200000},
  {id:"EMP-002", name:"Andi Pratama", position:"Warehouse Staff", department:"Warehouse", status:"Active", type:"PKWT", joined:"2024-01-08", salary:4800000},
  {id:"EMP-003", name:"Nadia Putri", position:"Finance Officer", department:"Finance", status:"Active", type:"PKWTT", joined:"2022-10-03", salary:6800000},
  {id:"EMP-004", name:"Rizky Maulana", position:"Sales Executive", department:"Sales", status:"Probation", type:"PKWT", joined:"2026-08-19", salary:5500000},
  {id:"EMP-005", name:"Salsa Amalia", position:"Customer Service", department:"Customer Service", status:"On Leave", type:"PKWTT", joined:"2025-02-10", salary:5100000},
  {id:"EMP-006", name:"Bima Saputra", position:"IT Support", department:"IT", status:"Active", type:"PKWTT", joined:"2024-06-24", salary:7600000}
];

const mockCandidates = [
  {id:"CAN-001", name:"Dimas Arya", position:"Warehouse Staff", stage:"Interview", source:"Job Portal", applied:"2026-09-18"},
  {id:"CAN-002", name:"Nabila Sari", position:"HR Admin", stage:"Screening", source:"Referral", applied:"2026-09-17"},
  {id:"CAN-003", name:"Fajar Nugroho", position:"Sales Executive", stage:"Test", source:"LinkedIn", applied:"2026-09-15"},
  {id:"CAN-004", name:"Maya Lestari", position:"Finance Officer", stage:"Hired", source:"Job Portal", applied:"2026-09-12"}
];

const mockLeave = [
  {id:"LV-001", employee:"Salsa Amalia", type:"Annual Leave", start:"2026-09-21", end:"2026-09-23", days:3, status:"Pending"},
  {id:"LV-002", employee:"Andi Pratama", type:"Sick Leave", start:"2026-09-19", end:"2026-09-19", days:1, status:"Approved"},
  {id:"LV-003", employee:"Aulia Rahma", type:"Annual Leave", start:"2026-09-28", end:"2026-09-30", days:3, status:"Approved"}
];

const mockAttendance = [
  {date:"2026-09-20", employee:"Aulia Rahma", in:"08:02", out:"17:03", status:"Present", late:"2 min"},
  {date:"2026-09-20", employee:"Andi Pratama", in:"08:17", out:"17:01", status:"Late", late:"17 min"},
  {date:"2026-09-20", employee:"Nadia Putri", in:"07:56", out:"17:06", status:"Present", late:"—"},
  {date:"2026-09-20", employee:"Rizky Maulana", in:"08:09", out:"17:00", status:"Late", late:"9 min"},
  {date:"2026-09-20", employee:"Salsa Amalia", in:"—", out:"—", status:"Leave", late:"—"}
];

const money = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
const dateID = s => new Date(s+"T00:00:00").toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
const initials = n => n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();

function Badge({children, tone}) {
  const t = tone || (children==="Active"||children==="Approved"||children==="Hired"||children==="Present" ? "success" :
    children==="Pending"||children==="Probation"||children==="Interview"||children==="Test" ? "warning" :
    children==="Late"||children==="Rejected" ? "danger" : "neutral");
  return <span className={"badge "+t}>{children}</span>;
}

function EmptyState({title="No data yet", text="Data akan muncul di sini."}) {
  return <div className="empty"><div className="empty-icon"><ClipboardList size={22}/></div><b>{title}</b><span>{text}</span></div>
}

function Modal({title, children, onClose}) {
  return <div className="modal-backdrop" onMouseDown={e=>e.target===e.currentTarget&&onClose()}>
    <div className="modal"><div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose}><X size={18}/></button></div>{children}</div>
  </div>
}

function Table({columns, rows, renderCell}) {
  return <div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>
    {rows.map((r,i)=><tr key={r.id||i}>{columns.map(c=><td key={c}>{renderCell ? renderCell(r,c) : r[c] ?? "—"}</td>)}</tr>)}
  </tbody></table></div>
}

function KPI({icon:Icon,label,value,sub,tone=""}) {
  return <div className="kpi"><div className={"kpi-icon "+tone}><Icon size={20}/></div><div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div>{sub&&<div className="kpi-sub">{sub}</div>}</div></div>
}

function Dashboard({employees,candidates,leave}) {
  const active = employees.filter(e=>e.status==="Active").length;
  const pending = leave.filter(x=>x.status==="Pending").length;
  return <div className="page">
    <div className="page-title"><div><h1>Good morning, HR 👋</h1><p>Ringkasan aktivitas people hari ini.</p></div><button className="btn primary"><Plus size={16}/> Quick Action</button></div>
    <div className="kpi-grid">
      <KPI icon={Users} label="Total Employees" value={employees.length} sub={`${active} active`} tone="green"/>
      <KPI icon={UserPlus} label="Candidates" value={candidates.length} sub="4 active vacancies" tone="blue"/>
      <KPI icon={CalendarDays} label="Pending Leave" value={pending} sub="Need approval" tone="orange"/>
      <KPI icon={CircleDollarSign} label="Payroll This Month" value={money(34850000)} sub="September 2026" tone="purple"/>
    </div>
    <div className="grid-2">
      <section className="card"><div className="card-head"><div><h2>Attendance Today</h2><span>20 September 2026</span></div><button className="text-btn">View all <ChevronRight size={15}/></button></div>
        <div className="attendance-summary"><div><strong>92%</strong><span>Attendance rate</span></div><div><strong>8</strong><span>Late</span></div><div><strong>3</strong><span>On leave</span></div><div><strong>2</strong><span>Absent</span></div></div>
        <Table columns={["Employee","Check in","Check out","Status"]} rows={mockAttendance.slice(0,4)} renderCell={(r,c)=> c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee)}</div><span>{r.employee}</span></div>:c==="Status"?<Badge>{r.status}</Badge>:r[c.toLowerCase().replace(" ","_")]||"—"}/>
      </section>
      <section className="card"><div className="card-head"><div><h2>Leave Requests</h2><span>Waiting for approval</span></div><button className="text-btn">Manage <ChevronRight size={15}/></button></div>
        {leave.filter(x=>x.status==="Pending").map(x=><div className="request" key={x.id}><div className="avatar">{initials(x.employee)}</div><div className="request-main"><b>{x.employee}</b><span>{x.type} · {x.days} day(s)</span><small>{dateID(x.start)} – {dateID(x.end)}</small></div><Badge>{x.status}</Badge></div>)}
        {!pending&&<EmptyState title="All clear" text="Tidak ada pengajuan yang menunggu."/>}
      </section>
    </div>
    <section className="card"><div className="card-head"><div><h2>People Overview</h2><span>Headcount by department</span></div><button className="text-btn">Reports <ChevronRight size={15}/></button></div>
      <div className="bars">{["Human Resources","Warehouse","Finance","Sales","IT","Customer Service"].map((d,i)=>{const n=employees.filter(e=>e.department===d).length; return <div className="bar-row" key={d}><span>{d}</span><div className="bar"><i style={{width:`${Math.max(14,n*22)}%`}}/></div><b>{n}</b></div>})}</div>
    </section>
  </div>
}

function Employees({employees,setEmployees}) {
  const [q,setQ]=useState(""); const [modal,setModal]=useState(false);
  const [form,setForm]=useState({name:"",position:"",department:"",type:"PKWTT",salary:""});
  const filtered=employees.filter(e=>Object.values(e).join(" ").toLowerCase().includes(q.toLowerCase()));
  const add=async()=>{if(!form.name||!form.position)return; const row={id:"EMP-"+String(employees.length+1).padStart(3,"0"),...form,salary:Number(form.salary)||0,status:"Active",joined:new Date().toISOString().slice(0,10)}; setEmployees([row,...employees]); if(supabase) await supabase.from("employees").insert(row); setModal(false);setForm({name:"",position:"",department:"",type:"PKWTT",salary:""});}
  return <div className="page"><PageHeader title="Employees" desc="Master data seluruh karyawan." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Add Employee</button>}/>
    <div className="toolbar"><div className="searchbox"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search employee, ID, department..."/></div><button className="btn ghost"><Download size={16}/> Export</button></div>
    <section className="card"><Table columns={["Employee","Position","Department","Employment","Status","Joined",""]} rows={filtered} renderCell={(r,c)=>{
      if(c==="Employee")return <div className="person"><div className="avatar">{initials(r.name)}</div><div><b>{r.name}</b><small>{r.id}</small></div></div>;
      if(c==="Employment")return r.type; if(c==="Status")return <Badge>{r.status}</Badge>; if(c==="Joined")return dateID(r.joined);
      if(c==="")return <button className="icon-btn"><MoreHorizontal size={18}/></button>; return r[c.toLowerCase()];
    }}/></section>
    {modal&&<Modal title="Add employee" onClose={()=>setModal(false)}><FormGrid form={form} setForm={setForm}/><div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" onClick={add}>Save employee</button></div></Modal>}
  </div>
}

function FormGrid({form,setForm}) {
  const f=(k,v)=>setForm({...form,[k]:v});
  return <div className="form-grid">
    <label>Full name<input value={form.name} onChange={e=>f("name",e.target.value)} placeholder="Nama lengkap"/></label>
    <label>Position<input value={form.position} onChange={e=>f("position",e.target.value)} placeholder="Jabatan"/></label>
    <label>Department<select value={form.department} onChange={e=>f("department",e.target.value)}><option value="">Select...</option>{["Human Resources","Finance","Warehouse","Sales","IT","Customer Service"].map(x=><option key={x}>{x}</option>)}</select></label>
    <label>Employment type<select value={form.type} onChange={e=>f("type",e.target.value)}><option>PKWTT</option><option>PKWT</option><option>Probation</option></select></label>
    <label>Monthly salary<input type="number" value={form.salary} onChange={e=>f("salary",e.target.value)} placeholder="0"/></label>
  </div>
}

function Recruitment({candidates,setCandidates}) {
  const [modal,setModal]=useState(false), [form,setForm]=useState({name:"",position:"",stage:"Screening",source:"Job Portal"});
  const add=()=>{if(!form.name)return;setCandidates([{id:"CAN-"+String(candidates.length+1).padStart(3,"0"),...form,applied:new Date().toISOString().slice(0,10)},...candidates]);setModal(false)};
  return <div className="page"><PageHeader title="Recruitment" desc="ATS sederhana untuk mengelola kandidat dari vacancy sampai hiring." action={<button className="btn primary" onClick={()=>setModal(true)}><Plus size={16}/> Add Candidate</button>}/>
    <div className="kpi-grid mini"><KPI icon={BriefcaseBusiness} label="Open Vacancies" value="4" sub="12 positions" tone="blue"/><KPI icon={Users} label="Candidates" value={candidates.length} sub="This month" tone="green"/><KPI icon={Clock3} label="Interview" value="6" sub="Scheduled" tone="orange"/></div>
    <section className="card"><div className="card-head"><h2>Candidate Pipeline</h2><button className="btn ghost">Job Vacancies</button></div>
      <Table columns={["Candidate","Position","Stage","Source","Applied",""]} rows={candidates} renderCell={(r,c)=>c==="Candidate"?<div className="person"><div className="avatar">{initials(r.name)}</div><b>{r.name}</b></div>:c==="Stage"?<Badge>{r.stage}</Badge>:c==="Applied"?dateID(r.applied):c===""?<button className="icon-btn"><MoreHorizontal size={18}/></button>:r[c.toLowerCase()]}/>
    </section>
    {modal&&<Modal title="Add candidate" onClose={()=>setModal(false)}><div className="form-grid"><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Position<input value={form.position} onChange={e=>setForm({...form,position:e.target.value})}/></label><label>Stage<select value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}>{["Screening","Test","Interview","Hired","Rejected"].map(x=><option key={x}>{x}</option>)}</select></label><label>Source<select value={form.source} onChange={e=>setForm({...form,source:e.target.value})}>{["Job Portal","Referral","LinkedIn","Career Page"].map(x=><option key={x}>{x}</option>)}</select></label></div><div className="modal-actions"><button className="btn ghost" onClick={()=>setModal(false)}>Cancel</button><button className="btn primary" onClick={add}>Save candidate</button></div></Modal>}
  </div>
}

function Attendance() { return <div className="page"><PageHeader title="Attendance" desc="Monitor check-in, check-out, lateness, absence, and shifts." action={<button className="btn primary"><Plus size={16}/> Manual Attendance</button>}/><div className="kpi-grid mini"><KPI icon={UserRoundCheck} label="Present" value="117" sub="92%" tone="green"/><KPI icon={Clock3} label="Late" value="8" sub="Today" tone="orange"/><KPI icon={AlertCircle} label="Absent" value="2" sub="Today" tone="red"/><KPI icon={CalendarDays} label="Leave" value="3" sub="Today" tone="purple"/></div><section className="card"><div className="toolbar"><div className="searchbox"><Search size={17}/><input placeholder="Search employee..."/></div><button className="btn ghost">Today ▾</button><button className="btn ghost">Shift: All ▾</button></div><Table columns={["Date","Employee","Check in","Check out","Late","Status"]} rows={mockAttendance} renderCell={(r,c)=>c==="Date"?dateID(r.date):c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee)}</div><span>{r.employee}</span></div>:c==="Status"?<Badge>{r.status}</Badge>:r[c.toLowerCase().replace(" ","_")]||"—"}/></section></div> }

function Leave() { return <div className="page"><PageHeader title="Leave & Permission" desc="Pengajuan, approval, saldo cuti, dan izin karyawan." action={<button className="btn primary"><Plus size={16}/> New Request</button>}/><div className="kpi-grid mini"><KPI icon={CalendarDays} label="Pending" value="1" sub="Need approval" tone="orange"/><KPI icon={CheckCircle2} label="Approved" value="18" sub="This month" tone="green"/><KPI icon={Clock3} label="Leave Balance" value="1,248" sub="Company total" tone="blue"/></div><section className="card"><div className="card-head"><h2>Leave Requests</h2><button className="btn ghost">Leave Balance</button></div><Table columns={["Request","Employee","Type","Period","Days","Status",""]} rows={mockLeave} renderCell={(r,c)=>c==="Request"?r.id:c==="Employee"?<div className="person"><div className="avatar">{initials(r.employee)}</div><b>{r.employee}</b></div>:c==="Period"?`${dateID(r.start)} – ${dateID(r.end)}`:c==="Status"?<Badge>{r.status}</Badge>:c==="Days"?r.days:c===""?<div className="row-actions"><button className="icon-btn"><CheckCircle2 size={17}/></button><button className="icon-btn danger"><X size={17}/></button></div>:r[c.toLowerCase()]}/></section></div> }

function Payroll() { const pays=mockEmployees.map(e=>({...e,net:e.salary+500000-250000})); return <div className="page"><PageHeader title="Payroll" desc="Kelola komponen gaji, payroll run, dan payslip." action={<button className="btn primary"><Plus size={16}/> New Payroll Run</button>}/><div className="kpi-grid mini"><KPI icon={WalletCards} label="Gross Payroll" value={money(37850000)} sub="September 2026" tone="blue"/><KPI icon={CircleDollarSign} label="Net Payroll" value={money(34850000)} sub="After deductions" tone="green"/><KPI icon={FileText} label="Payslips" value="128" sub="Ready" tone="purple"/></div><section className="card"><div className="card-head"><h2>September 2026</h2><Badge>Draft</Badge></div><Table columns={["Employee","Basic Salary","Allowance","Deduction","Net Salary","Status"]} rows={pays} renderCell={(r,c)=>c==="Employee"?<div className="person"><div className="avatar">{initials(r.name)}</div><b>{r.name}</b></div>:c==="Basic Salary"?money(r.salary):c==="Allowance"?money(500000):c==="Deduction"?money(250000):c==="Net Salary"?<b>{money(r.net)}</b>:<Badge>Ready</Badge>}/><div className="card-foot"><span>Total employees: {pays.length}</span><button className="btn primary">Process Payroll</button></div></section></div> }

function GenericModule({id}) {
  const meta={overtime:["Overtime","Pengajuan dan perhitungan lembur."],contracts:["Contracts","Pantau PKWT, PKWTT, masa berlaku, dan renewal."],movements:["Employee Movement","Mutasi, promosi, demosi, dan perubahan organisasi."],performance:["Performance","KPI, appraisal, review period, dan performance notes."],training:["Training & Development","Program training, peserta, sertifikasi, dan skill matrix."],offboarding:["Offboarding","Resign, termination, exit interview, dan clearance."],reports:["Reports & Analytics","Laporan headcount, turnover, attendance, payroll, dan HR metrics."],settings:["Settings","Company profile, roles, permissions, workflow, dan audit log."]}[id];
  return <div className="page"><PageHeader title={meta[0]} desc={meta[1]} action={<button className="btn primary"><Plus size={16}/> Add</button>}/><section className="card feature-card"><div className="feature-icon"><ShieldCheck size={26}/></div><h2>{meta[0]} module ready</h2><p>Struktur UI dan routing sudah disiapkan. Hubungkan tabel Supabase terkait melalui schema yang tersedia di folder <code>supabase/schema.sql</code>.</p><div className="feature-grid"><div><b>Workflow</b><span>Create → Review → Approve → Complete</span></div><div><b>Audit trail</b><span>Perubahan data dapat dicatat di audit_logs</span></div><div><b>Role-based access</b><span>Admin HR, Manager, Employee, Finance</span></div></div></section></div>
}

function PageHeader({title,desc,action}) { return <div className="page-title"><div><h1>{title}</h1><p>{desc}</p></div>{action}</div> }

function App(){
  const [page,setPage]=useState("dashboard"), [mobileOpen,setMobileOpen]=useState(false);
  const [employees,setEmployees]=useState(mockEmployees), [candidates,setCandidates]=useState(mockCandidates), [leave]=useState(mockLeave);
  const [dbStatus,setDbStatus]=useState("Demo mode");
  useEffect(()=>{(async()=>{if(!supabase){setDbStatus("Demo mode");return} const {data,error}=await supabase.from("employees").select("*").limit(50); if(!error&&data?.length)setEmployees(data); setDbStatus(error?"Demo mode":"Supabase connected");})()},[]);
  const current=nav.find(x=>x.id===page)||nav[0];
  const render=()=>({dashboard:<Dashboard employees={employees} candidates={candidates} leave={leave}/>,employees:<Employees employees={employees} setEmployees={setEmployees}/>,recruitment:<Recruitment candidates={candidates} setCandidates={setCandidates}/>,attendance:<Attendance/>,leave:<Leave/>,payroll:<Payroll/>}[page]||<GenericModule id={page}/>);
  return <div className="app">
    <header className="topbar"><button className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)}><Menu size={20}/></button><div className="brand">People<span>Flow</span></div><div className="top-search"><Search size={17}/><input placeholder="Search anything..."/></div><div className="top-actions"><span className={"db-dot "+(dbStatus==="Supabase connected"?"on":"")}></span><span className="db-status">{dbStatus}</span><button className="icon-btn"><Bell size={19}/><i/></button><div className="profile"><div className="avatar">HR</div><div><b>HR Admin</b><small>Administrator</small></div><ChevronDown size={15}/></div></div></header>
    <aside className={"sidebar "+(mobileOpen?"open":"")}><div className="side-top"><span>HR Workspace</span><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div><div className="workspace"><Building2 size={16}/><span>Sample Company</span><ChevronDown size={14}/></div><nav>{nav.map(n=>{const Icon=n.icon;return <button key={n.id} className={page===n.id?"active":""} onClick={()=>{setPage(n.id);setMobileOpen(false)}}><Icon size={18}/><span>{n.label}</span>{n.id==="leave"&&<em>1</em>}</button>})}</nav><div className="sidebar-foot"><div className="mini-card"><ShieldCheck size={17}/><div><b>Secure workspace</b><span>Role-based access</span></div></div></div></aside>
    <main className="main">{render()}</main>
    {mobileOpen&&<div className="mobile-overlay" onClick={()=>setMobileOpen(false)}/>}
  </div>
}

createRoot(document.getElementById("root")).render(<App />);
