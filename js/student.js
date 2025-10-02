// student.js
// ===== หน้านักเรียน: รายการข้อสอบ, ทำข้อสอบ, timer, ส่งคะแนน, ดูเฉลย =====
import { $, $$, toast, fmtTime } from './ui.js';
import { listExams, getExam, listQuestions, createAttempt, updateAttempt, insertAnswers, getCurrentUser, listMyAttempts } from './api.js';

function ExamCard(ex) {
  return `
    <div class="card p-5 flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <div class="font-semibold">${ex.title}</div>
        <span class="chip">เวลา ${ex.time_limit} นาที</span>
      </div>
      <div class="text-sm text-gray-500 flex items-center gap-3">
        <span>คะแนนเต็ม ${ex.total_score}</span>
        <span>ผ่านที่ ${ex.passing_score}</span>
      </div>
      <div class="flex items-center justify-end">
        <button class="btn btn-primary btnStart" data-id="${ex.id}">เริ่มทำ</button>
      </div>
    </div>
  `;
}

function renderQuestion(q, idx, state) {
  // question_data เป็น JSON ตามประเภท
  let data = {};
  try { data = q.question_data ? JSON.parse(q.question_data) : {}; } catch {}
  const name = `q_${q.id}`;
  const wrap = document.createElement('div');
  wrap.className = 'p-4 rounded-xl border border-gray-200 space-y-2';
  wrap.innerHTML = `<div class="font-medium">${idx}. ${q.question_text||''}</div>`;

  if (q.question_type==='multiple_choice') {
    const choices = data.choices || ['ก','ข','ค','ง'];
    const box = document.createElement('div');
    box.className = 'grid md:grid-cols-2 gap-2';
    choices.forEach((c,i)=>{
      const id = `${name}_${i}`;
      box.insertAdjacentHTML('beforeend', `
        <label class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50">
          <input type="radio" name="${name}" value="${i}">
          <span>${c}</span>
        </label>
      `);
    });
    wrap.appendChild(box);
  } else if (q.question_type==='true_false') {
    wrap.insertAdjacentHTML('beforeend', `
      <div class="flex items-center gap-3">
        <label class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50">
          <input type="radio" name="${name}" value="true"><span>ถูก</span>
        </label>
        <label class="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-gray-50">
          <input type="radio" name="${name}" value="false"><span>ผิด</span>
        </label>
      </div>
    `);
  } else if (q.question_type==='fill_blank') {
    wrap.insertAdjacentHTML('beforeend', `<input class="input" name="${name}" placeholder="พิมพ์คำตอบ">`);
  } else if (q.question_type==='matching') {
    // ใช้ dropdown (left -> right)
    const pairs = data.pairs || [{left:'A', right:'1'},{left:'B', right:'2'}];
    const rights = [...new Set(pairs.map(p=>p.right))];
    const box = document.createElement('div');
    box.className = 'grid md:grid-cols-2 gap-2';
    pairs.forEach((p,i)=>{
      const opts = rights.map(r=>`<option value="${r}">${r}</option>`).join('');
      box.insertAdjacentHTML('beforeend', `
        <div class="flex items-center gap-2">
          <span class="px-2 py-1 bg-gray-100 rounded">${p.left}</span>
          <select class="input" name="${name}_${i}">
            <option value="">เลือก</option>${opts}
          </select>
        </div>
      `);
    });
    wrap.appendChild(box);
  }

  return wrap;
}

