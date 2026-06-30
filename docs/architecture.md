# LoopOS — Arquitetura

## Decisão: monorepo modular

O LoopOS começa como um app mobile único, mas com arquitetura interna modular. Cada módulo de produto (Hoje, Corpo, Ritmo, Leitura, Listas) é tratado como uma unidade independente — com suas próprias telas, hooks, rotas e serviços.

---

## Estrutura de pastas

```
loopos/
├─ apps/
│  ├─ mobile/       → App React Native/Expo (produto principal)
│  └─ web/          → Dashboard Next.js (v0.3+)
├─ server/
│  ├─ src/
│  │  ├─ app.ts          → Express factory (testável isolado)
│  │  ├─ index.ts        → Boot: env + listen + graceful shutdown
│  │  ├─ env.ts          → Validação de variáveis de ambiente via Zod
│  │  ├─ lib/prisma.ts   → Singleton do PrismaClient
│  │  ├─ middleware/     → errorHandler, validateBody
│  │  ├─ routes/         → health.routes, index (roteador raiz)
│  │  └─ modules/        → body, rhythm, reading, lists, today
│  └─ prisma/schema.prisma
├─ packages/
│  ├─ shared/       → Schemas Zod, validators puros, date utils
│  └─ config/       → Constantes e enums de produto
└─ docs/
```

---

## Camadas e responsabilidades

### Prisma schema — fonte de verdade das entidades persistidas

O schema em `server/prisma/schema.prisma` define a estrutura real do banco. Os tipos TypeScript das entidades são **inferidos de `@prisma/client`** após `prisma generate` — nunca escritos manualmente. Ver ADR-008.

```typescript
// Correto: tipo inferido do Prisma
import type { WorkoutEntry } from '@prisma/client';

// Evitar: interface manual duplicando o schema
interface WorkoutEntry { ... }
```

### Zod — contratos de entrada da API

Schemas Zod em `packages/shared/src/schemas/` definem e validam os payloads de entrada (create/update). São compartilhados entre server (validação de `req.body`) e mobile/web (validação de formulários). Tipos de input são inferidos via `z.infer<typeof schema>`.

```typescript
import { createWorkoutEntrySchema, type CreateWorkoutEntryInput } from '@loopos/shared';
```

### Express — camada HTTP

Roteamento simples e direto. Cada módulo tem seu próprio `Router` dentro de `server/src/modules/<módulo>/`. O middleware `validateBody(schema)` integra Zod com Express antes de qualquer handler.

### Módulo Hoje — camada de agregação, não tabela

O endpoint `GET /api/today` agrega dados do dia corrente dos outros módulos. Não existe tabela `daily_entries`. Ver ADR-009.

---

## Fluxo de dados (v0.1)

```
Cliente (curl / mobile / web)
  │
  ├─ Header: x-user-id: <userId>           ← autenticação temporária (ADR-013)
  │                                           substituída por JWT Supabase na Etapa 4
  ▼
Express (app.ts)
  │
  ├─ requireAuth middleware                 ← popula req.userId
  ├─ validateBody(zodSchema) middleware     ← valida e coerce req.body via Zod
  │
  ▼
Handler (modules/<módulo>/<módulo>.handlers.ts)
  │
  ├─ prisma.<model>.findMany({ where: { userId } })
  ├─ prisma.<model>.create({ data: { userId, ...body } })
  └─ prisma.<model>.update/delete (após verificar ownership)
  │
  ▼
PrismaClient — singleton em lib/prisma.ts
  │
  ├─ Pool de conexões → DATABASE_URL (Supabase Transaction Pooler)
  └─ Direct connection → DIRECT_URL (migrations apenas)
  │
  ▼
PostgreSQL (Supabase)
```

### Isolamento de dados por usuário

Todos os handlers filtram por `userId` em cada query. Um `DELETE /api/body/workouts/:id` faz `findFirst({ where: { id, userId } })` antes de deletar — usuário A nunca acessa dados de usuário B.

## Mobile → API

```
apps/mobile/src/
├─ lib/api.ts              ← cliente HTTP (fetch + x-user-id + error handling)
├─ types/today.ts          ← tipos da resposta /api/today
├─ components/ui.tsx       ← Screen, Card, SectionTitle, Empty/Loading/ErrorState
├─ navigation/Navigation   ← Bottom tab com 5 abas
└─ screens/
   ├─ today/TodayScreen    ← chama getToday(), renderiza cards por módulo
   ├─ body/BodyScreen       ← placeholder
   ├─ rhythm/RhythmScreen   ← placeholder
   ├─ reading/ReadingScreen ← placeholder
   └─ lists/ListsScreen     ← placeholder
```

**Configuração da URL da API:**
```
# apps/mobile/.env
EXPO_PUBLIC_API_URL=http://localhost:3333      # emulador iOS / mesmo Mac
EXPO_PUBLIC_API_URL=http://10.0.2.2:3333      # emulador Android
EXPO_PUBLIC_API_URL=http://192.168.x.x:3333   # celular físico (IP local)
```

---

## Pacotes compartilhados

### `@loopos/shared`
Exporta schemas Zod (contratos de API), validators puros e utilitários de data. **Não exporta tipos de entidades** — esses vêm de `@prisma/client`. Usado por mobile, web e server.

### `@loopos/config`
Constantes do produto: nomes de módulos, versão. Referência única para evitar strings hardcoded.
