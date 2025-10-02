// router.js
import { LoginView } from './views_login.js';
import { HomeView } from './views_home.js';
export function mountRouter(outlet){
  const routes = {'/login': LoginView, '/home': HomeView};
  function render(){
    const path = location.hash.replace('#','') || '/home';
    const View = routes[path] || HomeView;
    outlet.innerHTML = ''; outlet.appendChild(View());
  }
  window.addEventListener('hashchange', render); render();
}
