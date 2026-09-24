// src/routes/router.js

import { state, CACHE } from '../state/store.js';
import { canAccessRoute, isManager } from '../config/permissions.js';
import { el, showToast } from '../utils/dom.js';

let routeRenderers = {};

export function registerRoute(name, renderer){
  routeRenderers[name] = renderer;
}

export function canAccessRouteForRecord(base, param){
  if(!canAccessRoute(base)) return false;

  if(base !== 'employee-detail') return true;

  // Karyawan hanya boleh membuka profilnya sendiri.
  if(state.profile?.role === 'employee'){
    return !!(state.me && state.me.id === param);
  }

  // Manager diperbolehkan membuka detail anggota dalam lingkup departemennya.
  if(isManager()){
    const target = CACHE.employees.find(e => e.id === param);
    return !!(target && target.department_id === state.me?.department_id);
  }

  return true;
}

export const TITLES = {
  dashboard:'Dashboard',
  employees:'Data Karyawan',
  team:'Tim Saya',
  attendance:'Absensi',
  leave:'Cuti & Izin',
  payroll:'Payroll',
  shifts:'Shift Kerja',
  overtime:'Persetujuan Lembur',
  recruitment:'Rekrutmen',
  performance:'Penilaian Kinerja',
  training:'Training & Development',
  claims:'Reimbursement',
  settings:'Pengaturan',
  reports:'Laporan & Audit',
  'my-attendance':'Absensi Saya',
  'my-leave':'Cuti Saya',
  'my-payslip':'Slip Gaji Saya',
  'my-claims':'Klaim Saya',
  'my-overtime':'Lembur Saya',
  'my-onboarding':'Onboarding Saya',
  directory:'Direktori Karyawan',
  'employee-detail':'Profil Karyawan',
  onboarding:'Onboarding Checklist',
  'onboarding-templates':'Template Onboarding'
};

export function navigate(route){
  const [base, param] = route.split('/');

  if(!canAccessRouteForRecord(base, param)){
    showToast('Anda tidak memiliki akses ke halaman ini.', true);
    location.hash = 'dashboard';
    return;
  }

  location.hash = route;
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.route === base));
  el('page-title').textContent = TITLES[base] || 'Dashboard';

  const renderer = routeRenderers[base];
  if(renderer){
    renderer(param);
  } else {
    console.warn('No renderer for route: ' + base);
  }
}
