// src/state/store.js

export const state = {
  currentUser: null,     // auth.users row
  profile: null,         // profiles row
  me: null,              // employees row milik user login
  booting: false,
  bootedUserId: null,
  lastBootAt: 0,
  sessionExpiring: false,
  empDetail: { id: null, tab: 'overview', employee: null }
};

export const CACHE = {
  departments: [],
  positions: [],
  leaveTypes: [],
  shiftList: [],
  employees: []
};

// Shortcut helpers
export const isHR = () => state.profile && (state.profile.role === 'admin' || state.profile.role === 'hr');
