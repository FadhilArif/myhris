// src/routes/navigation.js

import { getRole } from '../config/permissions.js';
import { ICONS } from '../config/icons.js';
import { el } from '../utils/dom.js';

export const NAV_ADMIN = [
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
    {route:'reports', label:'Laporan & Audit', icon:'audit'},
    {route:'settings', label:'Pengaturan', icon:'settings'},
  ]}
  {group:'Layanan Saya', items:[
    {route:'my-attendance', label:'Absensi Saya', icon:'attendance'},
    {route:'my-overtime', label:'Lembur Saya', icon:'perf'},
    {route:'my-leave', label:'Cuti Saya', icon:'leave'},
    {route:'my-payslip', label:'Slip Gaji Saya', icon:'payroll'},
    {route:'my-claims', label:'Klaim Saya', icon:'claims'},
  ]},
];

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
    {route:'reports', label:'Laporan & Audit', icon:'audit'},
  ]}
  {group:'Layanan Saya', items:[
    {route:'my-attendance', label:'Absensi Saya', icon:'attendance'},
    {route:'my-overtime', label:'Lembur Saya', icon:'perf'},
    {route:'my-leave', label:'Cuti Saya', icon:'leave'},
    {route:'my-payslip', label:'Slip Gaji Saya', icon:'payroll'},
    {route:'my-claims', label:'Klaim Saya', icon:'claims'},
  ]},
];

export const NAV_MANAGER = [
  {group:'Tim', items:[
    {route:'dashboard', label:'Dashboard', icon:'dashboard'},
    {route:'team', label:'Tim Saya', icon:'employees'},
    {route:'attendance', label:'Absensi Tim', icon:'attendance'},
    {route:'leave', label:'Cuti Tim', icon:'leave'},
    {route:'overtime', label:'Lembur Tim', icon:'perf'},
  ]},
  {group:'Pengembangan', items:[
    {route:'performance', label:'Kinerja Tim', icon:'perf'},
    {route:'training', label:'Training', icon:'training'},
  ]},
  {group:'Lainnya', items:[
    {route:'directory', label:'Direktori Karyawan', icon:'directory'},
    {route:'reports', label:'Laporan', icon:'audit'},
  ]}
  {group:'Layanan Saya', items:[
    {route:'my-attendance', label:'Absensi Saya', icon:'attendance'},
    {route:'my-overtime', label:'Lembur Saya', icon:'perf'},
    {route:'my-leave', label:'Cuti Saya', icon:'leave'},
    {route:'my-payslip', label:'Slip Gaji Saya', icon:'payroll'},
    {route:'my-claims', label:'Klaim Saya', icon:'claims'},
  ]},
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
    {route:'reports', label:'Laporan Saya', icon:'audit'},
  ]}
];

const NAV_BY_ROLE = {
  admin: NAV_ADMIN,
  hr: NAV_HR,
  manager: NAV_MANAGER,
  employee: NAV_EMPLOYEE
};

export function buildNav(){
  const nav = NAV_BY_ROLE[getRole()] || NAV_EMPLOYEE;
  el('nav-container').innerHTML = nav.map(g =>
    '<div class="nav-group">' +
      '<div class="nav-label">' + g.group + '</div>' +
      g.items.map(it =>
        '<a class="nav-item" data-route="' + it.route + '" onclick="navigate(\'' + it.route + '\')">' +
          (ICONS[it.icon] || '') + '<span>' + it.label + '</span>' +
        '</a>'
      ).join('') +
    '</div>'
  ).join('');
}

export const HR_ONLY_ROUTES = [
  'employees','attendance','shifts','leave','overtime','payroll',
  'recruitment','performance','claims','employee-detail','reports'
];

export const MANAGER_ROUTES = [
  'team','attendance','leave','overtime','performance','training','directory','employee-detail','reports'
];
