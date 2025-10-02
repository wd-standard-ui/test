# WD • Interactive Exam Management (SPA)

ระบบจัดการข้อสอบแบบ Single Page Application (HTML+Tailwind+Vanilla JS) เชื่อมต่อ Supabase และรองรับ LIFF สำหรับเข้าสู่ระบบด้วย LINE (แบบจำลอง)

## ฟีเจอร์หลัก
- ยืนยันตัวตน (Supabase Auth):
  - สมัคร/เข้าสู่ระบบ ด้วยอีเมล-รหัสผ่าน
  - เข้าสู่ระบบด้วย LINE (ผ่าน LIFF + mapping เป็นอีเมล `line_{userId}@line.local` สำหรับเดโม่)
- บทบาท: ครู / นักเรียน
- ครู
  - CRUD ข้อสอบ (ชื่อ, วิชา, คะแนนผ่าน, เวลาทำ)
  - พิมพ์ใบงาน และพิมพ์เฉลย (Print-friendly CSS)
  - วิเคราะห์ข้อสอบ: Difficulty (P-value), Discrimination (top-bottom 27%)
- นักเรียน
  - เลือกทำข้อสอบที่เปิดให้ทำ (is_published=true)
  - ทำข้อสอบแบบ Interactive (MCQ, Matching, Fill in Blank, True/False) + Timer
  - ส่งคำตอบและดูคะแนนทันที + ดูเฉลย

## โครงไฟล์
```
index.html
config.js
ui.js
db.js
auth.js
teacher.js
student.js
app.js
styles.css
schema.sql
assets/icon.svg
```

## การตั้งค่า
แก้ไขค่าใน `config.js`:
```js
export const LIFF_ID = "2006490627-xn8XaYD1";
export const SUPABASE_URL = "https://pdxpnneyhpxodtxexxry.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_ANON_KEY";
```

## การติดตั้งฐานข้อมูล
นำ `schema.sql` ไปรันใน Supabase SQL Editor เพื่อสร้างตารางทั้งหมด จากนั้นเพิ่มนโยบาย RLS ตามเหมาะสม (แนะนำให้เปิด RLS และผูกกับ `auth.uid()` สำหรับตารางที่เป็นข้อมูลผู้ใช้/คำตอบ)

## การรัน
เปิดด้วย GitHub Pages ได้ทันที (static) โดยวางทุกไฟล์ไว้ในโฟลเดอร์เดียวกัน เช่น `https://USERNAME.github.io/iem/`

## หมายเหตุด้านความปลอดภัย
- ตัวอย่าง LINE Login นี้เป็น **เดโม่** โดยใช้รหัสผ่านที่สร้างจาก userId (deterministic) เพื่อให้ง่ายต่อการทดสอบ ควรปรับไปใช้กลไกที่ปลอดภัยจริง (เช่น Custom OTP หรือ Backend function) ในการใช้งานจริง
- โค้ดนี้ไม่ใช้ localStorage/sessionStorage สำหรับเก็บ session ของ Supabase (`persistSession:false`)

## Print CSS
```css
@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  body { background: white; color: black; }
  .page-break { page-break-after: always; }
}
```
