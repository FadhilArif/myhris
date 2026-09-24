// src/services/audit.js
import { sb } from '../lib/supabase.js';
import { state } from '../state/store.js';

export async function logAudit(action, entity, entityId, oldData = null, newData = null){
  try {
    await sb.from('audit_logs').insert({
      actor_id: state.currentUser?.id || null,
      actor_name: state.profile?.full_name || 'Sistem',
      action,
      entity,
      entity_id: entityId,
      old_data: oldData,
      new_data: newData
    });
  } catch(e){
    console.warn('[audit] Gagal catat log:', e);
  }
}
