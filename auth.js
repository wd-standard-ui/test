// auth.js
// ระบบยืนยันตัวตน: Email/Password + ตัวเลือกเข้าสู่ระบบด้วย LINE (ผ่าน LIFF + Supabase account mapping)
import { LIFF_ID } from './config.js';
import { sb, dbSelect, dbUpsert } from './db.js';
import { toast } from './ui.js';

export const Auth = {
  // สถานะผู้ใช้ปัจจุบัน (Supabase session.user + users table profile)
  session: null,
  profile: null,

  async init() {
    // อัปเดต badge ปุ่ม
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');

    // subscribe auth state
    sb.auth.onAuthStateChange(async (_event, session) => {
      this.session = session;
      await this.loadProfile();
      this.renderBadge();
    });

    // ตรวจสอบ session ปัจจุบัน
    const { data: { session } } = await sb.auth.getSession();
    this.session = session;
    await this.loadProfile();
    this.renderBadge();

    btnLogin.onclick = () => window.location.hash = '#/login';
    btnLogout.onclick = async () => {
      await sb.auth.signOut();
      this.profile = null;
      toast('ออกจากระบบแล้ว', 'success');
      window.location.hash = '#/login';
    };

    // เตรียม LIFF (ไม่บังคับต้องใช้เสมอ)
    try {
      await liff.init({ liffId: LIFF_ID });
    } catch (e) {
      console.warn('LIFF init error', e);
    }
  },

  async loadProfile() {
    const user = this.session?.user;
    if (!user) { this.profile = null; return; }
    // ดึงข้อมูลจากตาราง users
    const rows = await dbSelect('users', '*', q => q.eq('id', user.id).limit(1));
    this.profile = rows?.[0] || null;
    // ถ้าไม่มี profile ให้สร้างด้วยข้อมูลจาก auth metadata
    if (!this.profile) {
      const full_name = user.user_metadata?.full_name || user.email || 'ผู้ใช้ใหม่';
      const role = 'student';
      const grade_level = null;
      const created = await dbUpsert('users', { id: user.id, email: user.email, full_name, role, grade_level }, 'id');
      this.profile = created?.[0] || created;
    }
  },

  renderBadge() {
    const badge = document.getElementById('userBadge');
    const btnLogin = document.getElementById('btnLogin');
    const btnLogout = document.getElementById('btnLogout');
    if (this.session?.user) {
      const name = this.profile?.full_name || this.session.user.email;
      badge.textContent = `สวัสดี, ${name} (${this.profile?.role||'—'})`;
      badge.classList.remove('hidden');
      btnLogin.classList.add('hidden');
      btnLogout.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
      btnLogin.classList.remove('hidden');
      btnLogout.classList.add('hidden');
    }
  },

  // สมัคร/เข้าสู่ระบบด้วยอีเมล-รหัสผ่าน
  async registerEmail({ email, password, full_name, role='student', grade_level=null }) {
    const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name, role, grade_level } } });
    if (error) throw error;
    toast('สมัครสมาชิกสำเร็จ', 'success');
    return data;
  },
  async loginEmail({ email, password }) {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    toast('เข้าสู่ระบบสำเร็จ', 'success');
    return data;
  },

  // เข้าสู่ระบบด้วย LINE (วิธีจำลองผ่านบัญชี Supabase: ใช้ email รูปแบบ line_{userId}@line.local)
  async loginWithLINE() {
    try {
      if (!liff.isLoggedIn()) {
        await liff.login({}); // redirect กลับหน้าเดิม
        return;
      }
      const profile = await liff.getProfile();
      const email = `line_${profile.userId}@line.local`;
      // สร้าง password แบบ deterministic จาก userId (สำหรับเดโม่)
      const pwd = 'LINE-' + profile.userId.slice(-8);
      // signUp ถ้ายังไม่มี
      const { data: signData, error: signErr } = await sb.auth.signUp({
        email, password: pwd,
        options: { data: { full_name: profile.displayName, avatar: profile.pictureUrl, login_provider: 'line' } }
      });
      if (signErr && !String(signErr.message).includes('already registered')) throw signErr;

      // login
      const { data: login, error: loginErr } = await sb.auth.signInWithPassword({ email, password: pwd });
      if (loginErr) throw loginErr;
      toast('เข้าสู่ระบบด้วย LINE สำเร็จ', 'success');
      window.location.hash = '#/dashboard';
    } catch (e) {
      console.error(e);
      toast('เข้าสู่ระบบด้วย LINE ไม่สำเร็จ', 'error');
    }
  }
};
