# LoopOS

Sistema pessoal modular para registrar rotina, corpo, leitura, hábitos e listas.

> **v0.1 goal:** Provar que o usuário consegue usar o app por 7 dias consecutivos sem abandonar.

> 🔒 **Status atual:** v0.1 em validação real de 7 dias. Novas features estão congeladas até o fim do teste. Ver [`docs/validation-7-days.md`](docs/validation-7-days.md).

---

## Stack

| Camada       | Tecnologia                          |
|--------------|-------------------------------------|
| Mobile       | React Native + Expo + React Navigation |
| Web          | Next.js 14 App Router (v0.3+)       |
| API          | Node.js + Express + Zod             |
| Banco        | PostgreSQL via Supabase + Prisma    |
| Monorepo     | pnpm workspaces + Turborepo         |
| Linguagem    | TypeScript (strict) em tudo         |

---

## Estrutura

```
loopos/
├─ apps/
│  ├─ mobile/         → App React Native/Expo (produto principal)
│  └─ web/            → Dashboard Next.js (v0.3+)
├─ server/
│  ├─ src/            → API Express modular
│  └─ prisma/         → Schema, migrations e seed
├─ packages/
│  ├─ shared/         → Schemas Zod, validators, date utils
│  └─ config/         → Constantes compartilhadas
└─ docs/              → Documentação técnica e de produto
```

---

## Como rodar

### 1. Pré-requisitos

