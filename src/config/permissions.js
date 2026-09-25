// src/config/permissions.js

import { state } from '../state/store.js';
import { ROLES } from './constants.js';

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    routes: [
      'dashboard','my-attendance','my-overtime','my-leave','my-payslip','my-claims','employees','attendance','shifts','leave','overtime','payroll',
      'recruitment','performance','training','claims','settings','directory',
      'employee-detail','onboarding','onboarding-templates','reports',
    ],
    actions: [
      'employee.view_all','employee.edit','employee.create',
      'attendance.view_all','attendance.view_self','shift.manage',
      'leave.view_all','leave.view_self','leave.create','leave.manage','leave.approve',
      'overtime.view_all','overtime.view_self','overtime.create','overtime.approve',
      'payroll.view','payroll.view_self','payroll.manage',
      'recruitment.manage','performance.manage',
      'training.view_self','training.enroll','training.manage',
      'claims.view_self','claims.create','claims.manage',
      'settings.manage','users.manage',
      'reports.view_all','reports.audit','reports.export',
    ],
  },

  [ROLES.HR]: {
    routes: [
      'dashboard','my-attendance','my-overtime','my-leave','my-payslip','my-claims','employees','attendance','shifts','leave','overtime','payroll',
      'recruitment','performance','training','claims','directory',
      'employee-detail','onboarding','onboarding-templates','reports',
    ],
    actions: [
      'employee.view_all','employee.edit','employee.create',
      'attendance.view_all','attendance.view_self','shift.manage',
      'leave.view_all','leave.view_self','leave.create','leave.manage','leave.approve',
      'overtime.view_all','overtime.view_self','overtime.create','overtime.approve',
      'payroll.view','payroll.view_self','payroll.manage',
      'recruitment.manage','performance.manage',
      'training.view_self','training.enroll','training.manage',
      'claims.view_self','claims.create','claims.manage',
      'reports.view_all','reports.audit','reports.export',
    ],
  },

  [ROLES.MANAGER]: {
    routes: [
      'dashboard','my-attendance','my-overtime','my-leave','my-payslip','my-claims','team','attendance','leave','overtime',
      'performance','training','directory','employee-detail','reports',
    ],
    actions: [
      'employee.view_team',
      'attendance.view_self','attendance.view_team',
      'leave.view_self','leave.create','leave.view_team','leave.approve',
      'overtime.view_self','overtime.create','overtime.view_team','overtime.approve',
      'payroll.view_self',
      'performance.view_team','performance.manage_team',
      'training.view_self','training.enroll','training.view_team',
      'claims.view_self','claims.create',
      'reports.view_team','reports.export',
    ],
  },

  [ROLES.EMPLOYEE]: {
    routes: [
      'dashboard','my-attendance','my-overtime','my-leave','my-payslip',
      'my-claims','directory','training','my-onboarding','employee-detail','reports',
    ],
    actions: [
      'employee.view_self',
      'attendance.view_self',
      'leave.view_self','leave.create',
      'overtime.view_self','overtime.create',
      'payroll.view_self',
      'claims.view_self','claims.create',
      'training.view_self','training.enroll',
      'reports.view_self','reports.export',
    ],
  },
};

export function getRole(){
  return state.profile?.role || ROLES.EMPLOYEE;
}

export function hasRole(...roles){
  return roles.includes(getRole());
}

export const ROUTE_PERMISSIONS = {
  'my-attendance':['attendance.view_self'],
  'my-overtime':['overtime.view_self'],
  'my-leave':['leave.view_self'],
  'my-payslip':['payroll.view_self'],
  'my-claims':['claims.view_self'],
  'employees':['employee.view_all','employee.view_team'],
  'attendance':['attendance.view_all','attendance.view_team'],
  'leave':['leave.view_all','leave.view_team','leave.approve','leave.manage'],
  'overtime':['overtime.view_all','overtime.view_team','overtime.approve'],
  'payroll':['payroll.view','payroll.manage'],
  'recruitment':['recruitment.manage'],
  'performance':['performance.manage','performance.view_team'],
  'training':['training.manage','training.view_team','training.view_self','training.enroll'],
  'claims':['claims.manage'],
  'settings':['settings.manage'],
  'reports':['reports.view_all','reports.audit','reports.view_team'],
  'directory':['employee.view_all','employee.view_team','employee.view_self'],
  'team':['employee.view_team'],
};

export const PERMISSION_CATEGORY_LABELS = {
  employee:'Data Karyawan',
  attendance:'Absensi',
  shift:'Shift Kerja',
  leave:'Cuti & Izin',
  overtime:'Lembur',
  payroll:'Payroll',
  recruitment:'Rekrutmen',
  performance:'Kinerja',
  training:'Training',
  claims:'Reimbursement',
  settings:'Pengaturan',
  users:'Pengguna',
  reports:'Laporan',
};

export const PERMISSION_ACTION_LABELS = {
  view_all:'Lihat Semua',
  view_team:'Lihat Tim',
  view_self:'Lihat Milik Sendiri',
  edit:'Edit',
  create:'Buat / Ajukan',
  delete:'Hapus',
  manage:'Kelola',
  approve:'Setujui',
  enroll:'Ikuti / Daftar',
  audit:'Lihat Audit',
  export:'Export',
};

export function getPermissionOverride(action){
  return Object.prototype.hasOwnProperty.call(state.permissionOverrides || {}, action)
    ? state.permissionOverrides[action]
    : null;
}

export function getEffectivePermission(action){
  const override = getPermissionOverride(action);
  if(override !== null) return override;
  const rolePermissions = ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
  return rolePermissions.actions.includes(action);
}

export function can(action){
  return getEffectivePermission(action);
}

export function canAccessRoute(route){
  const mapped = ROUTE_PERMISSIONS[route];
  if(mapped?.length) return mapped.some(permission => can(permission));
  const rolePermissions = ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
  return rolePermissions.routes.includes(route);
}

export function getPermissionCatalog(){
  const set = new Set();
  Object.values(ROLE_PERMISSIONS).forEach(role => role.actions.forEach(permission => set.add(permission)));

  return [...set].sort().map(permission => {
    const [category, action] = permission.split('.');
    return {
      permission,
      category,
      categoryLabel: PERMISSION_CATEGORY_LABELS[category] || category,
      actionLabel: PERMISSION_ACTION_LABELS[action] || action
    };
  });
}

export function isAdmin(){
  return getRole() === ROLES.ADMIN;
}

export function isHRRole(){
  return getRole() === ROLES.HR;
}

export function isManager(){
  return getRole() === ROLES.MANAGER;
}

export function isEmployee(){
  return getRole() === ROLES.EMPLOYEE;
}

export function isHRorAdmin(){
  return hasRole(ROLES.ADMIN, ROLES.HR);
}

// Manager scope v1 memakai departemen yang sama dengan karyawan manager.
// Ini sengaja dibuat berbasis departemen karena schema lama MyHRIS belum memiliki manager_id.
export function isInManagerScope(employee){
  if(!isManager()) return true;
  return !!(state.me?.department_id && employee?.department_id === state.me.department_id);
}

export function getAllowedReports(){
  if(hasRole(ROLES.ADMIN, ROLES.HR)){
    return ['employees','attendance','leave_requests','leave_balances','overtime','payroll','recruitment','performance','training','claims','audit'];
  }
  if(isManager()){
    return ['employees','attendance','leave_requests','leave_balances','overtime','performance','training','claims'];
  }
  if(isEmployee()){
    return ['attendance','leave_requests','leave_balances','overtime','payroll','performance','training','claims'];
  }
  return [];
}
