// src/config/constants.js

// PTKP 2024 — Penghasilan Tidak Kena Pajak setahun
export const PTKP_2024 = {
  'TK/0': 54_000_000, 'TK/1': 58_500_000, 'TK/2': 63_000_000, 'TK/3': 67_500_000,
  'K/0':  58_500_000, 'K/1':  63_000_000, 'K/2':  67_500_000, 'K/3':  72_000_000
};

// Tarif progresif PPh 21 (UU HPP)
export const PPH21_BRACKETS = [
  { max: 60_000_000,     rate: 0.05 },
  { max: 250_000_000,    rate: 0.15 },
  { max: 500_000_000,    rate: 0.25 },
  { max: 5_000_000_000,  rate: 0.30 },
  { max: Infinity,       rate: 0.35 }
];

// Batas atas iuran BPJS
export const BPJS_CAP_KESEHATAN = 12_000_000;
export const BPJS_CAP_JP        = 10_042_300;

// Session guards
export const MIN_BOOT_GAP_MS = 3000;

// Roles
export const ROLES = { ADMIN:'admin', HR:'hr', MANAGER:'manager', EMPLOYEE:'employee' };
export const ROLE_LABELS = { admin:'Administrator', hr:'Staf HR', manager:'Manajer', employee:'Karyawan' };

// Recruitment pipeline
export const STAGES = [
  'administrative_selection',
  'psychotest',
  'hr_interview',
  'user_interview',
  'medical_checkup',
  'salary_negotiation',
  'job_offer',
  'rejected'
];

export const STAGE_LABELS = {
  administrative_selection: 'Seleksi Administrasi',
  psychotest: 'Psikotest',
  hr_interview: 'Interview HR',
  user_interview: 'Interview User',
  medical_checkup: 'Medical Checkup',
  salary_negotiation: 'Negosiasi Gaji',
  job_offer: 'Penawaran Kerja',
  rejected: 'Tidak Lolos'
};

// Employee movement
export const MOVEMENT_LABELS = {
  promotion: 'Promosi',
  transfer: 'Mutasi',
  demotion: 'Demosi',
  salary_change: 'Perubahan Gaji',
  manager_change: 'Perubahan Atasan'
};