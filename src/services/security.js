// src/services/security.js
// Security helpers that run on the client without trusting client identity.
// The database RPCs determine the authenticated user from auth.uid().

import { sb } from '../lib/supabase.js';

function detectDevice(ua = navigator.userAgent || ''){
  if(/tablet|ipad/i.test(ua)) return 'Tablet';
  if(/mobile|android|iphone|ipod/i.test(ua)) return 'Mobile';
  return 'Desktop';
}

function detectBrowser(ua = navigator.userAgent || ''){
  if(/Edg\//i.test(ua)) return 'Edge';
  if(/OPR\//i.test(ua)) return 'Opera';
  if(/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
  if(/Firefox\//i.test(ua)) return 'Firefox';
  if(/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Browser';
}

function approximateLocation(){
  // Deliberately does not request precise GPS permission.
  // Timezone is a broad, approximate region only.
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
  const locale = navigator.language || 'Unknown';
  const tzLabel = timezone === 'Asia/Jakarta' ? 'Indonesia • WIB'
    : timezone === 'Asia/Makassar' ? 'Indonesia • WITA'
    : timezone === 'Asia/Jayapura' ? 'Indonesia • WIT'
    : timezone;
  return { label: tzLabel, timezone, locale };
}

export function collectLoginContext(){
  const ua = navigator.userAgent || '';
  const loc = approximateLocation();
  return {
    approximate_location: loc.label,
    timezone: loc.timezone,
    device: detectDevice(ua),
    browser: detectBrowser(ua),
    user_agent: ua.slice(0, 500)
  };
}

export async function recordLoginHistory(){
  try{
    const ctx = collectLoginContext();
    const { error } = await sb.rpc('record_login_history', {
      p_approximate_location: ctx.approximate_location,
      p_timezone: ctx.timezone,
      p_device: ctx.device,
      p_browser: ctx.browser,
      p_user_agent: ctx.user_agent
    });
    if(error) console.warn('[security] Login history:', error.message);
    return !error;
  }catch(e){
    console.warn('[security] Login history exception:', e);
    return false;
  }
}

export async function recordAudit(action, entity, entityId = null, oldData = null, newData = null){
  try{
    const { error } = await sb.rpc('record_audit', {
      p_action: action,
      p_entity: entity,
      p_entity_id: entityId,
      p_old_data: oldData,
      p_new_data: newData
    });
    if(error) console.warn('[security] Audit:', error.message);
    return !error;
  }catch(e){
    console.warn('[security] Audit exception:', e);
    return false;
  }
}
