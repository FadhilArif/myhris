// src/routes/router.js
import { state, isHR } from '../state/store.js';
import { el, showToast } from '../utils/dom.js';

// Route → renderer map (diisi oleh main.js)
let routeRenderers = {};

export function registerRoute(name, renderer){
  routeRenderers[name] = renderer;
}

export function canAccessRoute(base, param){
  if(isHR()) return true;
  const employeeRoutes = [
    'dashboard','my-attendance','my-leave','my-payslip','my-claims',
    'directory','training','my-overtime','my-onboarding'
  ];
  if(employeeRoutes.includes(base)) return true;
  if(base === 'employee-detail'){
    return !!(state.me && state.me.id === param);
  }
  return false;
}

export const TITLES = {
  dashboard:'Dashboard', employees:'Data Karyawan', attendance:'Absensi', leave:'Cuti & Izin', payroll:'Payroll',
  shifts:'Shift Kerja', overtime:'Persetujuan Lembur',
  recruitment:'Rekrutmen', performance:'Penilaian Kinerja', training:'Training & Development',
  claims:'Reimbursement', settings:'Pengaturan',
  'my-attendance':'Absensi Saya', 'my-leave':'Cuti Saya', 'my-payslip':'Slip Gaji Saya',
  'my-claims':'Klaim Saya', 'my-overtime':'Lembur Saya', 'my-onboarding':'Onboarding Saya',
  directory:'Direktori Karyawan', 'employee-detail':'Profil Karyawan',
  onboarding:'Onboarding Checklist', 'onboarding-templates':'Template Onboarding'
};

export function navigate(route){
  const [base, param] = route.split('/');

  if(!canAccessRoute(base, param)){
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
    console.warn(`No renderer for route: ${base}`);
  }
}
