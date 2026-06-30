# LoopOS — `@supabase/server` (preparação futura, não ativa)

> ⚠️ **Este documento descreve uma integração futura, ainda não usada pelo
> app.** O mobile continua em modo Supabase direto (`apps/mobile/src/lib/
> data.ts`), exatamente como está hoje. Nada aqui altera o app rodando no
> Expo Go. Ver `docs/supabase-direct-mode.md` para o modo atual.

---

## O que é `@supabase/server`

É um SDK server-side da Supabase para escrever handlers (Edge Functions,
rotas de um backend Express, etc.) que falam com o banco de forma segura,
com três modos de autenticação possíveis por handler:

- **`auth: "user"`** — o handler roda no contexto de um usuário autenticado.
  Exige um JWT válido (Bearer token) no request. `ctx.supabase` respeita RLS
  como esse usuário — não é admin, não contorna políticas de segurança.
- **`auth: "publishable"`** — usa a chave pública (anon/publishable), sem
  identidade de usuário. Útil para endpoints públicos de leitura.
- **`auth: "secret"`** — usa a chave secreta (service role), com acesso
  administrativo total, ignorando RLS. Só para operações que
  *precisam* ignorar RLS (ex: tarefas de manutenção, agregações entre
  usuários). Uso raro e deliberado.
- **`auth: "none"`** — sem verificação de JWT alguma no handler. Geralmente
  combinado com `verify_jwt = false` no `config.toml` (ver seção 10).

O helper `withSupabase(options, handler)` cuida de extrair o JWT do request,
validar contra o `SUPABASE_JWKS_URL`, e popular `ctx.supabase` já configurado
para o modo escolhido — o handler não precisa lidar com isso manualmente.

---

## Quando usar isto (e quando não usar)

**Use `@supabase/server` quando precisar de:**
- Operações que devem ignorar RLS deliberadamente (ex: um cron job que
  agrega dados de todos os usuários para um relatório).
- Lógica de negócio que não deve ficar no cliente (ex: cálculos que
  determinam o que um usuário pode ou não fazer, validados server-side).
- Autenticação real de usuário (JWT) antes de tocar no banco — o que o modo
  atual do mobile não tem (usa `user_test_1` fixo).
- Operações admin que exigem a `service role key`, que nunca pode estar no
  cliente.

**Não use isto agora porque:**
- O LoopOS v0.1 ainda está em validação visual de 7 dias com um único
  usuário de teste — não há autenticação real para gerar JWTs de usuário.
- Adicionar uma camada server-side agora reintroduziria a complexidade que
  o modo Supabase direto foi criado para evitar (ver
  `docs/supabase-direct-mode.md`).

---

## Diferença: Supabase direto no mobile vs. server handlers

| | Supabase direto (atual) | `@supabase/server` (futuro) |
|---|---|---|
| Onde roda | No próprio app (React Native) | Edge Function / backend |
| Chave usada | `anon`/`publishable` (pública, segura no cliente) | `publishable`, `secret`, ou JWT de usuário, conforme o modo |
| RLS | Desativado (ver `supabase/schema.sql`) | Respeitado (`auth: "user"`) ou ignorado deliberadamente (`auth: "secret"`) |
| Autenticação | `EXPO_PUBLIC_USER_ID` fixo, sem login real | JWT real validado contra `SUPABASE_JWKS_URL` |
| Lógica de negócio | Vive no mobile (`data.ts`) | Pode viver no servidor, fora do alcance do cliente |
| Quando usar | Validação visual, prototipagem rápida | Produção, multi-usuário real, operações sensíveis |

O modo atual prioriza velocidade de iteração visual. O modo futuro prioriza
segurança e corretude para uso real com múltiplos usuários.

---

## Quais env vars são server-side

Todas as variáveis em
[`supabase/functions/examples/with-supabase/.env.example`](../supabase/functions/examples/with-supabase/.env.example)
são **exclusivamente server-side**:

```env
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=
```

Note a ausência do prefixo `EXPO_PUBLIC_` — isso é proposital. Qualquer
variável com esse prefixo é embutida no bundle JS do app e fica visível a
qualquer pessoa que inspecionar o app instalado. Variáveis sem esse prefixo
não existem no bundle mobile; só existem em ambientes server-side (Edge
Functions, processos Node, etc.).

---

## Por que `SUPABASE_SECRET_KEY` nunca vai para o Expo/React Native

A `secret key` (service role key) ignora RLS — qualquer código que a possua
tem acesso de leitura e escrita irrestrito a todas as tabelas, de todos os
usuários, sem nenhuma política de segurança aplicada.

Um app mobile, mesmo compilado, **não é um ambiente confiável**: o bundle
JS pode ser extraído, descompilado, e inspecionado por qualquer pessoa com
o `.apk` em mãos. Qualquer string embutida no bundle — incluindo
`EXPO_PUBLIC_*` — deve ser tratada como pública.

Por isso:
- A `anon`/`publishable` key é **projetada** para ser pública — ela só
  funciona dentro dos limites que RLS permitir.
- A `secret` key **nunca** deve estar em uma variável `EXPO_PUBLIC_*`, nunca
  em um arquivo dentro de `apps/mobile/`, e nunca em nenhum lugar que vire
  parte do bundle JS distribuído.

Esta é a razão estrutural pela qual `@supabase/server` só pode existir em
código que roda em um ambiente que você controla e que nunca é distribuído
ao usuário final — Edge Functions, um backend, ou scripts locais.

---

## Como isso entra depois da validação visual

Não é uma migração de uma vez só. A sequência natural, quando chegar a
hora:

1. **Concluir a validação de 7 dias** no modo Supabase direto atual — ver
   `docs/validation-7-days.md`. Esse modo continua sendo a fonte da verdade
   até lá.
2. **Decidir o caminho de autenticação real** (Supabase Auth, conforme já
   planejado no ADR-013 em `docs/decisions.md`) — isso é o que vai gerar os
   JWTs de usuário que `auth: "user"` exige.
3. **Ativar RLS** nas tabelas (instruções já deixadas comentadas no fim de
   `supabase/schema.sql`).
4. **Escrever os handlers reais**, usando o exemplo deste documento como
   ponto de partida, um por endpoint que hoje vive em `data.ts` ou em
   `server/src/modules/`.
5. **Migrar o mobile** de `data.ts` (Supabase direto) para chamar esses
   handlers — ou voltar a usar `server/` (Express + Prisma), dependendo de
   qual caminho fizer mais sentido na época.

Até lá, este documento e o exemplo em
`supabase/functions/examples/with-supabase/` ficam como referência isolada,
sem nenhum efeito sobre o app rodando hoje.
