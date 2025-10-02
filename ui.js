// ui.js
// ยูทิลิตี้ UI พื้นฐาน: toast, skeleton, spinners, confirm dialogs

export function toast(message, type='info') {
  const root = document.getElementById('toastRoot');
  const el = document.createElement('div');
  el.className = [
    'px-4 py-2 rounded shadow-card text-sm',
    type === 'success' ? 'bg-emerald-500 text-white' :
    type === 'error' ? 'bg-rose-500 text-white' :
    type === 'warn' ? 'bg-amber-500 text-white' : 'bg-slate-800 text-white'
  ].join(' ');
  el.textContent = message;
  root.appendChild(el);
  setTimeout(()=>{
    el.classList.add('opacity-0','translate-y-1','transition');
    setTimeout(()=>el.remove(), 300);
  }, 2000);
}

export function spinner(size='md') {
  const px = size==='lg'? 'w-8 h-8' : size==='sm'?'w-4 h-4':'w-6 h-6';
  return `<svg class="animate-spin ${px} text-slate-500" viewBox="0 0 24 24">
    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
  </svg>`;
}

export function skel(lines=3) {
  let html = '<div class="space-y-2">';
  for (let i=0;i<lines;i++) {
    const w = 50 + Math.floor(Math.random()*40);
    html += `<div class="h-3 bg-slate-200 rounded" style="width:${w}%"></div>`;
  }
  html += '</div>';
  return html;
}

export async function confirmDialog({title='ยืนยันการทำรายการ', detail='โปรดยืนยัน', ok='ยืนยัน', cancel='ยกเลิก'}={}) {
  return new Promise(resolve => {
    const root = document.getElementById('dialogRoot');
    const wrap = document.createElement('div');
    wrap.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/40';
    wrap.innerHTML = `
      <div class="bg-white rounded-xl shadow-card max-w-md w-full p-6">
        <div class="font-semibold text-lg mb-1">${title}</div>
        <div class="text-sm text-slate-600 mb-4">${detail}</div>
        <div class="flex justify-end gap-2">
          <button id="dlgCancel" class="px-3 py-1.5 rounded bg-slate-100 text-slate-700">${cancel}</button>
          <button id="dlgOk" class="px-3 py-1.5 rounded bg-slate-900 text-white">${ok}</button>
        </div>
      </div>`;
    root.appendChild(wrap);
    wrap.querySelector('#dlgCancel').onclick = ()=>{ wrap.remove(); resolve(false); };
    wrap.querySelector('#dlgOk').onclick = ()=>{ wrap.remove(); resolve(true); };
  });
}
