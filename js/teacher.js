// teacher.js
// ===== หน้าครู: จัดการข้อสอบ + คำถาม + พิมพ์ใบงาน =====
import { $, $$, toast } from './ui.js';
import { listSubjects, createExam, listExams, updateExam, deleteExam, listQuestions, upsertQuestion, deleteQuestion, getCurrentUser } from './api.js';

function SubjectBadge(subject) {
  const colorClass = subject?.name_en==='Math' ? 'badge-math' : subject?.name_en==='English' ? 'badge-eng' : 'badge-thai';
  return `<span class="badge ${colorClass}">${subject?.name||'-'}</span>`;
}

function QuestionEditor({ exam }) {
  const wrap = document.createElement('div');
  wrap.className = 'card p-5 space-y-4';
  wrap.innerHTML = `
    <div class="flex items-center justify-between">
      <h3 class="font-semibold">คำถามในข้อสอบนี้</h3>
      <div class="no-print">
        <button id="btnAddQ" class="btn btn-primary">+ เพิ่มคำถาม</button>
        <button id="btnPrint" class="btn btn-gray ml-2">พิมพ์ใบงาน</button>
      </div>
    </div>
    <div id="qList" class="space-y-3"></div>
  `;

  async function reload() {
    const items = await listQuestions(exam.id);
    const host = wrap.querySelector('#qList');
    host.innerHTML = '';
    if (items.length===0) {
      host.innerHTML = '<div class="text-sm text-gray-500">ยังไม่มีคำถาม</div>';
      return;
    }
    items.forEach(q => {
      const row = document.createElement('div');
      row.className = 'p-4 rounded-xl border border-gray-200';
      row.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm text-gray-500">${q.question_type}</div>
            <div class="font-medium">${q.question_text||'(ไม่มีคำถาม)'}</div>
            <pre class="mt-2 bg-gray-50 p-2 rounded text-xs overflow-x-auto">${q.question_data||''}</pre>
            <div class="text-xs text-gray-500 mt-1">เฉลย: <code>${q.correct_answer||'-'}</code> • คะแนน: ${q.points||1}</div>
          </div>
          <div class="no-print flex items-center gap-2">
            <button data-id="${q.id}" class="btn btn-gray btnEdit">แก้ไข</button>
            <button data-id="${q.id}" class="btn btn-danger btnDel">ลบ</button>
          </div>
        </div>
      `;
      host.appendChild(row);
    });

    // events
    $$('.btnEdit', host).forEach(b => b.onclick = () => openEditor(b.dataset.id));
    $$('.btnDel', host).forEach(b => b.onclick = async () => {
      if (!confirm('ลบคำถามนี้?')) return;
      await deleteQuestion(Number(b.dataset.id));
      toast('ลบแล้ว','success'); reload();
    });
  }

  function openEditor(qid=null) {
    // modal แบบง่าย ๆ
    const dlg = document.createElement('div');
    dlg.className = 'fixed inset-0 bg-black/30 grid place-items-center no-print';
    dlg.innerHTML = `
      <div class="bg-white w-[min(680px,96vw)] rounded-2xl p-5 space-y-4">
        <h3 class="text-lg font-bold">${qid?'แก้ไขคำถาม':'เพิ่มคำถาม'}</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="label">ประเภทคำถาม</label>
            <select id="qtype" class="input">
              <option value="multiple_choice">Multiple Choice</option>
              <option value="matching">Matching</option>
              <option value="fill_blank">Fill in the Blank</option>
              <option value="true_false">True/False</option>
            </select>
          </div>
          <div>
            <label class="label">คะแนน</label>
            <input id="points" class="input" type="number" min="1" value="1">
          </div>
        </div>
        <div>
          <label class="label">ข้อความคำถาม</label>
          <textarea id="qtext" class="input" rows="3" placeholder="พิมพ์คำถาม..."></textarea>
        </div>
        <div>
          <label class="label">ข้อมูลคำถาม (JSON)</label>
          <textarea id="qdata" class="input font-mono text-xs" rows="6" placeholder='ตัวอย่าง Multiple Choice: {"choices":["ก","ข","ค","ง"]}'></textarea>
          <p class="text-xs text-gray-500 mt-1">* ใส่โครงสร้างตามประเภท เช่น matching ใช้ {"pairs":[{"left":"...","right":"..."},...]}</p>
        </div>
        <div>
          <label class="label">คำตอบที่ถูกต้อง</label>
          <input id="ans" class="input" placeholder='รูปแบบขึ้นกับประเภท เช่น "2" หรือ "ก", หรือ {"map":{"A":"1",...}}'>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button id="btnCancel" class="btn btn-gray">ยกเลิก</button>
          <button id="btnSave" class="btn btn-primary">บันทึก</button>
        </div>
      </div>
    `;
    document.body.appendChild(dlg);

    // ถ้ามี qid -> preload
    if (qid) {
      listQuestions(exam.id).then(items=>{
        const q = items.find(x=>x.id==qid);
        if (!q) return;
        dlg.querySelector('#qtype').value = q.question_type;
        dlg.querySelector('#points').value = q.points||1;
        dlg.querySelector('#qtext').value = q.question_text||'';
        dlg.querySelector('#qdata').value = q.question_data||'';
        dlg.querySelector('#ans').value = q.correct_answer||'';
      });
    }

    dlg.querySelector('#btnCancel').onclick = ()=> dlg.remove();
    dlg.querySelector('#btnSave').onclick = async ()=>{
      try {
        const payload = {
          id: qid? Number(qid): undefined,
          exam_id: exam.id,
          question_type: dlg.querySelector('#qtype').value,
          question_text: dlg.querySelector('#qtext').value.trim(),
          question_data: dlg.querySelector('#qdata').value.trim(),
          correct_answer: dlg.querySelector('#ans').value.trim(),
          points: Number(dlg.querySelector('#points').value || 1)
        };
        // ตรวจ JSON question_data เบื้องต้น
        if (payload.question_data) JSON.parse(payload.question_data);
        await upsertQuestion(payload);
        toast('บันทึกคำถามแล้ว','success');
        dlg.remove(); reload();
      } catch(e) {
        toast(e.message,'error');
      }
    };
  }

  wrap.querySelector('#btnAddQ').onclick = ()=> openEditor();
  wrap.querySelector('#btnPrint').onclick = ()=> window.print();
  reload();
  return wrap;
}

export function TeacherView() {
  const el = document.createElement('div');
  el.className = 'space-y-6';

  const header = document.createElement('div');
  header.className = 'card p-5 space-y-4';
  header.innerHTML = `
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">แดชบอร์ดครู</h2>
      <button id="btnNew" class="btn btn-primary no-print">+ สร้างข้อสอบใหม่</button>
    </div>
    <div class="grid md:grid-cols-4 gap-3">
      <div class="p-4 rounded-xl bg-blue-50">
        <div class="text-sm text-gray-500">คณิตศาสตร์</div>
        <div class="text-2xl font-bold text-blue-700" id="statMath">-</div>
      </div>
      <div class="p-4 rounded-xl bg-red-50">
        <div class="text-sm text-gray-500">ภาษาอังกฤษ</div>
        <div class="text-2xl font-bold text-red-700" id="statEng">-</div>
      </div>
      <div class="p-4 rounded-xl bg-emerald-50">
        <div class="text-sm text-gray-500">ภาษาไทย</div>
        <div class="text-2xl font-bold text-emerald-700" id="statThai">-</div>
      </div>
      <div class="p-4 rounded-xl bg-gray-50">
        <div class="text-sm text-gray-500">รวมข้อสอบ</div>
        <div class="text-2xl font-bold" id="statAll">-</div>
      </div>
    </div>
  `;

  const list = document.createElement('div');
  list.className = 'space-y-4';

  async function reload() {
    const exams = await listExams({ is_published: null }); // ทั้งหมด
    list.innerHTML = '';
    if (exams.length===0) {
      list.innerHTML = '<div class="text-sm text-gray-500">ยังไม่มีข้อสอบ</div>';
    }
    let m=0,e=0,t=0;
    exams.forEach(ex => {
      const card = document.createElement('div');
      card.className = 'card p-5';
      card.innerHTML = `
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div class="font-semibold text-lg">${ex.title}</div>
            <div class="text-sm text-gray-500 flex items-center gap-2">
              ${SubjectBadge(ex.subjects)}
              <span>คะแนนเต็ม ${ex.total_score}</span>
              <span>ผ่านที่ ${ex.passing_score}</span>
              <span>เวลา ${ex.time_limit} นาที</span>
              <span class="${ex.is_published?'text-green-600':'text-gray-500'}">${ex.is_published?'เผยแพร่แล้ว':'ยังไม่เผยแพร่'}</span>
            </div>
          </div>
          <div class="no-print flex items-center gap-2">
            <button class="btn btn-gray btnEdit" data-id="${ex.id}">แก้ไข</button>
            <button class="btn btn-danger btnDel" data-id="${ex.id}">ลบ</button>
          </div>
        </div>
        <div class="mt-4" data-editor="${ex.id}"></div>
      `;
      list.appendChild(card);
      if (ex.subjects?.name_en==='Math') m++; else if (ex.subjects?.name_en==='English') e++; else t++;

      // attach editor
      const editorHost = card.querySelector(`[data-editor="${ex.id}"]`);
      editorHost.appendChild(QuestionEditor({ exam: ex }));
    });

    header.querySelector('#statMath').textContent = m;
    header.querySelector('#statEng').textContent = e;
    header.querySelector('#statThai').textContent = t;
    header.querySelector('#statAll').textContent = exams.length;

    // events
    $$('.btnDel', list).forEach(b => b.onclick = async ()=>{
      if (!confirm('ลบข้อสอบนี้ทั้งหมด?')) return;
      await deleteExam(Number(b.dataset.id));
      toast('ลบข้อสอบแล้ว','success'); reload();
    });
    $$('.btnEdit', list).forEach(b => b.onclick = ()=>{
      // toggle editor
      const host = b.closest('.card').querySelector('[data-editor]');
      host.classList.toggle('hidden');
    });
  }

  async function openNewExam() {
    const subjects = await listSubjects();
    const dlg = document.createElement('div');
    dlg.className = 'fixed inset-0 bg-black/30 grid place-items-center no-print';
    dlg.innerHTML = `
      <div class="bg-white w-[min(720px,96vw)] rounded-2xl p-6 space-y-4">
        <h3 class="text-lg font-bold">สร้างข้อสอบใหม่</h3>
        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <label class="label">ชื่อข้อสอบ</label>
            <input id="title" class="input" placeholder="เช่น แบบทดสอบคณิต เรื่อง เศษส่วน">
          </div>
          <div>
            <label class="label">วิชา</label>
            <select id="subject" class="input">
              ${subjects.map(s=>`<option value="${s.id}">${s.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="label">คะแนนเต็ม</label>
            <input id="total" type="number" class="input" value="10">
          </div>
          <div>
            <label class="label">เกณฑ์ผ่าน</label>
            <input id="pass" type="number" class="input" value="5">
          </div>
          <div>
            <label class="label">เวลาทำ (นาที)</label>
            <input id="time" type="number" class="input" value="15">
          </div>
          <div class="flex items-center gap-2">
            <input id="pub" type="checkbox" class="w-4 h-4">
            <label for="pub" class="text-sm">เผยแพร่ทันที</label>
          </div>
        </div>
        <div class="flex items-center justify-end gap-2">
          <button id="btnCancel" class="btn btn-gray">ยกเลิก</button>
          <button id="btnCreate" class="btn btn-primary">สร้าง</button>
        </div>
      </div>
    `;
    document.body.appendChild(dlg);

    dlg.querySelector('#btnCancel').onclick = ()=> dlg.remove();
    dlg.querySelector('#btnCreate').onclick = async ()=>{
      try {
        const payload = {
          title: dlg.querySelector('#title').value.trim(),
          subject_id: Number(dlg.querySelector('#subject').value),
          total_score: Number(dlg.querySelector('#total').value||0),
          passing_score: Number(dlg.querySelector('#pass').value||0),
          time_limit: Number(dlg.querySelector('#time').value||0),
          is_published: dlg.querySelector('#pub').checked
        };
        if (!payload.title) throw new Error('กรอกชื่อข้อสอบ');
        await createExam(payload);
        toast('สร้างข้อสอบสำเร็จ','success');
        dlg.remove(); reload();
      } catch(e) {
        toast(e.message,'error');
      }
    };
  }

  el.appendChild(header);
  el.appendChild(list);
  el.querySelector('#btnNew')?.addEventListener('click', openNewExam);

  reload();
  return el;
}