export function StudentView() {
  const el = document.createElement('div');
  el.className = 'space-y-6';

  const listWrap = document.createElement('div');
  listWrap.className = 'space-y-3';
  const attemptsWrap = document.createElement('div');
  attemptsWrap.className = 'space-y-3';

  async function reload() {
    const exams = await listExams({ is_published: true });
    listWrap.innerHTML = '<h2 class="text-xl font-bold">ข้อสอบที่เปิดให้ทำ</h2>';
    if (exams.length===0) listWrap.insertAdjacentHTML('beforeend', '<div class="text-sm text-gray-500">ยังไม่มีข้อสอบ</div>');
    exams.forEach(ex => listWrap.insertAdjacentHTML('beforeend', ExamCard(ex)));

    // ประวัติของฉัน
    const user = await getCurrentUser();
    attemptsWrap.innerHTML = '<h3 class="text-lg font-semibold">ประวัติการทำข้อสอบของฉัน</h3>';
    if (user) {
      const items = await listMyAttempts(user.id);
      if (!items.length) attemptsWrap.insertAdjacentHTML('beforeend','<div class="text-sm text-gray-500">ยังไม่มีประวัติ</div>');
      items.forEach(a=> attemptsWrap.insertAdjacentHTML('beforeend', `
        <div class="p-3 rounded-lg border flex items-center justify-between">
          <div>ข้อสอบ #${a.exam_id} • คะแนน ${a.score}</div>
          <div class="text-sm text-gray-500">${a.submitted_at || ''}</div>
        </div>
      `));
    }

    // start exam events
    $$('.btnStart', listWrap).forEach(b => b.onclick = ()=> startExam(Number(b.dataset.id)));
  }

  async function startExam(exam_id) {
    const ex = await getExam(exam_id);
    const qs = await listQuestions(exam_id);
    if (!qs.length) return toast('ข้อสอบนี้ยังไม่มีคำถาม','error');

    // UI ทำข้อสอบ
    el.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'card p-4 flex items-center justify-between';
    header.innerHTML = `
      <div>
        <div class="font-semibold">${ex.title}</div>
        <div class="text-sm text-gray-500">เวลา ${ex.time_limit} นาที • คะแนนเต็ม ${ex.total_score}</div>
      </div>
      <div class="flex items-center gap-3 no-print">
        <span>เหลือเวลา: <b id="timer">--:--</b></span>
        <button id="btnSubmit" class="btn btn-primary">ส่งคำตอบ</button>
      </div>
    `;
    const host = document.createElement('div');
    host.className = 'space-y-3';
    qs.forEach((q,i)=> host.appendChild( renderQuestion(q, i+1, {}) ));
    el.appendChild(header);
    el.appendChild(host);

    // timer
    let remaining = (ex.time_limit||10) * 60; // seconds
    const timerEl = header.querySelector('#timer');
    timerEl.textContent = fmtTime(remaining);
    const iv = setInterval(()=>{
      remaining--; timerEl.textContent = fmtTime(Math.max(0, remaining));
      if (remaining<=0) {
        clearInterval(iv);
        doSubmit();
      }
    }, 1000);

    async function doSubmit() {
      clearInterval(iv);
      header.querySelector('#btnSubmit').disabled = true;
      try {
        const user = await getCurrentUser();
        const attempt = await createAttempt({ exam_id: ex.id, student_id: user.id, time_spent: (ex.time_limit*60 - remaining) });
        // ตรวจคะแนน
        let total = 0;
        const rows = [];
        for (const q of qs) {
          let ans = null; let correct=false; let points=0;
          if (q.question_type==='multiple_choice') {
            const sel = el.querySelector(`input[name="q_${q.id}"]:checked`);
            ans = sel ? sel.value : null;
            correct = String(ans)===String(q.correct_answer);
            points = correct? (q.points||1) : 0;
          } else if (q.question_type==='true_false') {
            const sel = el.querySelector(`input[name="q_${q.id}"]:checked`);
            ans = sel ? sel.value : null;
            correct = String(ans)===String(q.correct_answer);
            points = correct? (q.points||1) : 0;
          } else if (q.question_type==='fill_blank') {
            const inp = el.querySelector(`input[name="q_${q.id}"]`);
            ans = (inp?.value||'').trim();
            correct = ans.toLowerCase() === String(q.correct_answer||'').toLowerCase();
            points = correct? (q.points||1) : 0;
          } else if (q.question_type==='matching') {
            // correct_answer ควรเป็น JSON string เช่น {"map":{"A":"1","B":"3"}}
            let mapCor = {};
            try { mapCor = JSON.parse(q.correct_answer||'{}').map || {}; } catch {}
            let ok = true;
            let answerMap = {};
            Object.keys(mapCor).forEach((left,idx)=>{
              const sel = el.querySelector(`select[name="q_${q.id}_${idx}"]`);
              const val = sel?.value||'';
              answerMap[left] = val;
              if (mapCor[left] !== val) ok = false;
            });
            ans = JSON.stringify({ map: answerMap });
            correct = ok;
            points = correct? (q.points||1) : 0;
          }
          total += points;
          rows.push({
            attempt_id: attempt.id,
            question_id: q.id,
            answer_data: ans,
            is_correct: correct,
            points_earned: points
          });
        }
        await insertAnswers(rows);
        await updateAttempt(attempt.id, { score: total, submitted_at: new Date().toISOString() });
        toast(`ได้คะแนน ${total} / ${ex.total_score}`,'success');

        // แสดงผล + เฉลยอย่างง่าย
        const result = document.createElement('div');
        result.className = 'card p-5 mt-4';
        result.innerHTML = `
          <div class="text-lg font-bold">ผลคะแนน: ${total} / ${ex.total_score}</div>
          <p class="text-sm text-gray-600 mt-1">เกณฑ์ผ่าน: ${ex.passing_score} — ${total>=ex.passing_score?'<span class="text-green-600">ผ่าน</span>':'<span class="text-red-600">ไม่ผ่าน</span>'}</p>
          <div class="mt-3">
            <button class="btn btn-gray" id="btnBack">กลับหน้ารายการข้อสอบ</button>
          </div>
          <hr class="my-4">
          <h4 class="font-semibold">เฉลย</h4>
          <div class="text-sm text-gray-700">* เฉลยแต่ละข้อถูกกำหนดในฐานข้อมูล (correct_answer)</div>
        `;
        el.appendChild(result);
        result.querySelector('#btnBack').onclick = ()=> location.reload();
      } catch(e) {
        toast(e.message,'error');
      }
    }

    header.querySelector('#btnSubmit').onclick = doSubmit;
  }

  el.appendChild(listWrap);
  el.appendChild(attemptsWrap);
  reload();
  return el;
}
