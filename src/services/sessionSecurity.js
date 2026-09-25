// src/services/sessionSecurity.js
// Session security for the browser.
// Supabase handles JWT refresh; this layer adds an inactivity timeout
// so a forgotten open workstation does not remain active indefinitely.

import { state } from '../state/store.js';
import { doLogout } from './auth.js';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const CHECK_INTERVAL_MS = 30 * 1000;   // check every 30 seconds
const ACTIVITY_EVENTS = ['click','keydown','mousemove','scroll','touchstart'];

let lastActivityAt = Date.now();
let timer = null;
let started = false;

function markActivity(){
  lastActivityAt = Date.now();
}

async function checkIdle(){
  if(!state.profile || !state.currentUser) return;
  if(Date.now() - lastActivityAt < IDLE_TIMEOUT_MS) return;

  try{
    await doLogout();
  }finally{
    lastActivityAt = Date.now();
  }
}

export function initSessionSecurity(){
  if(started) return;
  started = true;

  ACTIVITY_EVENTS.forEach(event => {
    window.addEventListener(event, markActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', markActivity);
  lastActivityAt = Date.now();
  timer = window.setInterval(checkIdle, CHECK_INTERVAL_MS);
}

export function resetSessionActivity(){
  lastActivityAt = Date.now();
}

export function stopSessionSecurity(){
  if(timer) window.clearInterval(timer);
  timer = null;
  started = false;
  ACTIVITY_EVENTS.forEach(event => {
    window.removeEventListener(event, markActivity);
  });
  document.removeEventListener('visibilitychange', markActivity);
}
