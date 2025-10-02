// teacher.js
// หน้าจอสำหรับครู: จัดการข้อสอบ วิเคราะห์ผล และพิมพ์ใบงาน
import { sb, dbInsert, dbUpdate, dbDelete, dbSelect } from './db.js';
import { toast, confirmDialog, skel } from './ui.js';
import { subjectClass } from './config.js';

export const Teacher = {
  route: '#/teacher',
  canActivate(profile){ return profile?.role === 'teacher'; },

  async render(root, profile) {
    root.innerHTML = `
      <div class="no-print flex items-center justify-between mb-4">
        <h1 class="text-xl font-semibold">แดชบอร์ดครู</h1>
        <button id="btnNewExam" class="px-3 py-2 rounded bg-slate-900 text-white text-sm">+ สร้างข้อสอบ</button>
      </div>

      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2">รายการข้อสอบของฉัน</h2>
        <div id="examList" class="grid md:grid-cols-2 gap-3">${skel(6)}</div>
      </section>

      <section class="mb-6">
        <h2 class="text-lg font-semibold mb-2">สถิติและการวิเคราะห์ (เลือกข้อสอบ)</h2>
        <div id="analyticsArea" class="bg-white rounded-xl p-4 shadow-card">
          <div class="text-sm text-slate-500">ยังไม่ได้เลือกข้อสอบ</div>
        </div>
      </section>

      <section class="no-print">
        <h2 class="text-lg font-semibold mb-2">ปุ่มพิมพ์ใบงาน</h2>
        <div class="flex gap-2">
          <button id="btnPrintExam" class="px-3 py-1.5 rounded bg-slate-100">พิมพ์ข้อสอบ</button>
          <button id="btnPrintAnswer" class="px-3 py-1.5 rounded bg-slate-100">พิมพ์เฉลย</button>
        </div>
      </section>

      <!-- พื้นที่แสดงข้อสอบแบบพิมพ์ -->
      <div id="printArea" class="print-only hidden"></div>
    `;

    // load exams
    await this.loadExams();

    // bind
    root.querySelector('#btnNewExam').onclick = ()=> this.openEditor();
    root.querySelector('#btnPrintExam').onclick = ()=> this.printExam(false);
    root.querySelector('#btnPrintAnswer').onclick = ()=> this.printExam(true);
  },

  async loadExams() {
    const listEl = document.getElementById('examList');
    try {
      const exams = await dbSelect('exams', '*, subjects(name, name_en)', q => q.order('id', { ascending:false }));
      listEl.innerHTML = exams.map(ex => `
        <div class="bg-white rounded-xl p-4 shadow-card">
          <div class="flex items-center justify-between">
            <div>
              <div class="font-semibold">${ex.title}</div>
              <div class="text-xs text-slate-500">วิชา: <span class="px-2 py-0.5 rounded ${subjectClass(ex.subjects?.name_en)}">${ex.subjects?.name || '-'}</span></div>
              <div class="text-xs text-slate-500 mt-1">คะแนน: ${ex.total_score} • ผ่าน: ${ex.passing_score} • เวลา: ${ex.time_limit} นาที</div>
            </div>
            <div class="no-print flex gap-2">
              <button data-id="${ex.id}" class="btn-edit px-2 py-1 rounded bg-slate-100 text-xs">แก้ไข</button>
              <button data-id="${ex.id}" class="btn-anal px-2 py-1 rounded bg-slate-100 text-xs">วิเคราะห์</button>
              <button data-id="${ex.id}" class="btn-del px-2 py-1 rounded bg-rose-600 text-white text-xs">ลบ</button>
            </div>
          </div>
        </div>
      `).join('');
      listEl.querySelectorAll('.btn-edit').forEach(b=> b.onclick = ()=> this.openEditor(parseInt(b.dataset.id)));
      listEl.querySelectorAll('.btn-anal').forEach(b=> b.onclick = ()=> this.renderAnalytics(parseInt(b.dataset.id)));
      listEl.querySelectorAll('.btn-del').forEach(b=> b.onclick = ()=> this.deleteExam(parseInt(b.dataset.id)));
    } catch(e) {
      console.error(e); toast('โหลดข้อสอบล้มเหลว','error');
      listEl.innerHTML = '<div class="text-sm text-rose-600">โหลดข้อสอบล้มเหลว</div>';
    }
  },

  async openEditor(examId=null) {
    const title = prompt('ชื่อข้อสอบ', examId? undefined : 'แบบทดสอบใหม่');
    if (!title && !examId) return;
    let ex = null;
    if (!examId) {
      const subject_id = parseInt(prompt('รหัสวิชา: 1=คณิต,2=อังกฤษ,3=ไทย','1')||'1');
      const passing_score = parseInt(prompt('เกณฑ์ผ่าน (คะแนน)','50')||'50');
      const time_limit = parseInt(prompt('เวลาทำ (นาที)','30')||'30');
      const total_score = 0;
      const is_published = false;
      const rows = await dbInsert('exams', { title, subject_id, total_score, passing_score, time_limit, is_published });
      ex = rows[0];
      toast('สร้างข้อสอบแล้ว','success');
    } else {
      ex = (await dbSelect('exams','*',q=>q.eq('id',examId).limit(1)))[0];
      if (title) {
        const upd = await dbUpdate('exams',{id: examId},{ title });
        ex = upd[0];
        toast('อัปเดตชื่อข้อสอบแล้ว','success');
      }
    }
    window.location.hash = `#/teacher/exam/${ex.id}`;
  },

  async deleteExam(examId) {
    if (!await confirmDialog({detail:'ต้องการลบข้อสอบนี้ใช่หรือไม่?'})) return;
    await dbDelete('exams', { id: examId });
    toast('ลบแล้ว','success');
    this.loadExams();
  },

  async renderAnalytics(examId) {
    const area = document.getElementById('analyticsArea');
    area.innerHTML = `<div class="flex items-center gap-2 text-sm">${skel(2)}</div>`;
    try {
      // โหลดข้อมูลความพยายามและคำตอบ
      const attempts = await dbSelect('student_attempts','*', q=> q.eq('exam_id', examId));
      const answers = await dbSelect('student_answers','*', q=> q.in('attempt_id', attempts.map(a=>a.id)));

      // Difficulty: per-question correct rate
      const byQ = {};
      for (const a of answers) {
        byQ[a.question_id] = byQ[a.question_id] || { total:0, correct:0 };
        byQ[a.question_id].total++;
        if (a.is_correct) byQ[a.question_id].correct++;
      }
      const labels = Object.keys(byQ);
      const pvals = labels.map(qid => byQ[qid].total ? (byQ[qid].correct/byQ[qid].total) : 0);

      area.innerHTML = `
        <div class="grid md:grid-cols-2 gap-4">
          <div class="bg-white rounded-xl p-4 border">
            <div class="font-semibold mb-2">การกระจายคะแนน (Attempts)</div>
            <canvas id="scoreChart"></canvas>
          </div>
          <div class="bg-white rounded-xl p-4 border">
            <div class="font-semibold mb-2">Difficulty Index (P-value)</div>
            <canvas id="diffChart"></canvas>
          </div>
        </div>
        <div class="mt-4 overflow-auto">
          <table class="min-w-full text-sm">
            <thead><tr class="text-left text-slate-600">
              <th class="py-2 pr-4">ข้อ</th>
              <th class="py-2 pr-4">Attempts</th>
              <th class="py-2 pr-4">Correct</th>
              <th class="py-2 pr-4">P-value</th>
              <th class="py-2 pr-4">Discrimination</th>
            </tr></thead>
            <tbody id="qaRows"></tbody>
          </table>
        </div>
      `;

      // Chart: score distribution
      const ctx1 = document.getElementById('scoreChart').getContext('2d');
      const scores = attempts.map(a=>a.score||0);
      new Chart(ctx1, {
        type: 'bar',
        data: { labels: scores.map((_,i)=>`#${i+1}`), datasets: [{ label: 'Score', data: scores }]},
        options: { responsive:true, plugins:{ legend:{display:false} } }
      });

      // Chart: difficulty
      const ctx2 = document.getElementById('diffChart').getContext('2d');
      new Chart(ctx2, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'P-value', data: pvals }]},
        options: { responsive:true, plugins:{ legend:{display:false} }, scales:{ y:{ min:0, max:1 } } }
      });

      // Discrimination (ง่าย ๆ: top-bottom 27%)
      const sorted = [...attempts].sort((a,b)=> (b.score||0)-(a.score||0));
      const k = Math.max(1, Math.floor(sorted.length*0.27));
      const topIds = new Set(sorted.slice(0,k).map(a=>a.id));
      const botIds = new Set(sorted.slice(-k).map(a=>a.id));

      const discr = {};
      for (const a of answers) {
        discr[a.question_id] = discr[a.question_id] || { top:0, bot:0 };
        if (topIds.has(a.attempt_id) && a.is_correct) discr[a.question_id].top++;
        if (botIds.has(a.attempt_id) && a.is_correct) discr[a.question_id].bot++;
      }
      const rowsEl = document.getElementById('qaRows');
      rowsEl.innerHTML = labels.map(qid=>{
        const total = byQ[qid].total;
        const correct = byQ[qid].correct;
        const p = total? (correct/total):0;
        const d = k? ((discr[qid]?.top||0)-(discr[qid]?.bot||0))/k : 0;
        const color = p>=0.8 && d>=0.2 ? 'text-emerald-600' : p>=0.5 ? 'text-amber-600' : 'text-rose-600';
        return `<tr class="border-t">
          <td class="py-2 pr-4">${qid}</td>
          <td class="py-2 pr-4">${total}</td>
          <td class="py-2 pr-4">${correct}</td>
          <td class="py-2 pr-4">${p.toFixed(2)}</td>
          <td class="py-2 pr-4 ${color}">${d.toFixed(2)}</td>
        </tr>`;
      }).join('');

    } catch(e) {
      console.error(e);
      toast('วิเคราะห์ไม่สำเร็จ','error');
      document.getElementById('analyticsArea').innerHTML = '<div class="text-sm text-rose-600">วิเคราะห์ไม่สำเร็จ</div>';
    }
  },

  async printExam(withAnswer=false){
    const area = document.getElementById('printArea');
    const id = prompt('พิมพ์ข้อสอบ ID:');
    if (!id) return;
    try {
      const exam = (await dbSelect('exams','*', q=> q.eq('id', parseInt(id)).limit(1)))[0];
      const qs = await dbSelect('questions','*', q=> q.eq('exam_id', exam.id).order('id'));
      area.classList.remove('hidden');
      area.innerHTML = `
        <div class="a4 p-6">
          <div class="text-center">
            <div class="text-lg font-semibold">${exam.title}</div>
            <div class="text-sm">คะแนนเต็ม ${exam.total_score} เวลา ${exam.time_limit} นาที</div>
          </div>
          <div class="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>ชื่อ-นามสกุล: ................................</div>
            <div>เลขที่: ...........</div>
            <div>วันที่: ____/____/______</div>
          </div>
          <ol class="mt-6 space-y-4">
            ${qs.map((q,i)=>`
              <li>
                <div class="font-medium">ข้อ ${i+1}. ${q.question_text}</div>
                ${renderPrintChoices(q, withAnswer)}
              </li>
            `).join('')}
          </ol>
          <div class="page-break"></div>
          ${withAnswer ? `<div class="mt-4"><div class="font-semibold">เฉลย</div>
            <ol class="list-decimal ml-6">${qs.map(q=>`<li class="my-1">${printAnswer(q)}</li>`).join('')}</ol>
          </div>`:''}
        </div>
      `;
      window.print();
    } catch(e) {
      console.error(e); toast('ไม่พบข้อสอบหรือเกิดข้อผิดพลาด','error');
    }
  }
};

