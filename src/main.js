// src/main.js

// ============ 1. IMPORT INFRASTRUCTURE ============
import { sb } from './lib/supabase.js';
import { state, CACHE, isHR } from './state/store.js';
import { el, openModal, closeModal, showToast, escapeHtml, statusBadge, previewPhoto, handleDocFileSelect, clearDocFile } from './utils/dom.js';
import { fmtMoney, fmtDate, fmtDateTime, formatNumberInput, formatFileSize, getFileIcon } from './utils/format.js';
import { hitungPPh21Bulanan, hitungPPh21Setahun } from './utils/tax.js';
import { sbAll, sbAllQuiet } from './services/db.js';
import { logAudit } from './services/audit.js';
import { ROLE_LABELS } from './config/constants.js';
import { navigate, registerRoute } from './routes/router.js';
import { buildNav } from './routes/navigation.js';
import { initAuth, preloadMaster } from './modules/auth.js';

// ============ 2. IMPORT MODULES ============
import * as EmployeesMod from './modules/employees.js';
// import * as DashboardMod from './modules/dashboard.js';
// import * as AttendanceMod from './modules/attendance.js';
// ... dst

// ============ 3. GLOBAL BINDING (agar bisa dipanggil dari HTML onclick) ============
Object.assign(window, {
  // Utils
  el, openModal, closeModal, showToast, escapeHtml, statusBadge,
  fmtMoney, fmtDate, fmtDateTime, formatNumberInput, formatFileSize, getFileIcon,
  previewPhoto, handleDocFileSelect, clearDocFile, logAudit,
  hitungPPh21Bulanan, hitungPPh21Setahun,
  sbAll, sbAllQuiet,
  // State
  state, CACHE, isHR, ROLE_LABELS,
  // Routes
  navigate, buildNav,
  // Auth
  preloadMaster,
  // Modules (dari EmployeesMod)
  renderEmployees: EmployeesMod.renderEmployees,
  openEmployeeForm: EmployeesMod.openEmployeeForm,
  saveEmployee: EmployeesMod.saveEmployee,
  applyEmployeeFilters: EmployeesMod.applyEmployeeFilters,
  updateFilterPositionDropdown: EmployeesMod.updateFilterPositionDropdown,
  updatePositionDropdown: EmployeesMod.updatePositionDropdown,
  uploadEmployeePhoto: EmployeesMod.uploadEmployeePhoto
  // ... daftar module lain di sini
});

// ============ 4. SIDEBAR AVATAR ============
window.updateSidebarAvatar = function(){
  const avatarEl = el('user-avatar');
  if(!avatarEl) return;
  const photoUrl = state.me?.photo_url || null;
  const initial = (state.profile?.full_name || '?').slice(0,1).toUpperCase();
  avatarEl.innerHTML = photoUrl
    ? `<img src="${escapeHtml(photoUrl)}" alt="${initial}">`
    : initial;
};

window.openMyProfile = function(){
  if(!state.me || !state.me.id){
    showToast('Akun Anda belum ditautkan ke data karyawan. Hubungi HR.', true);
    return;
  }
  navigate('employee-detail/' + state.me.id);
};

// ============ 5. REGISTER ALL ROUTES ============
function registerAllRoutes(){
  // Register setiap modul ke route map
  registerRoute('employees', EmployeesMod.renderEmployees);
  // registerRoute('dashboard', DashboardMod.renderDashboard);
  // registerRoute('attendance', AttendanceMod.renderAttendance);
  // ... dst untuk semua module
}

// ============ 6. INITIALIZE APP ============
document.addEventListener('DOMContentLoaded', () => {
  registerAllRoutes();
  initAuth();
});
