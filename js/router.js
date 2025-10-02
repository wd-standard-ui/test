// router.js
// ===== ตัวจัดการเส้นทางแบบ hash SPA (#/path) =====
import { LoginView } from './auth.js';
import { TeacherView } from './teacher.js';
import { StudentView } from './student.js';
import { AnalyticsView } from './stats.js';
import { getCurrentUser } from './api.js';

export async function mountRouter(outlet) {
  const routes = {
    '/login': LoginView,
    '/teacher': TeacherView,
    '/student': StudentView,
    '/analytics': AnalyticsView
  };

  async function render() {
    const hash = location.hash.replace('#','') || '/student';
    const [path] = hash.split('?');
    outlet.innerHTML = '';
    let View = routes[path] || StudentView;

    // ป้องกันสิทธิ์เบื้องต้น
    const user = await getCurrentUser();
    if (!user && path !== '/login') {
      View = LoginView;
    } else if (user) {
      const role = user.user_metadata?.role || 'student';
      if (path==='/teacher' && role!=='teacher') View = StudentView;
    }

    outlet.appendChild(View());
  }

  window.addEventListener('hashchange', render);
  await render();
}
