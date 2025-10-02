-- schema.sql
-- โครงสร้างตารางตามข้อกำหนด (ปรับชนิดข้อมูลตามความเหมาะสมของ Postgres)

create table if not exists users (
  id uuid primary key,               -- ตรงกับ auth.users.id
  email text,
  full_name text,
  role text check (role in ('teacher','student')) default 'student',
  grade_level text,
  created_at timestamptz default now()
);

create table if not exists subjects (
  id bigserial primary key,
  name text not null,
  name_en text not null,
  icon text
);

create table if not exists exams (
  id bigserial primary key,
  title text not null,
  subject_id bigint references subjects(id) on delete set null,
  total_score int default 0,
  passing_score int default 50,
  time_limit int default 30,
  is_published boolean default false,
  created_at timestamptz default now()
);

create table if not exists questions (
  id bigserial primary key,
  exam_id bigint references exams(id) on delete cascade,
  question_type text check (question_type in ('multiple_choice','matching','fill_blank','true_false')) not null,
  question_text text not null,
  question_data jsonb,          -- options,left/right,ฯลฯ
  correct_answer jsonb,         -- เลือกเก็บเป็น json เพื่อรองรับทุกประเภท
  points int default 1
);

create table if not exists student_attempts (
  id bigserial primary key,
  exam_id bigint references exams(id) on delete cascade,
  student_id uuid references users(id) on delete set null,
  score int default 0,
  submitted_at timestamptz,
  time_spent int default 0,
  created_at timestamptz default now()
);

create table if not exists student_answers (
  id bigserial primary key,
  attempt_id bigint references student_attempts(id) on delete cascade,
  question_id bigint references questions(id) on delete cascade,
  answer_data jsonb,
  is_correct boolean,
  points_earned int default 0
);

create table if not exists question_analytics (
  id bigserial primary key,
  question_id bigint references questions(id) on delete cascade,
  total_attempts int default 0,
  correct_attempts int default 0,
  difficulty_index numeric,     -- P-value
  discrimination_index numeric
);

-- subjects seed
insert into subjects (name, name_en, icon) values
('คณิตศาสตร์','math','🧮'),
('ภาษาอังกฤษ','english','🇬🇧'),
('ภาษาไทย','thai','🇹🇭')
on conflict do nothing;
