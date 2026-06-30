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
Mobile App
  → REST API (Express + validateBody)
    → Zod (validação de input)
    → Prisma (persistência)
    → PostgreSQL/Supabase
```

---

## Pacotes compartilhados

### `@loopos/shared`
Exporta schemas Zod (contratos de API), validators puros e utilitários de data. **Não exporta tipos de entidades** — esses vêm de `@prisma/client`. Usado por mobile, web e server.

### `@loopos/config`
Constantes do produto: nomes de módulos, versão. Referência única para evitar strings hardcoded.
