# LoopOS — Resumo do Projeto e Melhorias Propostas

> Documento gerado em 2026-07-01 como fotografia do estado atual do projeto
> e catálogo de melhorias candidatas. Não é um compromisso de roadmap —
> prioridades continuam em [`roadmap.md`](roadmap.md).

---

## O que é o LoopOS

Sistema pessoal modular para registrar rotina, corpo, leitura, hábitos e listas.
O produto principal é um app mobile (React Native + Expo) com 5 módulos:

| Módulo  | Tela            | Função                                              |
|---------|-----------------|-----------------------------------------------------|
| Hoje    | `TodayScreen`   | Agregação diária de todos os módulos                |
| Corpo   | `BodyScreen`    | Registro rápido de treinos + histórico              |
| Ritmo   | `RhythmScreen`  | Trackers de hábitos, eventos, streaks, anti-dup     |
| Leitura | `ReadingScreen` | Biblioteca, sessões de leitura, progresso           |
| Listas  | `ListsScreen`   | Listas hierárquicas (raiz → item → subitem)         |

**Meta do v0.1:** provar que o usuário consegue usar o app por 7 dias
consecutivos sem abandonar. Novas features estão congeladas até o fim
desse teste (ver [`validation-7-days.md`](validation-7-days.md)).

---

## Arquitetura atual

Monorepo pnpm workspaces + Turborepo, TypeScript strict em tudo:

```
loopos/
├─ apps/
│  ├─ mobile/    → React Native + Expo SDK 51 (produto principal)
│  └─ web/       → Next.js 14 (esqueleto, previsto para v0.3)
├─ server/       → API Express + Zod + Prisma (PostgreSQL/Supabase)
├─ packages/
│  ├─ shared/    → Schemas Zod, validators, date utils
│  └─ config/    → Constantes compartilhadas
├─ supabase/     → schema.sql, seed.sql, edge functions
└─ docs/         → 14 documentos técnicos e de produto (incl. ADRs)
```

### Estado do v0.1: modo local-only

O app mobile atual roda **100% local no aparelho** (AsyncStorage via
`localDb.ts`/`localStore.ts`): sem servidor, sem Supabase, sem `.env`
obrigatório. Essa decisão destrava a validação de 7 dias via APK sem
depender de backend deployado.

O código, porém, carrega **três modos de dados coexistindo**:

1. `lib/api.ts` — cliente da API Express (modo original)
2. `lib/supabase.ts` — acesso direto ao Supabase (modo de validação visual)
3. `lib/localDb.ts` + `lib/localStore.ts` — modo local-only (ativo)

### Build e distribuição

- APK gerado via **EAS Build** (perfil `preview`, `buildType: apk`),
  projeto vinculado ao EAS: `bd16c8c9-5240-46d1-b0fe-20aa0c6fe635`
  (owner `felici4nos-team`), configurado em `app.config.ts`.
- Base directory no dashboard EAS/GitHub: `apps/mobile`.
- Pastas nativas `android/`/`ios/` são geradas por `expo prebuild` e
  ignoradas no git (managed workflow no CI da EAS).

### Autenticação (temporária)

Header fixo `x-user-id: user_test_1` — explicitamente inseguro e
documentado como provisório (ADR-013). Supabase Auth entra após a
validação do MVP.

---

## Pontos fortes

- **Escopo disciplinado:** feature freeze durante a validação, "fora do
  escopo até v0.5" explícito no roadmap.
- **Documentação incomum para o estágio:** 14 docs cobrindo produto,
  arquitetura, banco, ADRs, protocolos de teste e builds.
- **Separação limpa no server:** módulos por domínio
  (`body`, `rhythm`, `reading`, `lists`, `today`) com handlers/routes
  separados, middleware de validação Zod e error handler central.
- **Tipagem estrita ponta a ponta** com schemas Zod compartilhados em
  `packages/shared`.
- **UX defensiva já no MVP:** estados vazios orientados à ação e botão
  "Tentar novamente" em todas as telas.

---

## Melhorias propostas

### 1. Corrigir agora (baixo custo, evita dor real)

- **Commitar as migrations do Prisma.** O `.gitignore` raiz exclui
  `server/prisma/migrations/` — migrations são código-fonte e precisam
  ser versionadas; sem elas não há como reconstruir o banco de forma
  reprodutível em outro ambiente ou no deploy.
- **Alinhar `packageManager`.** O root `package.json` declara
  `pnpm@9.0.0`, mas o ambiente de desenvolvimento já usa pnpm 11.x.
  Fixar a versão real (ou usar `corepack`) evita lockfiles divergentes.
- **Exportar/backup dos dados local-only.** Durante a validação de 7
  dias, todos os dados vivem no AsyncStorage: desinstalar o app (ou um
  clear de dados do Android) apaga tudo. Um botão "Exportar JSON"
  (share sheet) é barato e protege o teste.

### 2. Pós-validação (já previstas, reforçadas aqui)

- **Supabase Auth** substituindo o header `x-user-id` (ADR-013).
- **Unique constraints de anti-duplicidade no banco** — hoje a proteção
  é só na aplicação.
- **Consolidar os três modos de dados** (`api.ts` / `supabase.ts` /
  `localDb.ts`) atrás de uma única interface de repositório com um
  seletor de modo. Isso vira pré-requisito natural da sincronização
  local ↔ remoto e elimina risco de telas importarem o modo errado.
- **Unificar tipos:** `apps/mobile/src/types/*` duplica conceitos que
  já existem (ou deveriam existir) em `packages/shared`. Uma fonte
  única de schemas Zod → tipos inferidos reduz drift entre mobile e API.

### 3. Qualidade e automação

- **Testes automatizados — hoje não há nenhum.** Prioridade sugerida:
  1. Unit nos parsers/cálculos puros (`parseWorkoutInput`,
     `rhythmStats`, `readingProgress`) — alto valor, custo mínimo;
  2. Integração dos handlers Express com banco de teste;
  3. Smoke test de render por tela (React Native Testing Library).
- **CI com GitHub Actions:** `pnpm typecheck` + `lint` + testes em todo
  push/PR. O monorepo já usa Turborepo, então cache de pipeline é
  praticamente de graça. Opcional: disparar EAS Build por tag (`v0.1.x`)
  em vez de builds manuais pelo dashboard.
- **Atualizar Expo SDK.** O app usa SDK 51 / React Native 0.74 (2024),
  várias versões atrás do SDK atual. Quanto mais o upgrade atrasar,
  mais caro fica — vale fazer logo após a validação, antes de crescer
  a base de código nativo-dependente.

### 4. Produto (candidatas pós-v0.1, além do roadmap existente)

- **Sincronização offline-first** (local → Supabase com fila de
  mutações): é a evolução natural do modo local-only atual e mantém a
  principal qualidade do MVP — registrar sem depender de rede.
- **Métricas de uso da própria validação:** contador local de
  aberturas/registros por dia dentro do app tornaria o resultado do
  teste de 7 dias objetivo, em vez de depender só de auto-relato.
- **Widget Android de registro rápido** (já no v0.2 do roadmap) — dado
  que a meta é "registrar em menos de 10 segundos", é a feature com
  maior alavancagem de retenção.

---

## Referências

- [`product.md`](product.md) — visão de produto
- [`architecture.md`](architecture.md) — arquitetura e fluxos
- [`decisions.md`](decisions.md) — ADRs
- [`roadmap.md`](roadmap.md) — v0.1 → v0.5
- [`validation-7-days.md`](validation-7-days.md) — protocolo do teste atual
- [`local-only-apk.md`](local-only-apk.md) — modo de dados atual
