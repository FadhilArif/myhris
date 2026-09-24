// src/lib/supabase.js
export const SUPABASE_URL = "https://viawltcutsvaawvjqgsk.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpYXdsdGN1dHN2YWF3dmpxZ3NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NjUwODQsImV4cCI6MjEwNTQ0MTA4NH0.hhpVS35YUbadEGagHG7aA7A5DFxlrd4VOZz7mxO0dJo";

// Pakai window.supabase dari CDN (dimuat di index.html)
export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'myhris-internal-auth' }
});
