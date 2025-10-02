// app.js
import { mountRouter } from './router.js';
import { mountAuthButtons } from './auth_buttons.js';
window.addEventListener('DOMContentLoaded', ()=>{
  mountAuthButtons();
  mountRouter(document.getElementById('app'));
});
