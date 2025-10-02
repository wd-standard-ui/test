// js/auth.js
// Robust mountAuthButtons: ไม่ล้มเมื่อหา element ไม่เจอ
import { getCurrentUser, signOut } from './api.js';
import { loginWithLINE } from './liff-login.js';

export async function mountAuthButtons(options = {}){
  const {
    btnLineId = 'btnLineLogin',
    btnLogoutId = 'btnLogout',
    badgeId = 'userBadge'
  } = options;

  const btnLine = document.getElementById(btnLineId);
  const btnLogout = document.getElementById(btnLogoutId);
  const badge = document.getElementById(badgeId);

  if (!btnLine || !btnLogout || !badge){
    console.warn('[mountAuthButtons] Missing required elements:', { btnLine, btnLogout, badge });
    return; // ออกจากฟังก์ชัน ไม่โยน error
  }

  async function refresh(){
    try{
      const user = await getCurrentUser();
      if (user){
        badge.textContent = `${user.user_metadata?.full_name || user.email || user.id}`;
        badge.classList.remove('hidden'); btnLogout.classList.remove('hidden');
        btnLine.classList.add('hidden');
      }else{
        badge.classList.add('hidden'); btnLogout.classList.add('hidden');
        btnLine.classList.remove('hidden');
      }
    }catch(e){
      console.error('[mountAuthButtons] refresh error', e);
    }
  }

  btnLine.onclick = ()=>{ try{ loginWithLINE(); }catch(e){ console.error(e); } };
  btnLogout.onclick = async ()=>{ try{ await signOut(); location.hash='#/login'; }catch(e){ console.error(e); } };

  // เรียกหลัง DOM พร้อมแล้ว
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', refresh, { once: true });
  }else{
    refresh();
  }
  window.addEventListener('hashchange', refresh);
}
