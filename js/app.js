// app.js
// ===== Entry: ติดตั้ง Router + Auth Buttons และ bootstrap ข้อมูลพื้นฐาน =====
import { mountAuthButtons } from './auth.js';
import { mountRouter } from './router.js';
import { $ } from './ui.js';
import './config.js'; // ensure loaded

window.addEventListener('DOMContentLoaded', async ()=>{
  mountAuthButtons();
  const outlet = document.getElementById('app');
  await mountRouter(outlet);

  // สำหรับ print-only date
  const d = new Date();
  const pad = n => String(n).padStart(2,'0');
  const now = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const p = document.getElementById('printDate'); if (p) p.textContent = now;
});
