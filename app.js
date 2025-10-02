// app.js
// Router ง่าย ๆ + view selection (login/register/dashboard)
import { Auth } from './auth.js';
import { Teacher } from './teacher.js';
import { Student } from './student.js';
import { toast } from './ui.js';

const app = document.getElementById('app');

window.addEventListener('hashchange', route);
window.addEventListener('load', async ()=>{
  document.getElementById('envBadge').textContent = 'GitHub Pages Ready';
  await Auth.init();
  route();
});

function requireAuth() {
  if (!Auth.session?.user) {
    window.location.hash = '#/login';
    throw new Error('NeedAuth');
  }
}

async function route() {
  const hash = location.hash || '#/login';
  try {
    if (hash.startsWith('#/login')) return renderLogin();

    // ต้องยืนยันตัวตนก่อน
    requireAuth();

    if (hash.startsWith('#/teacher')) return Teacher.render(app, Auth.profile);
    if (hash.startsWith('#/student')) return Student.render(app, Auth.profile);
    if (hash.startsWith('#/dashboard')) {
      // นำผู้ใช้ไปยังแดชบอร์ดตามบทบาท
      if (Auth.profile?.role === 'teacher') return Teacher.render(app, Auth.profile);
      return Student.render(app, Auth.profile);
    }

    // default
    window.location.hash = '#/dashboard';
  } catch(e) {
    if (e.message!=='NeedAuth') {
      console.error(e);
      toast('เกิดข้อผิดพลาดระหว่างนำทาง','error');
    }
  }
}

function renderLogin(){
  app.innerHTML = `
    <div class="max-w-md mx-auto">
      <div class="bg-white rounded-xl shadow-card p-6">
        <div class="text-lg font-semibold mb-2">เข้าสู่ระบบ</div>
        <div class="space-y-3">
          <input id="email" type="email" class="w-full border rounded px-3 py-2" placeholder="อีเมล">
          <input id="password" type="password" class="w-full border rounded px-3 py-2" placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)">
          <input id="full_name" type="text" class="w-full border rounded px-3 py-2" placeholder="ชื่อ-นามสกุล (ตอนสมัคร)" />
          <select id="role" class="w-full border rounded px-3 py-2">
            <option value="student">นักเรียน</option>
            <option value="teacher">ครู</option>
          </select>
          <button id="btnLoginEmail" class="w-full px-3 py-2 rounded bg-slate-900 text-white">เข้าสู่ระบบ (Email)</button>
          <button id="btnRegister" class="w-full px-3 py-2 rounded bg-slate-100">สมัครสมาชิกใหม่</button>
          <div class="relative flex items-center my-2">
            <div class="flex-grow border-t border-slate-200"></div>
            <div class="px-3 text-xs text-slate-400">หรือ</div>
            <div class="flex-grow border-t border-slate-200"></div>
          </div>
          <button id="btnLine" class="w-full px-3 py-2 rounded bg-green-600 text-white">เข้าสู่ระบบด้วย LINE</button>
        </div>
      </div>
      <p class="text-center text-xs text-slate-500 mt-3">หลังเข้าสู่ระบบจะนำไปยังแดชบอร์ดอัตโนมัติ</p>
    </div>
  `;

  document.getElementById('btnLoginEmail').onclick = async ()=>{
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) return toast('กรอกอีเมลและรหัสผ่าน','warn');
    try {
      await (await import('./auth.js')).Auth.loginEmail({ email, password });
      window.location.hash = '#/dashboard';
    } catch(e) {
      console.error(e); toast(e.message||'เข้าสู่ระบบไม่สำเร็จ','error');
    }
  };
  document.getElementById('btnRegister').onclick = async ()=>{
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const full_name = document.getElementById('full_name').value.trim() || email;
    const role = document.getElementById('role').value;
    if (!email || !password) return toast('กรอกอีเมลและรหัสผ่าน','warn');
    try {
      await (await import('./auth.js')).Auth.registerEmail({ email, password, full_name, role });
      toast('สมัครแล้ว เข้าสู่ระบบด้วยอีเมลที่ลงทะเบียน', 'success');
    } catch(e) {
      console.error(e); toast(e.message||'สมัครไม่สำเร็จ','error');
    }
  };
  document.getElementById('btnLine').onclick = ()=> (await import('./auth.js')).Auth.loginWithLINE();
}
