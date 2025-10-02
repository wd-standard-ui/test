// ui.js
export function toast(message, type='info', timeout=2400){
  const host = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `rounded-lg px-4 py-3 shadow text-sm ${type==='success'?'bg-green-600 text-white':type==='error'?'bg-red-600 text-white':'bg-blue-600 text-white'}`;
  el.textContent = message;
  host.appendChild(el);
  setTimeout(()=>{ el.classList.add('opacity-0','translate-y-2'); setTimeout(()=>el.remove(),300)}, timeout);
}
export const $ = (s, r=document)=> r.querySelector(s);
