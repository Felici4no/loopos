-- LoopOS — Seed SQL (modo Supabase direto)
--
-- Cria o usuário de teste fixo e dados de exemplo em todos os módulos,
-- usando current_date para que os registros apareçam em /api/today
-- (ou no equivalente via Supabase direto) no dia em que o seed é rodado.
--
-- Idempotente via ON CONFLICT — pode rodar mais de uma vez sem duplicar
-- o usuário base, mas re-execuções vão inserir novas linhas de treino,
-- eventos, etc (essas tabelas não têm unique constraint de negócio).
-- Para reset completo, rode antes:
--   truncate table list_nodes, reading_sessions, books, tracker_events,
--     trackers, workout_entries, users cascade;

-- ─── users ──────────────────────────────────────────────────────────────────

insert into users (id, email, name)
values ('user_test_1', 'lucas@test.loopos.local', 'Lucas Test')
on conflict (id) do update set
  email = excluded.email,
  name = excluded.name,
  updated_at = now();

-- ─── workout_entries ────────────────────────────────────────────────────────

insert into workout_entries (user_id, date, run_km, pullup_sets, pullup_reps, raw_input, notes)
values (
  'user_test_1',
  to_char(current_date, 'YYYY-MM-DD'),
  10,
  4,
  11,
  '10km 4x11',
  'Treino seed — corrida + pullups'
);

-- ─── trackers ───────────────────────────────────────────────────────────────

insert into trackers (id, user_id, title, type, target, is_active)
values
  (gen_random_uuid(), 'user_test_1', 'Meditação', 'boolean', null, true),
  (gen_random_uuid(), 'user_test_1', 'Água', 'count', 8, true);

-- ─── tracker_events (referenciando os trackers recém-criados) ───────────────

with t as (
  select id, title from trackers where user_id = 'user_test_1'
)
insert into tracker_events (user_id, tracker_id, date, event_type, value, note)
select
  'user_test_1',
  t.id,
  to_char(current_date, 'YYYY-MM-DD'),
  case when t.title = 'Meditação' then 'check' else 'value' end,
  case when t.title = 'Água' then 6 else null end,
  case when t.title = 'Meditação' then 'Meditação matinal — 15min' else '6 copos hoje' end
from t
where t.title in ('Meditação', 'Água');

-- ─── books ──────────────────────────────────────────────────────────────────

insert into books (id, user_id, title, author, total_pages, current_page, status, started_at)
values (
  gen_random_uuid(),
  'user_test_1',
  'A Psicologia Financeira',
  'Morgan Housel',
  256,
  142,
  'READING',
  to_char(current_date - interval '7 days', 'YYYY-MM-DD')
);

-- ─── reading_sessions (referenciando o livro recém-criado) ──────────────────

with b as (
  select id from books where user_id = 'user_test_1' and title = 'A Psicologia Financeira' limit 1
)
insert into reading_sessions (user_id, book_id, date, pages_read, from_page, to_page, note)
select
  'user_test_1',
  b.id,
  to_char(current_date, 'YYYY-MM-DD'),
  22,
  121,
  142,
  'Capítulo sobre viés de confirmação'
from b;

-- ─── list_nodes: lista raiz → item → subitem ─────────────────────────────────

-- Lista raiz
with root as (
  insert into list_nodes (id, user_id, parent_id, title, node_type, position, is_done)
  values (gen_random_uuid(), 'user_test_1', null, 'Compras', 'LIST', 0, false)
  returning id
),
-- Item filho da lista
item as (
  insert into list_nodes (id, user_id, parent_id, title, node_type, position, is_done)
  select gen_random_uuid(), 'user_test_1', root.id, 'Ovos', 'ITEM', 0, false
  from root
  returning id
)
-- Subitem dentro do item
insert into list_nodes (user_id, parent_id, title, content, node_type, position, is_done)
select 'user_test_1', item.id, 'Orgânicos', 'Preferir se tiver na feira', 'ITEM', 0, false
from item;

-- ─── Confirmação ──────────────────────────────────────────────────────────────

select
  (select count(*) from users where id = 'user_test_1') as users,
  (select count(*) from workout_entries where user_id = 'user_test_1') as workouts,
  (select count(*) from trackers where user_id = 'user_test_1') as trackers,
  (select count(*) from tracker_events where user_id = 'user_test_1') as tracker_events,
  (select count(*) from books where user_id = 'user_test_1') as books,
  (select count(*) from reading_sessions where user_id = 'user_test_1') as reading_sessions,
  (select count(*) from list_nodes where user_id = 'user_test_1') as list_nodes;
