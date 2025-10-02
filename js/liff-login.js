// liff-login.js (Edge Function version)
import { setSessionFromTokens } from './api.js';
import { LIFF_ID, EDGE_LOGIN_ENDPOINT } from './config.js';
import { toast } from './ui.js';

export async function loginWithLINE(){
  try{
    await liff.init({ liffId: LIFF_ID });
    if (!liff.isLoggedIn()) { liff.login(); return; }
    const idToken = liff.getIDToken();
    if (!idToken) throw new Error('ไม่ได้รับ idToken จาก LIFF');

    // Optional: send displayName to backend for profile upsert
    let profile = null;
    try { profile = await liff.getProfile(); } catch {}

    const res = await fetch(EDGE_LOGIN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_token: idToken,
        display_name: profile?.displayName || null,
        user_id: profile?.userId || null
      })
    });
    if (!res.ok){
      const msg = await res.text();
      throw new Error(msg || 'Edge login failed');
    }
    const tokens = await res.json();
    await setSessionFromTokens(tokens);

    toast('เข้าสู่ระบบด้วย LINE สำเร็จ','success');
    location.hash = '#/home';
  }catch(e){
    console.error(e);
    toast(e.message || 'LINE login ล้มเหลว','error');
  }
}
