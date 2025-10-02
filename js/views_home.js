// views_home.js
import { getCurrentUser } from './api.js';
export function HomeView(){
  const el = document.createElement('div');
  el.className='space-y-4';
  const card = document.createElement('div');
  card.className='card p-6';
  card.innerHTML = `<div class="font-semibold">ยินดีต้อนรับ</div><div id="me" class="text-sm text-gray-600">กำลังตรวจสอบผู้ใช้...</div>`;
  el.appendChild(card);
  getCurrentUser().then(u=>{
    card.querySelector('#me').textContent = u ? (u.user_metadata?.full_name || u.email || u.id) : 'ยังไม่ได้เข้าสู่ระบบ';
  });
  return el;
}
