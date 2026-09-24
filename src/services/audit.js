// src/services/audit.js
// Audit writes go through a SECURITY DEFINER RPC.
// The database derives actor_id from auth.uid() so the browser cannot spoof the actor.

import { recordAudit } from './security.js';

export async function logAudit(action, entity, entityId, oldData = null, newData = null){
  return recordAudit(action, entity, entityId, oldData, newData);
}
