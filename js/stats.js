// stats.js
// ===== Analytics สำหรับครู: คะแนนรวม + Difficulty/Discrimination Index =====
import { $, $$, toast } from './ui.js';
import { listExams, listQuestions, getAnswersForQuestion, upsertQuestionAnalytics } from './api.js';

function renderBar(values) {
  // วาดกราฟแท่งแบบง่ายด้วย div
  const max = Math.max(1, ...values);
  const bars = values.map(v=>{
    const h = Math.round((v/max)*100);
    return `<div class="flex-1 flex flex-col items-center gap-2">
      <div class="w-8 bg-blue-500 rounded-t h-[${h}%]"></div>
      <div class="text-xs text-gray-600">${v}</div>
    </div>`;
  }).join('');
  return `<div class="h-40 flex items-end gap-3">${bars}</div>`;
}

function levelColor(v) {
  // สี: เขียว(ดี) >=0.7, เหลือง(0.4-0.69), แดง(<0.4)
  if (v>=0.7) return 'text-green-700 bg-green-50';
  if (v>=0.4) return 'text-yellow-700 bg-yellow-50';
  return 'text-red-700 bg-red-50';
}

export function AnalyticsView() {
  const el = document.createElement('div');
  el.className = 'space-y-6';

  const header = document.createElement('div');
  header.className = 'card p-5 space-y-3';
  header.innerHTML = `
    <h2 class="text-xl font-bold">วิเคราะห์ข้อสอบ</h2>
    <div>
      <label class="label">เลือกข้อสอบ</label>
      <select id="examSel" class="input max-w-md"></select>
    </div>
  `;

  const chartWrap = document.createElement('div');
  chartWrap.className = 'card p-5';

  const tableWrap = document.createElement('div');
  tableWrap.className = 'card p-5 overflow-x-auto';

  async function load() {
    const exams = await listExams({ is_published: null });
    const sel = header.querySelector('#examSel');
    sel.innerHTML = exams.map(ex=>`<option value="${ex.id}">${ex.title}</option>`).join('');
    sel.onchange = ()=> render(Number(sel.value));
    if (exams.length) render(exams[0].id);
  }

  async function render(exam_id) {
    // กราฟการกระจายคะแนนแบบง่ายจากคะแนนรายข้อ (ถูก=1 ผิด=0)
    const qs = await listQuestions(exam_id);
    const perQuestionCorrect = [];
    const tbody = [];

    for (const q of qs) {
      const ans = await getAnswersForQuestion(q.id);
      const total = ans.length;
      const correctCount = ans.filter(a=>a.is_correct).length;
      const pValue = total? (correctCount/total) : 0; // Difficulty Index (ยิ่งสูงยิ่งง่าย)
      // Discrimination Index: เปรียบเทียบสัดส่วนตอบถูก ระหว่างกลุ่มบน(top 27%) และล่าง(bottom 27%)
      let dIndex = 0;
      if (total>=10) {
        const sorted = ans.sort((a,b)=> (b.student_attempts?.score||0) - (a.student_attempts?.score||0));
        const k = Math.max(1, Math.round(total*0.27));
        const top = sorted.slice(0,k);
        const bottom = sorted.slice(-k);
        const pt = top.filter(a=>a.is_correct).length / k;
        const pb = bottom.filter(a=>a.is_correct).length / k;
        dIndex = pt - pb; // ช่วง -1..+1 (ใกล้ 1 = แยกแยะได้ดี)
      }
      perQuestionCorrect.push(correctCount);

      // บันทึก analytics กลับฐาน (upsert)
      await upsertQuestionAnalytics(q.id, {
        total_attempts: total,
        correct_attempts: correctCount,
        difficulty_index: Number(pValue.toFixed(3)),
        discrimination_index: Number(dIndex.toFixed(3))
      });

      const levelCls = levelColor(pValue);
      const diCls = dIndex>=0.3 ? 'text-green-700 bg-green-50' : (dIndex>=0.1 ? 'text-yellow-700 bg-yellow-50' : 'text-red-700 bg-red-50');
      tbody.push(`
        <tr>
          <td class="px-3 py-2 border">${q.id}</td>
          <td class="px-3 py-2 border">${q.question_type}</td>
          <td class="px-3 py-2 border text-sm">${q.question_text||''}</td>
          <td class="px-3 py-2 border text-center">${total}</td>
          <td class="px-3 py-2 border text-center">${correctCount}</td>
          <td class="px-3 py-2 border text-center"><span class="px-2 py-1 rounded ${levelCls}">${pValue.toFixed(2)}</span></td>
          <td class="px-3 py-2 border text-center"><span class="px-2 py-1 rounded ${diCls}">${dIndex.toFixed(2)}</span></td>
        </tr>
      `);
    }

    chartWrap.innerHTML = `
      <h3 class="font-semibold mb-3">การกระจายการตอบถูกต่อข้อ (จำนวนคนตอบถูก)</h3>
      ${renderBar(perQuestionCorrect)}
    `;

    tableWrap.innerHTML = `
      <h3 class="font-semibold mb-3">วิเคราะห์รายข้อ</h3>
      <div class="overflow-auto">
        <table class="min-w-[720px] w-full border text-sm">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-3 py-2 border">QID</th>
              <th class="px-3 py-2 border">ประเภท</th>
              <th class="px-3 py-2 border">คำถาม</th>
              <th class="px-3 py-2 border">ทำทั้งหมด</th>
              <th class="px-3 py-2 border">ถูก</th>
              <th class="px-3 py-2 border">Difficulty (P)</th>
              <th class="px-3 py-2 border">Discrimination</th>
            </tr>
          </thead>
          <tbody>${tbody.join('')}</tbody>
        </table>
      </div>
    `;
  }

  el.appendChild(header);
  el.appendChild(chartWrap);
  el.appendChild(tableWrap);
  load();
  return el;
}
