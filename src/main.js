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
  // Recruitment
  renderRecruitment: RecruitmentMod.renderRecruitment,
  copyCareerPageLink: RecruitmentMod.copyCareerPageLink,
  closeJobPosting: RecruitmentMod.closeJobPosting,
  reopenJobPosting: RecruitmentMod.reopenJobPosting,
  deleteJobPosting: RecruitmentMod.deleteJobPosting,
openJobForm: RecruitmentMod.openJobForm,
  saveJob: RecruitmentMod.saveJob,
  viewCandidates: RecruitmentMod.viewCandidates,
openConvertForm: RecruitmentMod.openConvertForm,
  convertCandidate: RecruitmentMod.convertCandidate,
openCandidateForm: RecruitmentMod.openCandidateForm,
  saveCandidate: RecruitmentMod.saveCandidate,
  updateCandidateStage: RecruitmentMod.updateCandidateStage,

// Performance
  renderPerformance: PerformanceMod.renderPerformance,
openCycleForm: PerformanceMod.openCycleForm,
  saveCycle: PerformanceMod.saveCycle,
  viewReviews: PerformanceMod.viewReviews,
openReviewForm: PerformanceMod.openReviewForm,
  saveReview: PerformanceMod.saveReview,

// Onboarding
  renderOnboardingList: OnboardingMod.renderOnboardingList,
openStartOnboardingForm: OnboardingMod.openStartOnboardingForm,
  startOnboarding: OnboardingMod.startOnboarding,
  viewOnboarding: OnboardingMod.viewOnboarding,
  toggleOnboardingItem: OnboardingMod.toggleOnboardingItem,
  completeOnboarding: OnboardingMod.completeOnboarding,
  renderMyOnboarding: OnboardingMod.renderMyOnboarding,
  renderOnboardingTemplates: OnboardingMod.renderOnboardingTemplates,
openTemplateForm: OnboardingMod.openTemplateForm,
  saveTemplate: OnboardingMod.saveTemplate,
openTemplateItemForm: OnboardingMod.openTemplateItemForm,
  saveTemplateItem: OnboardingMod.saveTemplateItem,
  deleteTemplate: OnboardingMod.deleteTemplate,

// Training
  renderTraining: TrainingMod.renderTraining,
openProgramForm: TrainingMod.openProgramForm,
  saveProgram: TrainingMod.saveProgram,
  enrollTraining: TrainingMod.enrollTraining,
  viewEnrollments: TrainingMod.viewEnrollments,
  markTrainingComplete: TrainingMod.markTrainingComplete,

// Claims
  renderClaims: ClaimsMod.renderClaims,
  decideClaim: ClaimsMod.decideClaim,
  renderMyClaims: ClaimsMod.renderMyClaims,
openClaimForm: ClaimsMod.openClaimForm,
  submitClaim: ClaimsMod.submitClaim,

// Directory
renderDirectory: DirectoryMod.renderDirectory,

// Settings
  renderSettings: SettingsMod.renderSettings,
  switchSettingsTab: SettingsMod.switchSettingsTab,
  loadDeptSettings: SettingsMod.loadDeptSettings,
  loadPosSettings: SettingsMod.loadPosSettings,
openPositionForm: SettingsMod.openPositionForm,
  savePosition: SettingsMod.savePosition,
  loadLeaveTypeSettings: SettingsMod.loadLeaveTypeSettings,
openLeaveTypeForm: SettingsMod.openLeaveTypeForm,
  saveLeaveType: SettingsMod.saveLeaveType,
  loadPayrollCompSettings: SettingsMod.loadPayrollCompSettings,
openPayrollCompForm: SettingsMod.openPayrollCompForm,
  savePayrollComp: SettingsMod.savePayrollComp,
  loadUserSettings: SettingsMod.loadUserSettings,
openUserLinkForm: SettingsMod.openUserLinkForm,
  saveUserLink: SettingsMod.saveUserLink,
  quickAdd: SettingsMod.quickAdd,
  quickSave: SettingsMod.quickSave,
  quickDelete: SettingsMod.quickDelete,

// Employee Detail
  renderEmployeeDetail: EmployeeDetailMod.renderEmployeeDetail,
  switchDetailTab: EmployeeDetailMod.switchDetailTab,
  canViewEmployeeDetail: EmployeeDetailMod.canViewEmployeeDetail,
openContractForm: EmployeeDetailMod.openContractForm,
  saveContract: EmployeeDetailMod.saveContract,
openMovementForm: EmployeeDetailMod.openMovementForm,
  saveMovement: EmployeeDetailMod.saveMovement,
openDocumentForm: EmployeeDetailMod.openDocumentForm,
  saveDocumentWithUpload: EmployeeDetailMod.saveDocumentWithUpload,
  deleteDocument: EmployeeDetailMod.deleteDocument,
  showPayslipDetail: EmployeeDetailMod.showPayslipDetail,
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
  registerRoute('recruitment', RecruitmentMod.renderRecruitment);
  registerRoute('performance', PerformanceMod.renderPerformance);
  registerRoute('onboarding', OnboardingMod.renderOnboardingList);
  registerRoute('onboarding-templates', OnboardingMod.renderOnboardingTemplates);
  registerRoute('training', TrainingMod.renderTraining);
  registerRoute('claims', ClaimsMod.renderClaims);
  registerRoute('my-claims', ClaimsMod.renderMyClaims);
  registerRoute('directory', DirectoryMod.renderDirectory);
  registerRoute('settings', SettingsMod.renderSettings);
  registerRoute('employee-detail', EmployeeDetailMod.renderEmployeeDetail);
}

// ============ 6. INITIALIZE APP ============
document.addEventListener('DOMContentLoaded', () => {
  registerAllRoutes();
  initAuth();
});
