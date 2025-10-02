// ui.js
// ===== ส่วน UI/UX: Toast, Loading, Helpers =====

export function toast(message, type='info', timeout=2600) {
  const host = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type==='success'?'toast-success':type==='error'?'toast-error':'toast-info'}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(()=>{
    el.classList.add('opacity-0','translate-y-2','smooth');
    setTimeout(()=> el.remove(), 300);
  }, timeout);
}

export function skelLine(w='100%', h=12) {
  const d = document.createElement('div');
  d.className = 'skel';
  d.style.width = w;
  d.style.height = h+'px';
  return d;
}

export function $ (sel, root=document) { return root.querySelector(sel); }
export function $$ (sel, root=document) { return Array.from(root.querySelectorAll(sel)); }

export function fmtTime(sec) {
  const m = Math.floor(sec/60).toString().padStart(2,'0');
  const s = Math.floor(sec%60).toString().padStart(2,'0');
  return `${m}:${s}`;
}

export function confirmDialog(title, text) {
  return new Promise((resolve)=>{
    const ok = confirm(`${title}\n\n${text}`);
    resolve(ok);
  });
}
