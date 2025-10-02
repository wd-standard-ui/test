// auth.js
// ===== จัดการหน้า Login/Register + ปุ่ม Login/Logout บนหัวเว็บ =====
import { supabase, signInWithEmail, signUpWithEmail, signOut, getCurrentUser } from './api.js';
import { toast, $, $$ } from './ui.js';

export function mountAuthButtons() {
  const btnLogin = $('#btnLogin');
  const btnLogout = $('#btnLogout');
  const badge = $('#userBadge');

  async function refresh() {
    const user = await getCurrentUser();
    if (user) {
      const profile = user.user_metadata || {};
      badge.textContent = `${profile.full_name || user.email} (${profile.role||'student'})`;
      badge.classList.remove('hidden');
      btnLogin.classList.add('hidden');
      btnLogout.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
      btnLogin.classList.remove('hidden');
      btnLogout.classList.add('hidden');
    }
  }

  btnLogin.onclick = () => location.hash = '#/login';
  btnLogout.onclick = async () => {
    await signOut();
    toast('ออกจากระบบแล้ว', 'success');
    location.hash = '#/login';
  };

  refresh();
  supabase.auth.onAuthStateChange((_e,_s)=> refresh());
}

export function LoginView() {
  const el = document.createElement('div');
  el.innerHTML = `
    <div class="max-w-md mx-auto card p-6 space-y-5">
      <h2 class="text-xl font-bold">เข้าสู่ระบบ / สมัครสมาชิก</h2>
      <div class="space-y-4">
        <div>
          <label class="label">อีเมล</label>
          <input id="email" type="email" class="input" placeholder="name@example.com" required>
        </div>
        <div>
          <label class="label">รหัสผ่าน</label>
          <input id="password" type="password" class="input" placeholder="••••••••" required>
        </div>
        <div>
          <label class="label">ชื่อ-นามสกุล (สมัครใหม่)</label>
          <input id="full_name" type="text" class="input" placeholder="ชื่อ-นามสกุล">
        </div>
        <div>
          <label class="label">บทบาท</label>
          <select id="role" class="input">
            <option value="student">นักเรียน</option>
            <option value="teacher">ครู</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button id="btnDoLogin" class="btn btn-primary">เข้าสู่ระบบ</button>
          <button id="btnDoRegister" class="btn btn-gray">สมัครสมาชิก</button>
        </div>
      </div>
      <p class="text-sm text-gray-500">หลังเข้าสู่ระบบแล้ว ระบบจะนำไปยังหน้าที่เหมาะสมตามบทบาท</p>
    </div>
  `;

  const email = el.querySelector('#email');
  const password = el.querySelector('#password');
  const full_name = el.querySelector('#full_name');
  const roleSel = el.querySelector('#role');

  el.querySelector('#btnDoLogin').onclick = async () => {
    try {
      await signInWithEmail(email.value.trim(), password.value);
      toast('ยินดีต้อนรับ', 'success');
      // redirect ตาม role
      const user = await getCurrentUser();
      const role = user?.user_metadata?.role || 'student';
      location.hash = role==='teacher' ? '#/teacher' : '#/student';
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  el.querySelector('#btnDoRegister').onclick = async () => {
    try {
      if (!email.value || !password.value || !full_name.value) throw new Error('กรอกข้อมูลให้ครบ');
      await signUpWithEmail({
        email: email.value.trim(),
        password: password.value,
        full_name: full_name.value.trim(),
        role: roleSel.value
      });
      toast('สมัครสำเร็จ! โปรดยืนยันอีเมล (ถ้ามี) แล้วเข้าสู่ระบบ', 'success');
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return el;
}
