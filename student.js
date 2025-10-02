// student.js
// หน้าจอสำหรับนักเรียน: เลือกทำแบบทดสอบ, ทำข้อสอบแบบ interactive, ส่งผลและดูคะแนน
import { sb, dbSelect, dbInsert } from './db.js';
import { toast, skel } from './ui.js';

export const Student = {
  route: '#/student',

  async render(root, profile) {
    root.innerHTML = `
      <div class="mb-4">
        <h1 class="text-xl font-semibold">แดชบอร์ดนักเรียน</h1>
      </div>
      <section>
        <h2 class="text-lg font-semibold mb-2">ข้อสอบที่ทำได้</h2>
        <div id="examCatalog" class="grid md:grid-cols-2 gap-3">${skel(6)}</div>
      </section>
      <div id="examArea" class="mt-6"></div>
    `;
    await this.loadExams();
  },

  async loadExams() {
    const list = document.getElementById('examCatalog');
    try {
      const exams = await dbSelect('exams','*, subjects(name)', q=> q.eq('is_published', true).order('id', {ascending:false}));
      list.innerHTML = exams.map(ex=>`
        <div class="bg-white rounded-xl p-4 shadow-card">
          <div class="font-semibold">${ex.title}</div>
          <div class="text-xs text-slate-500">วิชา: ${ex.subjects?.name||'-'} • คะแนนเต็ม ${ex.total_score} • เวลา ${ex.time_limit} นาที</div>
          <div class="mt-3">
            <button data-id="${ex.id}" class="btn-start px-3 py-1.5 rounded bg-slate-900 text-white text-sm">เริ่มทำข้อสอบ</button>
          </div>
        </div>
      `).join('');
      list.querySelectorAll('.btn-start').forEach(b=> b.onclick = ()=> this.startExam(parseInt(b.dataset.id)));
    } catch(e) {
      console.error(e); toast('โหลดข้อสอบล้มเหลว','error');
      list.innerHTML = '<div class="text-sm text-rose-600">โหลดข้อสอบล้มเหลว</div>';
    }
  },

  async startExam(examId) {
    const area = document.getElementById('examArea');
    try {
      const exam = (await dbSelect('exams','*', q=> q.eq('id', examId).limit(1)))[0];
      const qs = await dbSelect('questions','*', q=> q.eq('exam_id', examId).order('id'));
      // เริ่ม attempt
      const at = (await dbInsert('student_attempts', { exam_id: examId, student_id: (await sb.auth.getUser()).data.user.id, score: 0, submitted_at: null, time_spent: 0 }))[0];

      // สถานะการทำข้อสอบ
      const state = {
        exam, qs, answers:{},
        endAt: Date.now() + (exam.time_limit||30)*60*1000
      };

      // Render
      area.innerHTML = `
        <div class="bg-white rounded-xl p-4 shadow-card">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold">${exam.title}</div>
              <div class="text-xs text-slate-500">เวลาที่เหลือ: <span id="timer">--:--</span></div>
            </div>
            <button id="btnSubmit" class="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm">ส่งคำตอบ</button>
          </div>
          <ol class="mt-4 space-y-4">
            ${qs.map((q,i)=>`
              <li class="border rounded-lg p-3">
                <div class="font-medium">ข้อ ${i+1}. ${q.question_text}</div>
                <div class="mt-2">${renderInteractive(q, i, at.id)}</div>
              </li>
            `).join('')}
          </ol>
        </div>
      `;

      // Timer
      const timerEl = document.getElementById('timer');
      const tHandle = setInterval(()=>{
        const ms = state.endAt - Date.now();
        if (ms<=0) { clearInterval(tHandle); document.getElementById('btnSubmit').click(); return; }
        const m = Math.floor(ms/60000), s = Math.floor((ms%60000)/1000);
        timerEl.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;
      }, 250);

      // Submit
      document.getElementById('btnSubmit').onclick = async ()=>{
        clearInterval(tHandle);
        try {
          // คำนวณคะแนน
          let score = 0;
          let total = 0;
          for (const q of qs) {
            const ans = captureAnswer(q);
            const correct = checkCorrect(q, ans);
            const pts = q.points||1;
            total += pts;
            if (correct) score += pts;
            await dbInsert('student_answers', {
              attempt_id: at.id, question_id: q.id,
              answer_data: ans, is_correct: correct, points_earned: correct? pts:0
            });
          }
          // ปรับยอดคะแนนรวมในตาราง attempts
          await fetch(`${sb.restUrl}/student_attempts?id=eq.${at.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type':'application/json', 'apikey': sb.supabaseKey, 'Authorization': f'Bearer {sb.supabaseKey}' },
            body: JSON.stringify({ score, submitted_at: new Date().toISOString() })
          });
          toast(`ส่งคำตอบแล้ว คะแนน: ${score}/${total}`, 'success');
          // แสดงผลย่อ
          area.innerHTML = `<div class="bg-white rounded-xl p-4 shadow-card">
            <div class="text-lg font-semibold mb-2">ผลคะแนน</div>
            <div class="text-2xl font-bold">${score} / ${total}</div>
            <button id="btnShowSolution" class="mt-4 px-3 py-1.5 rounded bg-slate-900 text-white text-sm">ดูเฉลย</button>
          </div>`;
          document.getElementById('btnShowSolution').onclick = ()=> this.showSolution(qs);
        } catch(e) {
          console.error(e); toast('ส่งคำตอบล้มเหลว','error');
        }
      };

    } catch(e) {
      console.error(e);
      toast('ไม่สามารถเริ่มทำข้อสอบได้','error');
    }
  },

  showSolution(qs){
    const area = document.getElementById('examArea');
    area.innerHTML += `
      <div class="mt-4 bg-white rounded-xl p-4 shadow-card">
        <div class="text-lg font-semibold mb-2">เฉลย</div>
        <ol class="list-decimal ml-6 space-y-1 text-sm">
          ${qs.map(q=>`<li>${solutionText(q)}</li>`).join('')}
        </ol>
      </div>`;
  }
};

function renderInteractive(q, idx, attemptId){
  if (q.question_type==='multiple_choice') {
    const opts = q.question_data?.options||[];
    return `<div class="space-y-2">${opts.map((o,i)=>`
      <label class="flex items-center gap-2">
        <input type="radio" name="q${q.id}" value="${i}" class="accent-slate-900">
        <span>${String.fromCharCode(65+i)}. ${o}</span>
      </label>`).join('')}</div>`;
  }
  if (q.question_type==='true_false') {
    return `<div class="flex gap-3">
      <button data-v="true" class="btn-tf px-3 py-1.5 rounded bg-slate-100">ถูก</button>
      <button data-v="false" class="btn-tf px-3 py-1.5 rounded bg-slate-100">ผิด</button>
    </div>`;
  }
  if (q.question_type==='fill_blank') {
    return `<input type="text" id="q${q.id}" class="w-full border rounded px-3 py-2" placeholder="คำตอบ...">`;
  }
  if (q.question_type==='matching') {
    const left = q.question_data?.left||[], right = q.question_data?.right||[];
    return `<div class="grid grid-cols-2 gap-4 text-sm">
      <div>${left.map((t,i)=>`<div class="my-1">${i+1}) ${t}</div>`).join('')}</div>
      <div>${left.map((_,i)=>`<select id="q${q.id}_${i}" class="border rounded px-2 py-1">
        ${right.map((t,j)=>`<option value="${String.fromCharCode(65+j)}">${String.fromCharCode(65+j)}: ${t}</option>`).join('')}
      </select>`).join('')}</div>
    </div>`;
  }
  return '';
}

function captureAnswer(q){
  if (q.question_type==='multiple_choice') {
    const el = document.querySelector(`input[name="q${q.id}"]:checked`);
    return el? parseInt(el.value) : null;
  }
  if (q.question_type==='true_false') {
    const active = document.querySelector(`#examArea .btn-tf[data-active="true"]`);
    return active? active.dataset.v === 'true' : null;
  }
  if (q.question_type==='fill_blank') {
    return document.getElementById(`q${q.id}`)?.value?.trim() || '';
  }
  if (q.question_type==='matching') {
    const left = q.question_data?.left||[];
    const map = {};
    left.forEach((_,i)=>{
      const sel = document.getElementById(`q${q.id}_${i}`);
      map[String(i+1)] = sel?.value || null;
    });
    return map;
  }
  return null;
}
function checkCorrect(q, ans){
  const key = q.correct_answer;
  if (q.question_type==='multiple_choice') return ans === key;
  if (q.question_type==='true_false') return ans === key;
  if (q.question_type==='fill_blank') return (ans||'').toLowerCase() === String(key||'').toLowerCase();
  if (q.question_type==='matching') {
    let ok = true;
    for (const k in key) if (key[k] !== ans?.[k]) { ok=false; break; }
    return ok;
  }
  return false;
}
function solutionText(q){
  const a = q.correct_answer;
  if (q.question_type==='multiple_choice') return `ข้อที่ถูก: ${String.fromCharCode(65+(a??0))}`;
  if (q.question_type==='true_false') return a? 'ถูก' : 'ผิด';
  if (q.question_type==='fill_blank') return `คำตอบ: ${a}`;
  if (q.question_type==='matching') return Object.entries(a||{}).map(([k,v])=>`${k}→${v}`).join(', ');
  return '-';
}

// toggle true/false active button
document.addEventListener('click', (ev)=>{
  const btn = ev.target.closest('.btn-tf');
  if (!btn) return;
  const wrap = btn.parentElement;
  wrap.querySelectorAll('.btn-tf').forEach(b=> b.removeAttribute('data-active'));
  btn.setAttribute('data-active','true');
});
