// src/services/auth.js
import { sb } from '../lib/supabase.js';
import { state, CACHE, isHR } from '../state/store.js';
import { MIN_BOOT_GAP_MS } from '../config/constants.js';
import { el, showToast } from '../utils/dom.js';
import { sbAll } from './db.js';

// Re-export untuk kompatibilitas window binding
export async function doSignup(){
  const email = el('login-email').value.trim();
  const password = el('login-password').value;
  const name = el('signup-name').value.trim();
  if(!email || !password || !name){ showLoginError('Lengkapi email, kata sandi, dan nama.'); return; }
  try {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: name } } });
    if(error){ showLoginError(error.message); return; }
    showToast('Akun dibuat. Silakan masuk.');
    toggleSignup();
  } catch(e){
    showLoginError('Terjadi kesalahan: ' + e.message);
  }
}

export function showLoginError(msg){
  const box = el('login-error');
  if(!box) return;
  box.textContent = msg;
  box.style.display = 'block';
}

export function toggleSignup(){
  const box = el('signup-extra');
  box.style.display = box.style.display === 'none' ? 'block' : 'none';
}

export function togglePassword(inputId, iconEl){
  const input = el(inputId);
  const isHidden = input.type === 'password';
  input.type = isHidden ? 'text' : 'password';
  iconEl.innerHTML = isHidden ? window.EYE_CLOSED : window.EYE_OPEN;
}

export async function doLogin(){
  const email = el('login-email').value.trim();
  const password = el('login-password').value;
  const errBox = el('login-error');
  if(errBox) errBox.style.display = 'none';
  if(!email || !password){ showLoginError('Isi email dan kata sandi.'); return; }

  const btn = document.querySelector('button[onclick="doLogin()"]');
  if(btn){ btn.disabled = true; btn.textContent = 'Memuat…'; }

  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if(error){
      if(error.status === 429 || (error.message||'').toLowerCase().includes('rate limit')){
        showLoginError('Terlalu banyak percobaan. Tunggu 1-2 menit lalu coba lagi.');
      } else {
        showLoginError(error.message);
      }
      return;
    }
    if(!data || !data.user){ showLoginError('Login gagal, coba lagi.'); return; }
    state.bootedUserId = null;
    await safeBoot(data.user);
  } catch(e){
    console.error('Login exception:', e);
    showLoginError('Terjadi kesalahan. Coba lagi.');
  } finally {
    if(btn){ btn.disabled = false; btn.textContent = 'Masuk'; }
  }
}

export async function doLogout(){
  try { await sb.auth.signOut(); } catch(e){}
  state.currentUser = null; state.profile = null; state.me = null;
  state.bootedUserId = null;
  state.booting = false;
  el('app').style.display = 'none';
  el('login-screen').style.display = 'flex';
  if(el('login-password')) el('login-password').value = '';
  if(el('login-error')) el('login-error').style.display = 'none';
}

export async function bootAfterLogin(user){
  if(!user || !user.id) return;
  state.currentUser = user;

  let profile = null;
  try {
    const { data, error } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if(error){
      console.warn('[boot] profile fetch:', error.code, error.message);
      if(error.code === '401' || (error.message||'').toLowerCase().includes('jwt')){
        await doLogout();
        return;
      }
    } else {
      profile = data;
    }
  } catch(e){ console.warn('[boot] profile fetch exception:', e); }

  if(!profile){
    try {
      const { data, error } = await sb.from('profiles')
        .insert({ id: user.id, full_name: user.email, role: 'employee' })
        .select().maybeSingle();
      if(error){
        console.warn('[boot] profile insert blocked:', error.message);
        profile = { id: user.id, full_name: user.email, role: 'employee', employee_id: null };
      } else {
        profile = data;
      }
    } catch(e){
      profile = { id: user.id, full_name: user.email, role: 'employee', employee_id: null };
    }
  }

  state.profile = profile;
  state.me = null;

  if(state.profile.employee_id){
    try {
      const { data } = await sb.from('employees')
        .select('*, departments(name), positions(name)')
        .eq('id', state.profile.employee_id).maybeSingle();
      state.me = data || null;
    } catch(e){ /* ignore */ }
  }

  el('login-screen').style.display = 'none';
  el('app').style.display = 'block';
  el('user-name').textContent = state.profile.full_name;
  el('user-role').textContent = window.ROLE_LABELS[state.profile.role] || state.profile.role;
  window.updateSidebarAvatar();

  try { await window.preloadMaster(); } catch(e){ console.warn('preloadMaster failed:', e); }

  window.buildNav();
  const startRoute = location.hash.replace('#','') || 'dashboard';
  window.navigate(startRoute);
  el('topbar-date').textContent = new Date().toLocaleDateString('id-ID',{weekday:'long', day:'numeric', month:'long', year:'numeric'});
}

export async function safeBoot(user){
  if(!user || !user.id) return;
  if(state.bootedUserId === user.id && state.profile) return;
  if(state.booting) return;
  if(Date.now() - state.lastBootAt < MIN_BOOT_GAP_MS) return;

  state.booting = true;
  state.lastBootAt = Date.now();
  try {
    await bootAfterLogin(user);
    if(state.profile) state.bootedUserId = user.id;
  } catch(e){
    console.error('Boot error:', e);
  } finally {
    state.booting = false;
  }
}

export async function preloadMaster(){
  CACHE.departments = await sbAll('departments', {order:{col:'name'}});
  CACHE.positions = await sbAll('positions', {order:{col:'name'}});
  CACHE.leaveTypes = await sbAll('leave_types', {order:{col:'name'}});
  CACHE.shiftList = await sbAll('work_shifts', {order:{col:'start_time'}});
  if(isHR() || state.profile?.role === 'manager') CACHE.employees = await sbAll('employees', {select:'*, departments(name), positions(name)', order:{col:'full_name'}});
}
