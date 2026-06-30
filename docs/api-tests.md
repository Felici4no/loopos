# LoopOS API — Testes Manuais (curl)

Base URL: `http://localhost:3333`  
Autenticação: header `x-user-id: user_test_1` em todos os endpoints autenticados.

Pré-requisito: banco com seed rodado.
```bash
pnpm --filter @loopos/server prisma:seed
pnpm --filter @loopos/server dev
```

---

## Health

```bash
# GET /health — sem autenticação
curl -s http://localhost:3333/health | jq
```

Esperado:
```json
{
  "status": "ok",
  "service": "loopos-api",
  "version": "0.1.0",
  "timestamp": "..."
}
```

---

## Debug (apenas development)

```bash
# GET /api/debug/me — retorna usuário autenticado e contagem de registros
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/debug/me | jq
```

Esperado: objeto com `user.id`, `user.email`, `user._count.*`

---

## Today (agregação do dia)

```bash
# GET /api/today — data atual do servidor
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/today | jq

# GET /api/today — data específica
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/today?date=$(date +%Y-%m-%d)" | jq
```

Esperado após seed:
```json
{
  "date": "YYYY-MM-DD",
  "workouts": [{ "id": "seed_workout_1", "runKm": 10, "pullupSets": 4 }],
  "rhythm": [
    { "id": "seed_event_meditation_today", "eventType": "check", "tracker": { "title": "Meditação" } },
    { "id": "seed_event_no_sugar_today",   "eventType": "value", "value": 3 }
  ],
  "reading": [{ "id": "seed_session_1", "pagesRead": 22, "book": { "title": "A Psicologia Financeira" } }],
  "lists": [{ "id": "seed_list_root", "title": "Leituras 2025", "nodeType": "LIST" }]
}
```

---

## Body — Treinos

```bash
# GET — listar treinos
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/body/workouts | jq

# GET — filtrar por data
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/body/workouts?date=$(date +%Y-%m-%d)" | jq

# POST — criar treino
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d "{\"date\": \"$(date +%Y-%m-%d)\", \"runKm\": 5.5, \"notes\": \"Corrida leve\"}" \
  http://localhost:3333/api/body/workouts | jq

# Guarde o ID retornado para os próximos testes:
# WORKOUT_ID=$(curl -s -X POST ... | jq -r '.data.id')

# PATCH — atualizar treino (substitua <id> pelo ID real)
curl -s -X PATCH \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Corrida atualizada — 5.5km"}' \
  http://localhost:3333/api/body/workouts/<id> | jq

# DELETE — remover treino
curl -s -X DELETE \
  -H "x-user-id: user_test_1" \
  http://localhost:3333/api/body/workouts/<id> -v
# Esperado: HTTP 204 sem body
```

---

## Rhythm — Trackers

```bash
# GET — listar trackers
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/rhythm/trackers | jq

# POST — criar tracker
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"title": "Água", "type": "count", "target": 8}' \
  http://localhost:3333/api/rhythm/trackers | jq

# PATCH — arquivar tracker (substitua <id>)
curl -s -X PATCH \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}' \
  http://localhost:3333/api/rhythm/trackers/<id> | jq

# DELETE — remover tracker (cascade apaga eventos)
curl -s -X DELETE \
  -H "x-user-id: user_test_1" \
  http://localhost:3333/api/rhythm/trackers/<id> -v
```

## Rhythm — Eventos

```bash
# GET — eventos de hoje
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/rhythm/events?date=$(date +%Y-%m-%d)" | jq

# GET — eventos de um tracker específico
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/rhythm/events?trackerId=seed_tracker_meditation" | jq

# POST — registrar evento (substitua <trackerId>)
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d "{\"trackerId\": \"seed_tracker_meditation\", \"date\": \"$(date +%Y-%m-%d)\", \"eventType\": \"check\"}" \
  http://localhost:3333/api/rhythm/events | jq

# DELETE — remover evento
curl -s -X DELETE \
  -H "x-user-id: user_test_1" \
  http://localhost:3333/api/rhythm/events/<id> -v
```

---

## Reading — Livros

