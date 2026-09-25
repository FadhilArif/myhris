// src/main.js

// ============ 1. INFRASTRUCTURE ============
import { sb } from './lib/supabase.js';
import { state, CACHE, isHR } from './state/store.js';
import {
  el, openModal, closeModal, showToast, escapeHtml, statusBadge, badge,
  previewPhoto, handleDocFileSelect, clearDocFile
} from './utils/dom.js';
import {
  fmtMoney, fmtDate, fmtDateTime, formatNumberInput, formatFileSize as formatFileSizeUtil,
  getFileIcon as getFileIconUtil
} from './utils/format.js';
import { hitungPPh21Bulanan, hitungPPh21Setahun } from './utils/tax.js';
import { sbAll, sbAllQuiet } from './services/db.js';
import { logAudit } from './services/audit.js';
import { preloadMaster } from './services/auth.js';
import { ROLE_LABELS, STAGES, MOVEMENT_LABELS } from './config/constants.js';
import { can, getRole } from './config/permissions.js';
import { navigate, registerRoute } from './routes/router.js';
import { buildNav } from './routes/navigation.js';
import { initSessionSecurity } from './services/sessionSecurity.js';
import * as AuthMod from './modules/auth.js';


// ============ 2. FEATURE MODULES ============
import * as DashboardMod from './modules/dashboard.js';
import * as EmployeesMod from './modules/employees.js';
import * as AttendanceMod from './modules/attendance.js';
import * as LeaveMod from './modules/leave.js';
import * as ShiftMod from './modules/shifts.js';
import * as OvertimeMod from './modules/overtime.js';
import * as PayrollMod from './modules/payroll.js';
import * as RecruitmentMod from './modules/recruitment.js';
import * as PerformanceMod from './modules/performance.js';
import * as OnboardingMod from './modules/onboarding.js';
import * as TrainingMod from './modules/training.js';
import * as ClaimsMod from './modules/claims.js';
import * as DirectoryMod from './modules/directory.js';
import * as SettingsMod from './modules/settings.js';
import * as EmployeeDetailMod from './modules/employeeDetail.js';
import * as TeamMod from './modules/team.js';
import * as ReportsMod from './modules/reports.js';


// ============ 3. GLOBAL BINDINGS ============
// Existing HTML uses inline onclick/onchange handlers.
// Keep those handlers working while the codebase is split into ES modules.
Object.assign(window, {
  // Core
  sb,
  state,
  CACHE,
  isHR,
  ROLE_LABELS,
  STAGES,
  can,
  getRole,
  MOVEMENT_LABELS,

  // Helpers
  el,
  openModal,
  closeModal,
  showToast,
  escapeHtml,
  badge,
  statusBadge,
  fmtMoney,
  fmtDate,
  fmtDateTime,
  formatNumberInput,
  formatFileSize: formatFileSizeUtil,
  getFileIcon: getFileIconUtil,
  previewPhoto,
  handleDocFileSelect,
  clearDocFile,

  // DB / audit / tax
  sbAll,
  sbAllQuiet,
  logAudit,
  hitungPPh21Bulanan,
  hitungPPh21Setahun,

  // Routing / navigation
  navigate,
  buildNav,

  // Auth bootstrap
  preloadMaster,

  // Every exported feature function becomes available to inline handlers.
  ...DashboardMod,
  ...EmployeesMod,
  ...AttendanceMod,
  ...LeaveMod,
  ...ShiftMod,
  ...OvertimeMod,
  ...PayrollMod,
  ...RecruitmentMod,
  ...PerformanceMod,
  ...OnboardingMod,
  ...TrainingMod,
  ...ClaimsMod,
  ...DirectoryMod,
  ...SettingsMod,
  ...EmployeeDetailMod,
  ...TeamMod,
  ...ReportsMod
});


// ============ 4. SIDEBAR / PROFILE HELPERS ============
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
  if(!state.me?.id){
    showToast('Akun Anda belum ditautkan ke data karyawan. Hubungi HR.', true);
    return;
  }
  navigate('employee-detail/' + state.me.id);
};


// ============ 5. ROUTE REGISTRATION ============
function registerAllRoutes(){
  registerRoute('dashboard', DashboardMod.renderDashboard);
  registerRoute('team', TeamMod.renderTeam);

  registerRoute('employees', EmployeesMod.renderEmployees);
  registerRoute('attendance', AttendanceMod.renderAttendance);
  registerRoute('shifts', ShiftMod.renderShifts);
  registerRoute('leave', LeaveMod.renderLeave);
  registerRoute('overtime', OvertimeMod.renderOvertime);
  registerRoute('payroll', PayrollMod.renderPayroll);

  registerRoute('recruitment', RecruitmentMod.renderRecruitment);
  registerRoute('performance', PerformanceMod.renderPerformance);
  registerRoute('onboarding', OnboardingMod.renderOnboardingList);
  registerRoute('onboarding-templates', OnboardingMod.renderOnboardingTemplates);
  registerRoute('training', TrainingMod.renderTraining);

  registerRoute('claims', ClaimsMod.renderClaims);
  registerRoute('directory', DirectoryMod.renderDirectory);
  registerRoute('settings', SettingsMod.renderSettings);
  registerRoute('reports', ReportsMod.renderReports);

  // Employee views
  registerRoute('my-attendance', AttendanceMod.renderMyAttendance);
  registerRoute('my-overtime', OvertimeMod.renderMyOvertime);
  registerRoute('my-leave', LeaveMod.renderMyLeave);
  registerRoute('my-payslip', PayrollMod.renderMyPayslip);
  registerRoute('my-claims', ClaimsMod.renderMyClaims);
  registerRoute('my-onboarding', OnboardingMod.renderMyOnboarding);

  // Detail view
  registerRoute('employee-detail', EmployeeDetailMod.renderEmployeeDetail);
}


// ============ 6. BOOT ============
document.addEventListener('DOMContentLoaded', () => {
  registerAllRoutes();

  // Auth module installs the login/logout handlers immediately.
  AuthMod.initAuth();
  initSessionSecurity();
});
