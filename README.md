# IEM + LINE LIFF Login via Supabase Edge Function (No native LINE provider)

## สรุปแนวทาง
- หน้าเว็บใช้ **LIFF** ดึง `id_token` จาก LINE
- ส่ง `id_token` ไปยัง **Edge Function** (`functions/line-login`)
- Function ตรวจสอบกับ LINE → สร้าง/อัปเดตผู้ใช้ใน Supabase Auth (อีเมล alias: `{lineUserId}@line.local` + รหัสผ่านแบบ HMAC)
- Function ทำ **Password Sign-in** กับ Supabase แล้วคืน `access_token`/`refresh_token`
- ฝั่งเว็บเรียก `supabase.auth.setSession(tokens)` → ได้ session ใช้งาน RLS ได้ทันที

## ตั้งค่า Supabase Functions
1) ติดตั้ง CLI และ login
2) ตั้งค่าตัวแปรแวดล้อมของ Function:
```
supabase functions secrets set   SUPABASE_URL="https://YOUR_PROJECT.supabase.co"   SUPABASE_ANON_KEY="YOUR_PUBLIC_ANON_KEY"   SUPABASE_SERVICE_ROLE="YOUR_SERVICE_ROLE_KEY"   LINE_CHANNEL_ID="YOUR_LINE_CHANNEL_ID"   EDGE_HMAC_SECRET="random-long-secret"   DEFAULT_ROLE="student"
```
3) Deploy:
```
supabase functions deploy line-login
```
4) Production URL จะเป็น: `https://<project-ref>.functions.supabase.co/line-login`
   - ตั้งค่าใน `js/config.js` ให้ `EDGE_LOGIN_ENDPOINT` ชี้ URL นี้ (หรือใช้ path `/functions/v1/line-login` หากโฮสต์ผ่าน Supabase Hosting เดียวกัน)

## ตั้งค่า LINE Developers (LIFF)
- ใช้ LIFF ID: `2006490627-xn8XaYD1`
- ตั้ง endpoint URL ไปยังหน้าเว็บโปรเจกต์ของพี่ที่รัก (GitHub Pages/Custom Domain)
- Domain ที่เรียก Functions ต้องอยู่ใน allowlist

## แก้ไขไฟล์ config ฝั่งเว็บ
แก้ `js/config.js`:
```js
export const SUPABASE_URL = "https://YOUR_PROJECT.supabase.co";
export const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";
export const LIFF_ID = "2006490627-xn8XaYD1";
export const EDGE_LOGIN_ENDPOINT = "https://<project-ref>.functions.supabase.co/line-login";
```

## โครงไฟล์สำคัญ
- `index.html` — เพิ่ม LIFF SDK และโหลดสคริปต์ SPA
- `js/liff-login.js` — เรียก Edge Function → setSession
- `functions/line-login/index.ts` — ตรวจ LINE token, upsert user, password sign-in

> หมายเหตุด้านความปลอดภัย: ห้ามเปิดเผย `SERVICE_ROLE` หรือ `EDGE_HMAC_SECRET` ฝั่งไคลเอนต์เด็ดขาด (อยู่เฉพาะใน Functions secrets เท่านั้น)
