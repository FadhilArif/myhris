// src/config/permissions.js

import { state } from '../state/store.js';
import { ROLES } from './constants.js';

export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    routes: [
      'dashboard','employees','attendance','shifts','leave','overtime','payroll',
      'recruitment','performance','training','claims','settings','directory',
      'employee-detail','onboarding','onboarding-templates','reports',
    ],
    actions: [
      'employee.view_all','employee.edit','employee.create',
      'attendance.view_all','shift.manage',
      'leave.view_all','leave.view_self','leave.create','leave.manage','leave.approve',
      'overtime.view_all','overtime.approve',
      'payroll.view','payroll.manage',
      'recruitment.manage','performance.manage',
      'training.manage','claims.manage',
      'settings.manage','users.manage',
      'reports.view_all','reports.audit','reports.export',
    ],
  },

  [ROLES.HR]: {
    routes: [
      'dashboard','employees','attendance','shifts','leave','overtime','payroll',
      'recruitment','performance','training','claims','directory',
      'employee-detail','onboarding','onboarding-templates','reports',
    ],
    actions: [
      'employee.view_all','employee.edit','employee.create',
      'attendance.view_all','shift.manage',
      'leave.view_all','leave.view_self','leave.create','leave.manage','leave.approve',
      'overtime.view_all','overtime.approve',
      'payroll.view','payroll.manage',
      'recruitment.manage','performance.manage',
      'training.manage','claims.manage',
      'reports.view_all','reports.audit','reports.export',
    ],
  },

  [ROLES.MANAGER]: {
    routes: [
      'dashboard','team','attendance','leave','overtime',
      'performance','training','directory','employee-detail','reports',
    ],
    actions: [
      'employee.view_team',
      'attendance.view_team',
      'leave.view_self','leave.create','leave.view_team','leave.approve',
      'overtime.view_team','overtime.approve',
      'performance.view_team','performance.manage_team',
      'training.view_team',
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

export function can(action){
  const permissions = ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
  return permissions.actions.includes(action);
}

export function canAccessRoute(route){
  const permissions = ROLE_PERMISSIONS[getRole()] || ROLE_PERMISSIONS[ROLES.EMPLOYEE];
  return permissions.routes.includes(route);
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
