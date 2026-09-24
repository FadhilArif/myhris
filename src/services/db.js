// src/services/db.js
import { sb } from '../lib/supabase.js';
import { state } from '../state/store.js';
import { showToast, el } from '../utils/dom.js';

export async function sbAll(table, opts={}){
  let q = sb.from(table).select(opts.select || '*');
  if(opts.eq) for(const k in opts.eq) q = q.eq(k, opts.eq[k]);
  if(opts.order) q = q.order(opts.order.col, {ascending: opts.order.asc !== false});

  const { data, error } = await q;

  if(error){
    console.warn(`[sbAll] ${table}:`, error.code, error.message);

    if(error.code === '401' || (error.message||'').toLowerCase().includes('jwt')){
      if(!state.sessionExpiring){
        state.sessionExpiring = true;
        showToast('Sesi berakhir. Silakan login kembali.', true);
        try { await sb.auth.signOut(); } catch(e){}
        state.currentUser = null; state.profile = null; state.me = null;
        state.bootedUserId = null;
        el('app').style.display = 'none';
        el('login-screen').style.display = 'flex';
        setTimeout(()=>{ state.sessionExpiring = false; }, 3000);
      }
      return [];
    }

    if(error.code === '429' || (error.message||'').toLowerCase().includes('rate limit')){
      console.warn('[sbAll] Rate limited, backing off...');
      return [];
    }

    if(!state.booting) showToast('Gagal memuat data: '+error.message, true);
    return [];
  }
  return data || [];
}

export async function sbAllQuiet(table, opts={}){
  try{
    let q = sb.from(table).select(opts.select || '*');
    if(opts.eq) for(const k in opts.eq) q = q.eq(k, opts.eq[k]);
    if(opts.order) q = q.order(opts.order.col, {ascending: opts.order.asc !== false});
    const { data, error } = await q;
    if(error) return [];
    return data || [];
  } catch(e){ return []; }
}