function renderPrintChoices(q, withAnswer){
  if (q.question_type==='multiple_choice') {
    const opts = (q.question_data?.options)||[];
    return `<ul class="mt-2 space-y-1">${opts.map((o,idx)=>`
      <li>(${String.fromCharCode(65+idx)}) ${o}</li>`).join('')}</ul>`;
  }
  if (q.question_type==='true_false') {
    return `<div class="mt-2">[ ] ถูก  [ ] ผิด</div>`;
  }
  if (q.question_type==='fill_blank') {
    return `<div class="mt-2">คำตอบ: __________________________</div>`;
  }
  if (q.question_type==='matching') {
    const left = q.question_data?.left||[], right = q.question_data?.right||[];
    return `<div class="mt-2 grid grid-cols-2 gap-4 text-sm">
      <div>${left.map((t,i)=>`<div>${i+1}) ${t}</div>`).join('')}</div>
      <div>${right.map((t,i)=>`<div>${String.fromCharCode(65+i)}) ${t}</div>`).join('')}</div>
    </div>`;
  }
  return '';
}

function printAnswer(q){
  const a = q.correct_answer;
  if (q.question_type==='matching' && typeof a==='object') {
    return Object.entries(a).map(([k,v])=>`${k}→${v}`).join(', ');
  }
  return Array.isArray(a)? a.join(', ') : (a??'-');
}
