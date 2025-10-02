// api.js
// ===== ชั้นเชื่อมต่อ Supabase พร้อมฟังก์ชัน helper มาตรฐาน =====
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Utilities: error handling มาตรฐาน
export function handle(error, context='') {
  if (!error) return;
  console.error('API ERROR:', context, error);
  throw new Error(error.message || context || 'Unexpected Error');
}

// ===== Auth =====
export async function signInWithEmail(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  handle(error, 'signInWithEmail');
  return data;
}

export async function signUpWithEmail({ email, password, full_name, role='student', grade_level=null }) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name, role, grade_level }
    }
  });
  handle(error, 'signUpWithEmail');
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  handle(error, 'signOut');
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  handle(error, 'getSession');
  return data.session;
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  handle(error, 'getUser');
  return data.user;
}

// ===== Database Helpers =====

// Subjects
export async function listSubjects() {
  const { data, error } = await supabase.from('subjects').select('*').order('id');
  handle(error, 'listSubjects');
  return data || [];
}

// Exams
export async function createExam(payload) {
  const { data, error } = await supabase.from('exams').insert(payload).select().single();
  handle(error, 'createExam');
  return data;
}
export async function updateExam(id, payload) {
  const { data, error } = await supabase.from('exams').update(payload).eq('id', id).select().single();
  handle(error, 'updateExam');
  return data;
}
export async function deleteExam(id) {
  const { error } = await supabase.from('exams').delete().eq('id', id);
  handle(error, 'deleteExam');
  return true;
}
export async function listExams({ subject_id=null, is_published=true } = {}) {
  let q = supabase.from('exams').select('*, subjects(*)').order('id', { ascending:false });
  if (subject_id) q = q.eq('subject_id', subject_id);
  if (typeof is_published === 'boolean') q = q.eq('is_published', is_published);
  const { data, error } = await q;
  handle(error, 'listExams');
  return data || [];
}
export async function getExam(id) {
  const { data, error } = await supabase.from('exams').select('*, subjects(*)').eq('id', id).single();
  handle(error, 'getExam');
  return data;
}

// Questions
export async function listQuestions(exam_id) {
  const { data, error } = await supabase.from('questions').select('*').eq('exam_id', exam_id).order('id');
  handle(error, 'listQuestions');
  return data || [];
}
export async function upsertQuestion(payload) {
  // ถ้ามี id -> update, ถ้าไม่มี -> insert
  if (payload.id) {
    const { data, error } = await supabase.from('questions').update(payload).eq('id', payload.id).select().single();
    handle(error, 'updateQuestion');
    return data;
  } else {
    const { data, error } = await supabase.from('questions').insert(payload).select().single();
    handle(error, 'insertQuestion');
    return data;
  }
}
export async function deleteQuestion(id) {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  handle(error, 'deleteQuestion');
  return true;
}

// Attempts & Answers
export async function createAttempt({ exam_id, student_id, time_spent=0, score=0 }) {
  const { data, error } = await supabase.from('student_attempts').insert({ exam_id, student_id, time_spent, score }).select().single();
  handle(error, 'createAttempt');
  return data;
}
export async function updateAttempt(id, payload) {
  const { data, error } = await supabase.from('student_attempts').update(payload).eq('id', id).select().single();
  handle(error, 'updateAttempt');
  return data;
}
export async function listMyAttempts(student_id, exam_id=null) {
  let q = supabase.from('student_attempts').select('*').eq('student_id', student_id).order('submitted_at', { ascending:false });
  if (exam_id) q = q.eq('exam_id', exam_id);
  const { data, error } = await q;
  handle(error, 'listMyAttempts');
  return data || [];
}
export async function insertAnswers(rows) {
  const { data, error } = await supabase.from('student_answers').insert(rows).select();
  handle(error, 'insertAnswers');
  return data;
}

// Analytics
export async function getAnswersForExam(exam_id) {
  const { data, error } = await supabase
    .from('student_answers')
    .select('*, student_attempts!inner(exam_id, score)')
    .eq('student_attempts.exam_id', exam_id);
  handle(error, 'getAnswersForExam');
  return data || [];
}

export async function getAnswersForQuestion(question_id) {
  const { data, error } = await supabase
    .from('student_answers')
    .select('*, student_attempts!inner(score)')
    .eq('question_id', question_id);
  handle(error, 'getAnswersForQuestion');
  return data || [];
}

export async function upsertQuestionAnalytics(question_id, payload) {
  // upsert โดยอาศัย unique constraint (question_id)
  const { data, error } = await supabase
    .from('question_analytics')
    .upsert({ question_id, ...payload }, { onConflict: 'question_id' })
    .select().single();
  handle(error, 'upsertQuestionAnalytics');
  return data;
}
