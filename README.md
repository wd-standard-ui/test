# Interactive Exam Management System (SPA)
เทมเพลตระบบจัดการข้อสอบแบบหน้าเดียว (Single Page Application) ด้วย **HTML5 + CSS3 + Vanilla JS + Tailwind (CDN) + Supabase (CDN)**

## โครงสร้างไฟล์
```
/css/styles.css
/index.html
/js/app.js
/js/api.js
/js/auth.js
/js/config.js      ← ใส่ค่า SUPABASE_URL / SUPABASE_ANON_KEY ที่นี่
/js/router.js
/js/student.js
/js/teacher.js
/js/stats.js
```

## คุณสมบัติ
- Auth: Login/Register ด้วย Supabase Auth (บทบาท teacher/student เก็บใน user_metadata)
- ครู: สร้าง/แก้ไข/ลบข้อสอบ, เพิ่มคำถาม (MCQ/Matching/Fill Blank/True‑False), พิมพ์ใบงาน
- นักเรียน: ทำข้อสอบแบบ Interactive พร้อมตัวจับเวลา, ส่งคำตอบ, แสดงผลทันที, ประวัติการทำ
- Analytics: สถิติรายข้อ (Difficulty Index, Discrimination Index) + กราฟแท่งแบบง่าย
- Print CSS: ปุ่มพิมพ์ใบงาน พิมพ์เฉลยได้ (ปรับ correct_answer ในฐานข้อมูล)

## การตั้งค่า Supabase
1. สร้าง Project → ตั้งค่า Tables ตาม schema ที่ผู้ใช้กำหนด (ดูด้านล่าง)
2. ไปที่ Project Settings → API → คัดลอก **Project URL** และ **anon public key**
3. เปิดไฟล์ `js/config.js` แล้วแทนที่ค่า:
```js
export const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
```
4. เปิดโฮสท์ด้วย GitHub Pages ได้ทันที (Static)

## ตาราง (ตามที่กำหนด)
- **users** (ใช้ Supabase Auth: user_metadata: { full_name, role, grade_level })
- **subjects**: (id, name, name_en, icon)
- **exams**: (id, title, subject_id, total_score, passing_score, time_limit, is_published)
- **questions**: (id, exam_id, question_type, question_text, question_data TEXT, correct_answer TEXT, points INT)
- **student_attempts**: (id, exam_id, student_id UUID, score, submitted_at TIMESTAMPTZ, time_spent INT)
- **student_answers**: (id, attempt_id, question_id, answer_data TEXT, is_correct BOOL, points_earned INT)
- **question_analytics**: (id, question_id UNIQUE, total_attempts, correct_attempts, difficulty_index NUMERIC, discrimination_index NUMERIC)

> หมายเหตุ: ควรกำหนด Foreign Keys + Indexes ตามฟิลด์ id ที่อ้างอิงกัน และตั้ง RLS ให้เหมาะสม:
- นักเรียน: อ่านเฉพาะข้อสอบที่ `is_published = true`, เขียนเฉพาะ attempt/answers ของตนเอง
- ครู: จัดการ exams/questions/analytics ได้ (ใช้ policy ตาม role ใน user_metadata)

## คำอธิบายการใช้งานโดยย่อ
- เปิดหน้าเว็บ → ปุ่ม "เข้าสู่ระบบ" → login หรือ register
- หากเป็น **ครู** → เมนู Teacher: สร้างข้อสอบ → เพิ่มคำถาม → พิมพ์ใบงานได้
- หากเป็น **นักเรียน** → เมนู Student: เลือกข้อสอบ → ทำข้อสอบ → ส่งคำตอบ → แสดงคะแนน
- เมนู Analytics (เฉพาะครู): เลือกข้อสอบ → ดูตาราง Difficulty/Discrimination + บันทึกลง `question_analytics`

## หมายเหตุด้านเทคนิค
- ไม่ใช้ localStorage/sessionStorage ตามข้อกำหนด (ทุกอย่างอาศัย Supabase)
- ใช้ ES6 Modules + async/await + error handling ใน api.js
- UI เป็น mobile-first และรองรับการพิมพ์ด้วย `@media print`
- สามารถต่อยอดเพิ่ม Drag‑Drop สำหรับ Matching ได้ภายหลัง (ตอนนี้ใช้ dropdown)

---
สร้างโดยที่รัก 🤍
