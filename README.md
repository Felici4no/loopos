# LoopOS

Sistema pessoal modular para registrar rotina, corpo, leitura, hábitos e listas.

> **v0.1 goal:** Provar que o usuário consegue usar o app por 7 dias consecutivos sem abandonar.

---

## Stack

| Camada       | Tecnologia                        |
|--------------|-----------------------------------|
| Mobile       | React Native + Expo               |
| Web          | Next.js 14 (App Router)           |
| API          | Node.js + Express                 |
| Banco        | PostgreSQL via Supabase + Prisma  |
| Monorepo     | pnpm workspaces + Turborepo       |
| Linguagem    | TypeScript (strict) em tudo       |

---

## Estrutura

```
loopos/
├─ apps/
│  ├─ mobile/         → App React Native/Expo
│  └─ web/            → Dashboard Next.js (v0.3+)
├─ server/
│  ├─ src/            → API Express
│  └─ prisma/         → Schema e migrations
├─ packages/
│  ├─ shared/         → Tipos, validators, date utils
│  └─ config/         → Constantes compartilhadas
└─ docs/              → Documentação técnica e de produto
```

---

## Módulos do produto

| Módulo   | Descrição                                     |
|----------|-----------------------------------------------|
| Hoje     | Registro diário com humor e nota livre        |
| Corpo    | Log de treinos e atividade física             |
| Ritmo    | Trackers de hábitos e frequências             |
| Leitura  | Biblioteca e sessões de leitura               |
| Listas   | Listas simples com suporte a hierarquia       |

---

## Setup

### Pré-requisitos
- Node.js ≥ 20
- pnpm ≥ 9

### Instalação

```bash
# Instalar dependências de todos os pacotes
pnpm install

# Verificar tipos em todos os pacotes
pnpm typecheck

# Rodar todos os apps em modo dev
pnpm dev
```

### Variáveis de ambiente

```bash
# Copiar exemplo do server
cp server/.env.example server/.env
# Editar DATABASE_URL com sua conexão Supabase
```

---

## Scripts disponíveis

| Script           | Descrição                                |
|------------------|------------------------------------------|
| `pnpm dev`       | Roda todos os apps em modo desenvolvimento |
| `pnpm build`     | Build de todos os pacotes                |
| `pnpm typecheck` | Verifica tipos em todo o monorepo        |
| `pnpm lint`      | Lint em todos os pacotes                 |
| `pnpm format`    | Formata código com Prettier              |

---

## Documentação

- [`docs/product.md`](docs/product.md) — Visão do produto e módulos
- [`docs/architecture.md`](docs/architecture.md) — Decisão pelo monorepo e estrutura
- [`docs/database.md`](docs/database.md) — Tabelas previstas e modelagem
- [`docs/roadmap.md`](docs/roadmap.md) — v0.1 → v0.5
- [`docs/decisions.md`](docs/decisions.md) — ADRs (Architecture Decision Records)

---

## Próximos passos (Etapa 2)

1. Definir schema Prisma completo com todos os modelos.
2. Criar primeira migration e conectar ao Supabase.
3. Implementar endpoints CRUD para o módulo **Hoje**.
4. Integrar autenticação via Supabase Auth.
5. Conectar app mobile aos endpoints da API.
