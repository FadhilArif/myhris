import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URLhttps://bgavbigiqlazmdxnyotw.supabase.co.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEYeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJnYXZiaWdpcWxhem1keG55b3R3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4NTUyOTEsImV4cCI6MjEwNTQzMTI5MX0.iaiUUFZXqpiQo5Xa1wVQEsOQo0U9B3jvzVBSe6E6qBg.trim();

export const supabaseConfigured = Boolean(url && key);

export const supabase = supabaseConfigured
  ? createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env."
    );
  }
  return supabase;
}
