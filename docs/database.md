# LoopOS — Banco de Dados

> **Fonte de verdade:** `server/prisma/schema.prisma`. Este documento descreve os modelos implementados. Em caso de divergência, o schema prevalece. Ver ADR-008.
>
> **Módulo Hoje:** não existe tabela `daily_entries`. O módulo Hoje é uma agregação dos dados dos módulos reais. Ver ADR-009.

---

## Tecnologia

- **PostgreSQL** como banco relacional principal.
- **Supabase** como plataforma de hospedagem (pooler para queries, direct URL para migrations).
- **Prisma** como ORM e migration manager — gera tipos TypeScript automaticamente.

---

## Modelos implementados (v0.1)

### `users`
Usuário do LoopOS. Criado via autenticação (Etapa 3+).

| Campo      | Tipo     | Descrição                     |
|------------|----------|-------------------------------|
| id         | CUID     | PK                            |
| email      | String   | Único                         |
| name       | String?  | Nome de exibição              |
| created_at | DateTime | —                             |
| updated_at | DateTime | Auto-atualizado               |

Relações: `workoutEntries`, `trackers`, `trackerEvents`, `books`, `readingSessions`, `listNodes`

---

### `workout_entries`
Registros do módulo Corpo (treinos).

| Campo          | Tipo     | Descrição                        |
|----------------|----------|----------------------------------|
| id             | CUID     | PK                               |
| user_id        | FK(user) | `onDelete: Cascade`              |
| date           | String   | YYYY-MM-DD — data do treino      |
| run_km         | Float?   | Quilômetros rodados              |
| pullup_sets    | Int?     | Sets de pullup                   |
| pullup_reps    | Int?     | Reps de pullup                   |
| raw_input      | String?  | Texto original antes do parsing  |
| notes          | String?  | Nota livre                       |
| created_at     | DateTime | —                                |
| updated_at     | DateTime | Auto-atualizado                  |

Índices: `(user_id)`, `(user_id, date)`

---

### `trackers`
Definição de um hábito rastreável no módulo Ritmo.

| Campo      | Tipo     | Descrição                                 |
|------------|----------|-------------------------------------------|
| id         | CUID     | PK                                        |
| user_id    | FK(user) | `onDelete: Cascade`                       |
| title      | String   | Nome do tracker (ex: "Meditação")         |
| type       | String   | `boolean` \| `count` \| `duration`        |
| target     | Int?     | Meta diária opcional (ex: 8 para água)    |
| is_active  | Boolean  | Soft-disable (default: true)              |
| created_at | DateTime | —                                         |
| updated_at | DateTime | Auto-atualizado                           |

Índices: `(user_id)`

---

### `tracker_events`
Ocorrências registradas em um tracker.

| Campo      | Tipo        | Descrição                         |
|------------|-------------|-----------------------------------|
| id         | CUID        | PK                                |
| tracker_id | FK(tracker) | `onDelete: Cascade`               |
| user_id    | FK(user)    | Desnormalizado para queries       |
| date       | String      | YYYY-MM-DD                        |
| event_type | String      | `check` \| `value`                |
| value      | Float?      | Quantidade (quando type ≠ boolean)|
| note       | String?     | —                                 |
| created_at | DateTime    | —                                 |

Índices: `(user_id)`, `(tracker_id, date)`, `(user_id, date)`

---

### `books`
Biblioteca pessoal do módulo Leitura.

| Campo        | Tipo       | Descrição                                  |
|--------------|------------|--------------------------------------------|
| id           | CUID       | PK                                         |
| user_id      | FK(user)   | `onDelete: Cascade`                        |
| title        | String     | —                                          |
| author       | String?    | —                                          |
| total_pages  | Int?       | —                                          |
| current_page | Int?       | Última página lida                         |
| status       | BookStatus | `WANT_TO_READ` \| `READING` \| `FINISHED` \| `DROPPED` |
| started_at   | DateTime?  | —                                          |
| finished_at  | DateTime?  | —                                          |
| created_at   | DateTime   | —                                          |
| updated_at   | DateTime   | Auto-atualizado                            |

Índices: `(user_id)`, `(user_id, status)`

---

### `reading_sessions`
Sessões de leitura de um livro.

| Campo        | Tipo     | Descrição            |
|--------------|----------|----------------------|
| id           | CUID     | PK                   |
| user_id      | FK(user) | `onDelete: Cascade`  |
| book_id      | FK(book) | `onDelete: Cascade`  |
| date         | String   | YYYY-MM-DD           |
| pages_read   | Int      | Páginas lidas        |
| from_page    | Int?     | Página inicial       |
| to_page      | Int?     | Página final         |
| note         | String?  | —                    |
| created_at   | DateTime | —                    |

Índices: `(user_id)`, `(book_id)`, `(user_id, date)`

---

### `list_nodes`
Nós hierárquicos do módulo Listas. `nodeType = LIST` é um container; `nodeType = ITEM` é uma folha.

| Campo      | Tipo         | Descrição                              |
|------------|--------------|----------------------------------------|
| id         | CUID         | PK                                     |
| user_id    | FK(user)     | `onDelete: Cascade`                    |
| parent_id  | FK(listNode)?| Self-reference — `onDelete: Cascade`   |
| title      | String       | Título do nó                           |
| content    | String?      | Conteúdo livre                         |
| node_type  | ListNodeType | `LIST` \| `ITEM`                       |
| position   | Int          | Ordem dentro do pai                    |
| is_done    | Boolean      | Checklist state                        |
| created_at | DateTime     | —                                      |
| updated_at | DateTime     | Auto-atualizado                        |

Índices: `(user_id)`, `(user_id, parent_id)`

---

## Módulo Hoje — sem tabela própria

O módulo Hoje agrega dados do dia atual de cada módulo:

```
GET /api/today
→ workout_entries WHERE date = today AND user_id = user  → body
→ tracker_events WHERE date = today AND user_id = user   → rhythm[]
→ reading_sessions WHERE date = today AND user_id = user → reading
→ list_nodes WHERE user_id = user AND updated_at >= BOD  → lists[]
```

Não existe `daily_entries`. Ver ADR-009.

---

## Decisões de modelagem

- IDs em CUID — legível, sem colisão, ordenável por criação.
- Datas de registro como `String YYYY-MM-DD` — sem timezone no nível do dado; timezone é propriedade do usuário (futura coluna `users.timezone`).
- `user_id` desnormalizado em eventos — queries de timeline não precisam de join extra.
- `onDelete: Cascade` em todas as relações de dados do usuário — exclusão de conta limpa tudo.
- Enums Prisma para `BookStatus` e `ListNodeType` — segurança em nível de banco.
- `is_active` em `trackers` em vez de hard-delete — preserva histórico de eventos.
