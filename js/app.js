// js/app.js
import { mountAuthButtons } from './auth.js';
import { mountRouter } from './router.js'; // ถ้าไม่มี router ให้คอมเมนต์บรรทัดนี้ทิ้ง

window.addEventListener('DOMContentLoaded', ()=>{
  // ป้องกัน error ถ้าไม่มี element ตาม id ในหน้า
  try { mountAuthButtons(); } catch(e){ console.error('mountAuthButtons failed', e); }
  try {
    const outlet = document.getElementById('app');
    if (outlet && typeof mountRouter === 'function') mountRouter(outlet);
  } catch(e){ console.error('mountRouter failed', e); }
});
