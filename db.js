// db.js
// ตัวช่วยสร้าง Supabase client และชุดฟังก์ชันที่ใช้บ่อย
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // ไม่ใช้ localStorage/sessionStorage
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

// ฟังก์ชันห่อเรียกใช้งานที่พร้อม error handling
export async function dbInsert(table, values) {
  const { data, error } = await sb.from(table).insert(values).select();
  if (error) throw error;
  return data;
}
export async function dbUpsert(table, values, onConflict) {
  const { data, error } = await sb.from(table).upsert(values, { onConflict }).select();
  if (error) throw error;
  return data;
}
export async function dbUpdate(table, match, values) {
  const { data, error } = await sb.from(table).update(values).match(match).select();
  if (error) throw error;
  return data;
}
export async function dbDelete(table, match) {
  const { data, error } = await sb.from(table).delete().match(match).select();
  if (error) throw error;
  return data;
}
export async function dbSelect(table, query = '*', filters = (q)=>q) {
  let q = sb.from(table).select(query);
  q = filters(q);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}
