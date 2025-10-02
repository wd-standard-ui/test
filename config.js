// config.js
// ค่าคงที่ของระบบ (แก้ไขได้ตามโปรเจกต์จริง)
export const LIFF_ID = "2006490627-xn8XaYD1";
export const SUPABASE_URL = "https://pdxpnneyhpxodtxexxry.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBkeHBubmV5aHB4b2R0eGV4eHJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzOTQ2ODksImV4cCI6MjA3NDk3MDY4OX0.Z25HJZD--Xr-OR4HEbj6UFcQ1_2FOWWTdK8q1Snu1gM";

// แผนที่สีของวิชา
export const SubjectColors = {
  math: '#3B82F6',
  english: '#EF4444',
  thai: '#10B981'
};

// Util: แปลง subject_id -> class bg
export function subjectClass(nameEn) {
  switch ((nameEn||'').toLowerCase()) {
    case 'math': return 'bg-math text-white';
    case 'english': return 'bg-eng text-white';
    case 'thai': return 'bg-thai text-white';
    default: return 'bg-slate-700 text-white';
  }
}
