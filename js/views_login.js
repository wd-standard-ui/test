// views_login.js
import { loginWithLINE } from './liff-login.js';
import { $ } from './ui.js';
export function LoginView(){
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="max-w-md mx-auto card p-6 space-y-4">
      <h2 class="text-xl font-bold">เข้าสู่ระบบ</h2>
      <p class="text-sm text-gray-600">เข้าสู่ระบบด้วย LINE (ผ่าน Edge Function)</p>
      <button id="btnLine" class="px-3 py-2 rounded-lg bg-emerald-600 text-white">Login with LINE</button>
    </div>`;
  $('#btnLine', el).onclick = loginWithLINE;
  return el;
}
