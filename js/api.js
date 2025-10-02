// api.js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}
export async function setSessionFromTokens(tokens){
  // tokens: { access_token, refresh_token, token_type, expires_in, user? }
  const { data, error } = await supabase.auth.setSession({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
  });
  if (error) throw error;
  return data;
}
export async function signOut(){
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
