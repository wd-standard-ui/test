// auth_buttons.js
import { getCurrentUser, signOut } from './api.js';
import { loginWithLINE } from './liff-login.js';
export function mountAuthButtons(){
  const btnLine = document.getElementById('btnLineLogin');
  const btnLogout = document.getElementById('btnLogout');
  const badge = document.getElementById('userBadge');
  async function refresh(){
    const user = await getCurrentUser();
    if (user){
      badge.textContent = `${user.user_metadata?.full_name || user.email || user.id}`;
      badge.classList.remove('hidden'); btnLogout.classList.remove('hidden');
      btnLine.classList.add('hidden');
    }else{
      badge.classList.add('hidden'); btnLogout.classList.add('hidden');
      btnLine.classList.remove('hidden');
    }
  }
  btnLine.onclick = loginWithLINE;
  btnLogout.onclick = async ()=>{ await signOut(); location.hash='#/login'; };
  refresh(); window.addEventListener('hashchange', refresh);
}
