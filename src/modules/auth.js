// src/modules/auth.js
import { doLogin, doLogout, doSignup, toggleSignup, togglePassword, safeBoot } from '../services/auth.js';
import { sb } from '../lib/supabase.js';

const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.4 5.3A10.9 10.9 0 0 1 12 5c7 0 11 7 11 7a13.6 13.6 0 0 1-3.1 3.8M6.5 6.6C4 8.3 2 11 2 11a13.7 13.7 0 0 0 5.1 5.1"/></svg>';

// Bind ke window untuk akses dari HTML
window.EYE_OPEN = EYE_OPEN;
window.EYE_CLOSED = EYE_CLOSED;
window.doLogin = doLogin;
window.doLogout = doLogout;
window.doSignup = doSignup;
window.toggleSignup = toggleSignup;
window.togglePassword = togglePassword;

// Init auth listeners
export function initAuth(){
  // Cek sesi awal
  (async () => {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if(!session || !session.user) return;
      const { data: userData, error: userErr } = await sb.auth.getUser();
      if(userErr || !userData || !userData.user){
        console.warn('Stale session, cleaning...');
        try { await sb.auth.signOut(); } catch(e){}
        return;
      }
      await safeBoot(userData.user);
    } catch(e){ console.error('Init error:', e); }
  })();

  // Listen to auth state changes
  sb.auth.onAuthStateChange(async (event, session) => {
    if(event === 'SIGNED_IN' && session && session.user){
      await safeBoot(session.user);
    }
    else if(event === 'SIGNED_OUT'){
      window.location.reload();
    }
    else if(event === 'TOKEN_REFRESHED' && session){
      // Just update current user
      const { state } = await import('../state/store.js');
      state.currentUser = session.user;
    }
  });
}