```bash
# GET — listar livros
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/reading/books | jq

# GET — filtrar por status
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/reading/books?status=READING" | jq

# GET — livro com sessões recentes
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/reading/books/seed_book_1 | jq

# POST — adicionar livro
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"title": "O Investidor Inteligente", "author": "Benjamin Graham", "totalPages": 623, "status": "WANT_TO_READ"}' \
  http://localhost:3333/api/reading/books | jq

# PATCH — atualizar status do livro
curl -s -X PATCH \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"status": "READING", "startedAt": "'"$(date -u +%Y-%m-%dT%H:%M:%SZ)"'"}' \
  http://localhost:3333/api/reading/books/<id> | jq
```

## Reading — Sessões

```bash
# GET — sessões de um livro
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/reading/sessions?bookId=seed_book_1" | jq

# GET — sessões de hoje
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/reading/sessions?date=$(date +%Y-%m-%d)" | jq

# POST — registrar sessão (atualiza currentPage automaticamente)
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d "{\"bookId\": \"seed_book_1\", \"date\": \"$(date +%Y-%m-%d)\", \"pagesRead\": 15, \"fromPage\": 143, \"toPage\": 157}" \
  http://localhost:3333/api/reading/sessions | jq

# DELETE — remover sessão
curl -s -X DELETE \
  -H "x-user-id: user_test_1" \
  http://localhost:3333/api/reading/sessions/<id> -v
```

---

## Lists — Nós

```bash
# GET — listas raiz (parentId = null)
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/lists/nodes | jq

# GET — filhos de um nó (substitua <parentId>)
curl -s -H "x-user-id: user_test_1" \
  "http://localhost:3333/api/lists/nodes?parentId=seed_list_root" | jq

# GET — nó com filhos diretos
curl -s -H "x-user-id: user_test_1" \
  http://localhost:3333/api/lists/nodes/seed_list_root | jq

# POST — criar lista raiz
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"title": "Compras da semana", "nodeType": "LIST"}' \
  http://localhost:3333/api/lists/nodes | jq

# POST — criar item filho (substitua <listId>)
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"title": "Ovos", "parentId": "<listId>", "nodeType": "ITEM"}' \
  http://localhost:3333/api/lists/nodes | jq

# POST — subitem (profundidade 2, substitua <itemId>)
curl -s -X POST \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"title": "Orgânicos se possível", "parentId": "<itemId>", "nodeType": "ITEM"}' \
  http://localhost:3333/api/lists/nodes | jq

# PATCH — marcar como feito
curl -s -X PATCH \
  -H "x-user-id: user_test_1" \
  -H "Content-Type: application/json" \
  -d '{"isDone": true}' \
  http://localhost:3333/api/lists/nodes/<id> | jq

# DELETE — remover nó (cascade apaga filhos)
curl -s -X DELETE \
  -H "x-user-id: user_test_1" \
  http://localhost:3333/api/lists/nodes/<id> -v
```

---

## Testes de segurança — isolamento por userId

```bash
# Deve retornar lista vazia (user_test_2 não tem dados)
curl -s -H "x-user-id: user_test_2" \
  http://localhost:3333/api/body/workouts | jq
# Esperado: { "data": [] }

# Deve retornar 401 (sem header)
curl -s http://localhost:3333/api/body/workouts | jq
# Esperado: { "error": { "code": "UNAUTHORIZED" } }

# Deve retornar 404 (user_test_2 tentando acessar dado do user_test_1)
curl -s -H "x-user-id: user_test_2" \
  http://localhost:3333/api/body/workouts/seed_workout_1 | jq
# Esperado: { "error": { "code": "NOT_FOUND" } }
```

---

## Padrão de respostas

| Operação | Status | Body |
|----------|--------|------|
| GET (lista) | 200 | `{ "data": [...] }` |
| GET (item) | 200 | `{ "data": {...} }` |
| POST | 201 | `{ "data": {...} }` |
| PATCH | 200 | `{ "data": {...} }` |
| DELETE | 204 | (sem body) |
| Erro de validação | 422 | `{ "error": { "code": "VALIDATION_ERROR", "details": {...} } }` |
| Não autorizado | 401 | `{ "error": { "code": "UNAUTHORIZED" } }` |
| Não encontrado | 404 | `{ "error": { "code": "NOT_FOUND" } }` |
| Erro interno | 500 | `{ "error": { "code": "INTERNAL_ERROR" } }` |
