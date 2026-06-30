-- LoopOS — Schema SQL (modo Supabase direto)
--
-- Tabelas equivalentes ao schema Prisma em server/prisma/schema.prisma,
-- escritas em SQL puro para rodar diretamente no SQL Editor do Supabase.
--
-- Por que isso existe: o backend Express + Prisma (server/) continua sendo
-- a arquitetura de produção planejada. Este schema é um atalho temporário
-- para validação visual do app mobile sem depender de subir o backend
-- localmente. Ver docs/supabase-direct-mode.md.
--
-- ⚠️  RLS (Row Level Security) está DESATIVADO neste schema.
-- Isso é aceitável apenas para teste pessoal de um único usuário
-- (user_test_1). NÃO é seguro para produção ou múltiplos usuários reais.
-- Qualquer pessoa com a anon key consegue ler/escrever em qualquer linha.

-- ─── Extensões ──────────────────────────────────────────────────────────────

create extension if not exists pgcrypto; -- necessária para gen_random_uuid()

-- ─── users ──────────────────────────────────────────────────────────────────

create table if not exists users (
  id text primary key,
  email text unique not null,
  name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── workout_entries ────────────────────────────────────────────────────────

create table if not exists workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  date text not null,
  run_km numeric,
  pullup_sets int,
  pullup_reps int,
  raw_input text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_workout_entries_user_id on workout_entries(user_id);
create index if not exists idx_workout_entries_date on workout_entries(date);
create index if not exists idx_workout_entries_user_date on workout_entries(user_id, date);

-- ─── trackers ───────────────────────────────────────────────────────────────

create table if not exists trackers (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  title text not null,
  type text default 'boolean',
  target numeric,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_trackers_user_id on trackers(user_id);

-- ─── tracker_events ─────────────────────────────────────────────────────────

create table if not exists tracker_events (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  tracker_id uuid references trackers(id) on delete cascade,
  date text not null,
  event_type text default 'check',
  value numeric,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_tracker_events_user_id on tracker_events(user_id);
create index if not exists idx_tracker_events_date on tracker_events(date);
create index if not exists idx_tracker_events_user_date on tracker_events(user_id, date);
create index if not exists idx_tracker_events_tracker_id on tracker_events(tracker_id);

-- ─── books ──────────────────────────────────────────────────────────────────

create table if not exists books (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  title text not null,
  author text,
  total_pages int not null,
  current_page int default 0,
  status text default 'READING',
  started_at text,
  finished_at text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_books_user_id on books(user_id);

-- ─── reading_sessions ───────────────────────────────────────────────────────

create table if not exists reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  book_id uuid references books(id) on delete cascade,
  date text not null,
  pages_read int not null,
  from_page int,
  to_page int,
  note text,
  created_at timestamptz default now()
);

create index if not exists idx_reading_sessions_user_id on reading_sessions(user_id);
create index if not exists idx_reading_sessions_date on reading_sessions(date);
create index if not exists idx_reading_sessions_user_date on reading_sessions(user_id, date);
create index if not exists idx_reading_sessions_book_id on reading_sessions(book_id);

-- ─── list_nodes ─────────────────────────────────────────────────────────────

create table if not exists list_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id text references users(id) on delete cascade,
  parent_id uuid references list_nodes(id) on delete cascade,
  title text not null,
  content text,
  node_type text default 'ITEM',
  position int default 0,
  is_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_list_nodes_user_id on list_nodes(user_id);
create index if not exists idx_list_nodes_parent_id on list_nodes(parent_id);
create index if not exists idx_list_nodes_user_parent on list_nodes(user_id, parent_id);

-- ─── RLS: desativado de propósito ───────────────────────────────────────────
-- Para reativar futuramente (produção / múltiplos usuários reais):
--   alter table workout_entries enable row level security;
--   create policy "users can only access their own data"
--     on workout_entries for all
--     using (user_id = auth.uid()::text);
-- (repetir por tabela, adaptando à coluna user_id correspondente)