- Node.js ≥ 20
- pnpm ≥ 9
- Conta no [Supabase](https://supabase.com) (banco PostgreSQL)
- Expo Go no celular ou emulador Android/iOS

### 2. Instalar dependências

```bash
pnpm install
```

### 3. Configurar o banco (API)

```bash
# Copiar e preencher com credenciais do Supabase
cp server/.env.example server/.env
```

Edite `server/.env`:
```
DATABASE_URL="postgresql://..."   # Transaction Pooler (Supabase)
DIRECT_URL="postgresql://..."     # Direct Connection (migrations)
PORT=3333
NODE_ENV=development
```

```bash
# Criar tabelas
pnpm --filter @loopos/server prisma:migrate

# Gerar Prisma Client
pnpm --filter @loopos/server prisma:generate

# Popular banco com dados de teste
pnpm --filter @loopos/server prisma:seed
```

### 4. Configurar o mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env`:
```bash
# Emulador iOS ou mesmo Mac:
EXPO_PUBLIC_API_URL=http://localhost:3333

# Emulador Android:
EXPO_PUBLIC_API_URL=http://10.0.2.2:3333

# Celular físico (substitua pelo seu IP local):
EXPO_PUBLIC_API_URL=http://192.168.1.42:3333

EXPO_PUBLIC_USER_ID=user_test_1
```

> **Como descobrir seu IP local:**
> macOS/Linux: `ifconfig | grep "inet " | grep -v 127.0.0.1`
> Windows: `ipconfig` → Endereço IPv4

### 5. Rodar API e mobile juntos

```bash
# Terminal 1 — API
pnpm --filter @loopos/server dev

# Terminal 2 — Mobile
pnpm --filter @loopos/mobile start
# Escanear QR code com Expo Go no celular, ou pressionar 'a' (Android) / 'i' (iOS)
```

### 6. Validar

```bash
# API funcionando:
curl http://localhost:3333/health

# Dados do seed:
curl -H "x-user-id: user_test_1" http://localhost:3333/api/today | jq
```

---

## Módulos do produto

| Módulo   | Tela mobile    | Status         |
|----------|----------------|----------------|
| Hoje     | TodayScreen    | ✅ Funcional    |
| Corpo    | BodyScreen     | ✅ Funcional    |
| Ritmo    | RhythmScreen   | ✅ Funcional    |
| Leitura  | ReadingScreen  | ✅ Funcional    |
| Listas   | ListsScreen    | ✅ Funcional    |

Todos os 5 módulos do v0.1 estão funcionais. Próximo passo: validar 7 dias de uso real.

---

## Como validar o MVP v0.1 em 7 dias

O LoopOS v0.1 está pronto para o teste central do produto: **uso diário real por 7 dias consecutivos sem abandono.** Protocolo completo em [`docs/validation-7-days.md`](docs/validation-7-days.md).

### Setup mínimo para o teste

```bash
# 1. API rodando (Terminal 1)
pnpm --filter @loopos/server dev

# 2. Mobile rodando (Terminal 2)
pnpm --filter @loopos/mobile start
```

### Configurar a URL da API conforme o ambiente

Edite `apps/mobile/.env`:

| Ambiente | `EXPO_PUBLIC_API_URL` |
|----------|------------------------|
| Emulador iOS / mesmo Mac | `http://localhost:3333` |
| Emulador Android | `http://10.0.2.2:3333` |
| **Celular físico** (recomendado para o teste de 7 dias) | `http://192.168.x.x:3333` — seu IP local |

> Celular físico não acessa `localhost` da sua máquina. Descubra seu IP com `ifconfig | grep "inet " | grep -v 127.0.0.1` (macOS/Linux) e use-o no lugar de `localhost`. O celular e o computador precisam estar na mesma rede Wi-Fi.

### Fluxos a testar todos os dias

1. Abrir o app → ver a tela **Hoje**.
2. Registrar algo em **Corpo** (ex: `10km 4x11`) ou marcar um hábito em **Ritmo**.
3. Se estiver lendo algo, registrar uma sessão em **Leitura**.
4. Criar ou marcar um item em **Listas**.
5. Voltar para **Hoje** e confirmar que tudo aparece atualizado.

Checklist diário completo, perguntas de avaliação e critérios de sucesso/falha estão em [`docs/validation-7-days.md`](docs/validation-7-days.md).

### Segurança neste ambiente de teste

O app usa `x-user-id: user_test_1` fixo como autenticação temporária — **isso não é seguro e não deve ir para produção.** Não insira dados pessoais sensíveis reais (senhas, documentos, dados financeiros) durante o teste. Supabase Auth substitui esse mecanismo após a validação do MVP (ver ADR-013 em `docs/decisions.md`).

---

## Scripts úteis

| Script | Descrição |
|--------|-----------|
| `pnpm --filter @loopos/server dev` | API em modo dev (hot reload) |
| `pnpm --filter @loopos/mobile start` | Metro bundler do Expo |
| `pnpm --filter @loopos/server prisma:seed` | Popular banco com dados de teste |
| `pnpm --filter @loopos/server prisma:studio` | Visualizar banco no browser |
| `pnpm typecheck` | Verificar tipos em todo o monorepo |

---

## Documentação

- [`docs/product.md`](docs/product.md) — Visão do produto e módulos
- [`docs/architecture.md`](docs/architecture.md) — Arquitetura, fluxos e decisões
- [`docs/database.md`](docs/database.md) — Modelos Prisma implementados
- [`docs/roadmap.md`](docs/roadmap.md) — v0.1 → v0.5
- [`docs/decisions.md`](docs/decisions.md) — ADRs (Architecture Decision Records)
- [`docs/api-tests.md`](docs/api-tests.md) — Testes manuais com curl
- [`docs/validation-7-days.md`](docs/validation-7-days.md) — Protocolo de validação de 7 dias do MVP
- [`docs/mvp-checklist.md`](docs/mvp-checklist.md) — Checklist técnico de fechamento do v0.1
- [`docs/android-build.md`](docs/android-build.md) — Como rodar no Expo Go e gerar APK de preview
- [`docs/local-visual-run.md`](docs/local-visual-run.md) — Passo a passo para rodar banco, API e mobile localmente
- [`docs/visual-checklist.md`](docs/visual-checklist.md) — Checklist de validação visual módulo a módulo
