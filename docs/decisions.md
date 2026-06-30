# LoopOS — Decisões de Arquitetura

Registro de decisões técnicas e de produto tomadas ao longo do projeto.
Formato: data, decisão, motivação, alternativas consideradas.

---

## ADR-001 — App único modular (não multi-app)
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** Entregar todos os módulos em um único app mobile, com separação interna por módulo.

**Motivação:** A fragmentação entre apps aumenta fricção de uso diário. Um app único com navegação clara é mais fácil de manter o hábito de abertura.

**Alternativas consideradas:** Super app com micro-frontends, apps separados por módulo.

---

## ADR-002 — Monorepo com pnpm + Turborepo
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** Estrutura de monorepo usando pnpm workspaces para gerenciamento de pacotes e Turborepo para orquestração de builds.

**Motivação:** Compartilhamento de tipos e utilitários entre mobile, server e web sem duplicação. Builds incrementais via cache do Turbo reduzem tempo de CI. pnpm é mais eficiente em espaço em disco que npm/yarn.

**Alternativas consideradas:** Repositórios separados (descartado por overhead de sincronização de tipos), Nx (mais opinativo e complexo que necessário).

---

## ADR-003 — TypeScript em todos os pacotes
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** TypeScript com `strict: true` em todos os pacotes, sem exceções.

**Motivação:** Tipagem compartilhada entre camadas é o principal benefício do monorepo. Sem TypeScript estrito, o `@loopos/shared` perde valor. Bugs de tipo entre frontend e backend são comuns e caros.

**Alternativas consideradas:** JavaScript puro (descartado), TypeScript apenas no server (descartado por perder a vantagem de tipos compartilhados).

---

## ADR-004 — React Native com Expo
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** App mobile em React Native usando Expo como plataforma de desenvolvimento e distribuição.

**Motivação:** Expo reduz drasticamente o overhead de configuração nativa (iOS/Android). Expo Router e Expo EAS simplificam distribuição. Para um MVP de validação de hábito, a velocidade de iteração importa mais que controle nativo fino.

**Alternativas consideradas:** React Native CLI (descartado por overhead de configuração), Flutter (descartado para manter TypeScript como linguagem única no monorepo), native iOS/Android (descartado pelo esforço de manter duas bases de código).

---

## ADR-005 — Express no backend inicial
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** API HTTP com Node.js + Express como framework inicial.

**Motivação:** Express é mínimo, sem opinião e bem conhecido. Para o v0.1 (poucos endpoints, baixo volume), não há necessidade de um framework mais pesado. A estrutura modular em `server/src/modules/` permite migrar para Fastify ou outro framework no futuro sem reescrever lógica de negócio.

**Alternativas consideradas:** Fastify (mais rápido, mas overhead desnecessário no v0.1), NestJS (muito opinativo para o estágio atual), Hono (interessante, avaliado para v0.2+).

---

## ADR-006 — Prisma com PostgreSQL via Supabase
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** PostgreSQL como banco principal, Supabase como plataforma de hosting, Prisma como ORM.

**Motivação:** Prisma gera tipos TypeScript automaticamente a partir do schema, integrando com o `@loopos/shared`. Supabase oferece PostgreSQL gerenciado + Auth + Storage sem overhead de infraestrutura no v0.1. Prisma Migrate garante que mudanças de schema sejam rastreáveis.

**Alternativas consideradas:** SQLite + Turso (interessante para offline-first mas complexo de sincronizar), PlanetScale (MySQL, incompatível com features PostgreSQL que podem ser necessárias), Drizzle (alternativa mais leve ao Prisma, avaliada para v0.2).

---

## ADR-007 — Itens fora do escopo do v0.1
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** Os seguintes itens estão explicitamente fora do v0.1:

- **IA e LLMs:** Aumentam complexidade sem provar o loop central de hábito.
- **Bot Telegram:** Canal secundário; o app mobile deve ser validado primeiro.
- **Dashboard web:** Complexidade visual sem dados suficientes para visualizar.
- **Widgets Android/iOS:** Dependem do app estável e de dados consistentes.
- **Notificações inteligentes:** Requerem dados históricos para serem úteis.
- **Social features:** Produto é pessoal por definição no v0.1.

**Motivação:** Focar no loop central: registrar → persistir → consultar. Qualquer complexidade adicional antes de validar os 7 dias de uso é risco de produto.

---

## ADR-008 — Prisma schema como fonte de verdade dos dados persistentes
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** O schema Prisma (`server/prisma/schema.prisma`) é a fonte de verdade para qualquer entidade que persiste no banco. Os tipos em `packages/shared/src/types/` são provisórios — usados apenas até a Etapa 2 definir os modelos Prisma e os schemas Zod correspondentes. A partir da Etapa 2, tipos compartilhados devem ser inferidos de `@prisma/client` (para entidades do banco) e de schemas Zod (para contratos de entrada e saída da API), não escritos manualmente.

**Motivação:** Interfaces TypeScript manuais criam drift silencioso — o tipo diz uma coisa, o banco guarda outra. Prisma gera tipos automaticamente a partir do schema real; Zod garante que payloads de API sejam validados em runtime, não só em tempo de compilação. Escrever tipos manualmente duplica trabalho e é a causa mais comum de bugs de integração em projetos full-stack TypeScript.

