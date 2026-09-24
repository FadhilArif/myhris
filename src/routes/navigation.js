// src/routes/navigation.js
import { isHR } from '../state/store.js';
import { ICONS } from '../config/icons.js';
import { el } from '../utils/dom.js';

export const NAV_HR = [
  {group:'Utama', items:[
    {route:'dashboard', label:'Dashboard', icon:'dashboard'},
    {route:'employees', label:'Data Karyawan', icon:'employees'},
    {route:'attendance', label:'Absensi', icon:'attendance'},
    {route:'shifts', label:'Shift Kerja', icon:'attendance'},
    {route:'leave', label:'Cuti & Izin', icon:'leave'},
    {route:'overtime', label:'Lembur', icon:'perf'},
    {route:'payroll', label:'Payroll', icon:'payroll'},
  ]},
  {group:'Talenta', items:[
    {route:'recruitment', label:'Rekrutmen', icon:'recruit'},
    {route:'performance', label:'Kinerja', icon:'perf'},
    {route:'training', label:'Training', icon:'training'},
  ]},
  {group:'Lainnya', items:[
    {route:'claims', label:'Reimbursement', icon:'claims'},
    {route:'settings', label:'Pengaturan', icon:'settings'},
  ]}
];

export const NAV_EMPLOYEE = [
  {group:'Utama', items:[
    {route:'dashboard', label:'Dashboard', icon:'dashboard'},
    {route:'my-attendance', label:'Absensi Saya', icon:'attendance'},
    {route:'my-overtime', label:'Lembur Saya', icon:'perf'},
    {route:'my-leave', label:'Cuti Saya', icon:'leave'},
    {route:'my-payslip', label:'Slip Gaji', icon:'payroll'},
    {route:'my-claims', label:'Klaim Saya', icon:'claims'},
  ]},
  {group:'Perusahaan', items:[
    {route:'directory', label:'Direktori Karyawan', icon:'directory'},
    {route:'training', label:'Training', icon:'training'},
  ]}
];

export function buildNav(){
  const nav = isHR() ? NAV_HR : NAV_EMPLOYEE;
  el('nav-container').innerHTML = nav.map(g => `
    <div class="nav-group">
      <div class="nav-label">${g.group}</div>
      ${g.items.map(it => `<a class="nav-item" data-route="${it.route}" onclick="navigate('${it.route}')">${ICONS[it.icon]}<span>${it.label}</span></a>`).join('')}
    </div>`).join('');
}

export const HR_ONLY_ROUTES = ['employees','attendance','leave','payroll','recruitment','performance','claims','settings','employee-detail'];