**Implicações para a Etapa 2:**
- Definir modelos no schema Prisma primeiro.
- Rodar `prisma generate` para obter `PrismaClient` com tipos derivados.
- Criar schemas Zod para inputs de API (create, update) em `packages/shared/src/schemas/`.
- Remover ou substituir as interfaces manuais de `packages/shared/src/types/` conforme cada módulo for implementado.

**Alternativas consideradas:** Manter interfaces manuais como source of truth (descartado — divergência inevitável com o banco), usar apenas tipos do Prisma sem Zod (descartado — tipos Prisma não validam runtime, apenas compile-time).

---

## ADR-009 — Tela Hoje como agregação, sem tabela `daily_entries` na v0.1
**Data:** 2025-06  
**Status:** Aceita

**Decisão:** O módulo Hoje não terá tabela própria no banco na v0.1. A tela Hoje é uma view agregada dos dados reais dos módulos Corpo, Ritmo, Leitura e Listas — filtrando registros do dia corrente de cada módulo. Não existe `daily_entries` ou equivalente no schema da v0.1.

**Motivação:** Uma tabela genérica de registro diário (com `mood`, `note`, `completedAt`) seria um dado paralelo sem relação estrutural com o que o usuário de fato registrou. Isso cria dois problemas: (1) a tela Hoje mostraria dados redundantes ou inconsistentes com os módulos reais; (2) a tabela seria difícil de manter à medida que novos módulos são adicionados. A agregação é mais honesta com o modelo mental do produto — "o que fiz hoje" emerge dos dados, não de um meta-registro.

**Como implementar Hoje na v0.1:**
- Query `workout_entries` WHERE `date = today` → exibe treinos do dia.
- Query `tracker_events` WHERE `date = today` → exibe hábitos registrados hoje.
- Query `reading_sessions` WHERE `date = today` → exibe sessões de leitura do dia.
- Query `list_nodes` WHERE `updated_at >= início do dia` → exibe listas movimentadas hoje.

**Quando reconsiderar:** Se surgir necessidade clara de dado exclusivo da visão diária (ex: humor do dia, intenção matinal, retrospectiva noturna) que não pertença a nenhum módulo existente, o caso deve ser documentado aqui antes de qualquer implementação. A decisão de criar uma tabela de entrada diária genérica é adiada, não descartada.

---

## ADR-010 — Zod como camada de validação de contratos de API
**Data:** 2025-06 (Etapa 2)  
**Status:** Aceita

**Decisão:** Todos os payloads de entrada da API são validados com Zod. Os schemas vivem em `packages/shared/src/schemas/` e são compartilhados entre server, mobile e web. Tipos de input (`CreateWorkoutEntryInput`, etc.) são inferidos via `z.infer<>` — nunca escritos manualmente.

**Motivação:** Validação de runtime é necessária além da checagem de tipos em compile-time. Centralizar schemas no `@loopos/shared` evita duplicação e garante que formulários do mobile validem os mesmos contratos que o server aceita. `z.infer<>` mantém tipos e schemas em sincronia sem esforço manual.

**Middleware:** `validateBody(schema)` em `server/src/middleware/validateBody.ts` integra Zod com Express de forma genérica — aplica parse, substitui `req.body` pelo dado validado e coercido, passa `ZodError` para o `errorHandler` global.

**Alternativas consideradas:** `class-validator` + decorators (descartado — verboso e ligado a classes, incompatível com Prisma puro), `joi` (descartado — não integra com TypeScript inferido), validação manual por endpoint (descartado — duplicação e drift garantidos).

---

## ADR-011 — `env.ts` com Zod para variáveis de ambiente
**Data:** 2025-06 (Etapa 2)  
**Status:** Aceita

**Decisão:** Variáveis de ambiente são validadas via Zod no boot do servidor em `server/src/env.ts`. Se alguma variável obrigatória estiver ausente ou inválida, o processo encerra com `process.exit(1)` antes de aceitar conexões.

**Motivação:** Falha silenciosa em variáveis de ambiente causa bugs difíceis de rastrear em produção. Falha ruidosa no boot é preferível — o erro aparece imediatamente nos logs de deploy, não na primeira request de um usuário.

**Alternativas consideradas:** Checar `process.env` inline em cada arquivo (descartado — sem garantia de completude), `dotenv-safe` (descartado — menos flexível que Zod para coerção de tipos).

---

## ADR-012 — `app.ts` separado de `index.ts` no server
**Data:** 2025-06 (Etapa 2)  
**Status:** Aceita

**Decisão:** A configuração do Express vive em `app.ts` (exporta `createApp()`). O boot HTTP vive em `index.ts` (importa `createApp`, chama `app.listen`).

**Motivação:** Testes de integração podem importar `createApp()` e usar `supertest` sem precisar de um servidor HTTP real rodando em porta. Isso simplifica o setup de testes futuros.

**Alternativas consideradas:** Tudo em `index.ts` (descartado — dificulta testes), framework com DI (descartado — overhead desnecessário no v0.1).
