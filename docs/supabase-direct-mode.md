# LoopOS — Modo Supabase Direto

> ⚠️ **Isto é um modo de validação visual temporário, não a arquitetura de
> produção.** O backend Express + Prisma (`server/`) continua sendo o plano
> para produção e **fica congelado, não deletado**, enquanto este modo está
> em uso.

---

## Por que este modo existe

O ambiente onde o código deste projeto vinha sendo gerado e revisado não
tinha acesso de rede ao `binaries.prisma.sh` (necessário para `prisma
generate`/`migrate`) nem Android SDK/emulador. Isso bloqueava qualquer
validação visual do app — não dava para confirmar se as telas abriam, se os
dados apareciam, se os fluxos funcionavam.

A decisão: trocar temporariamente o caminho dos dados de

```
Mobile → API Express → Prisma → Supabase
```

para

```
Mobile → Supabase direto (via @supabase/supabase-js)
```

Isso elimina a dependência do Prisma engine e do servidor Express rodando
localmente — o app fala direto com o banco. O objetivo é único: abrir o app
no Expo Go, ver as telas, e confirmar que os dados são salvos e lidos de
verdade no Supabase.

---

## O que NÃO mudou

- O schema de dados é o mesmo (mesmas tabelas, mesmos campos, só que em SQL
  puro em vez de Prisma).
- As telas mobile não foram redesenhadas — só trocaram de onde buscam os
  dados (`src/lib/api.ts` → `src/lib/data.ts`).
- Nenhuma feature nova foi adicionada.
- O backend `server/` continua no repositório, intacto, pronto para ser
  reativado quando o ambiente de desenvolvimento permitir rodar o Prisma
  normalmente (ou em produção, onde isso não é um problema).

---

## Como criar as tabelas no Supabase

1. Abra o painel do seu projeto Supabase → **SQL Editor**.
2. Cole o conteúdo de [`supabase/schema.sql`](../supabase/schema.sql) e
   execute (Run).
3. Confirme que as 7 tabelas foram criadas em **Table Editor**: `users`,
   `workout_entries`, `trackers`, `tracker_events`, `books`,
   `reading_sessions`, `list_nodes`.

### Sobre RLS (Row Level Security)

O `schema.sql` **não ativa RLS**. Isso significa que qualquer pessoa com a
chave `anon` consegue ler e escrever em qualquer linha de qualquer usuário.

Isso é aceitável **apenas** porque:
- Há um único usuário de teste (`user_test_1`).
- O propósito é validação visual pessoal, não um produto com usuários reais.

**Isso não é seguro para produção.** Antes de qualquer uso com dados reais
de terceiros, RLS precisa ser ativado (instruções comentadas no fim do
`schema.sql`) ou o projeto precisa voltar para o modo API Express com
autenticação real (ver ADR-013 em `docs/decisions.md`).

---

## Como rodar o seed

No mesmo **SQL Editor** do Supabase, cole e execute o conteúdo de
[`supabase/seed.sql`](../supabase/seed.sql).

O seed cria:
- Usuário `user_test_1` (`lucas@test.loopos.local`)
- Um treino de hoje (`10km 4x11`)
- Dois trackers (`Meditação` boolean, `Água` count) com eventos de hoje
- Um livro em andamento com uma sessão de leitura de hoje
- Uma lista `Compras` → item `Ovos` → subitem `Orgânicos`

O `seed.sql` usa `current_date`, então os registros sempre aparecem na data
em que você rodar o seed — rode de novo se passar muito tempo entre criar
o banco e testar o app.

O seed não é totalmente idempotente: rodar duas vezes não duplica o
usuário (usa `ON CONFLICT`), mas duplica treinos, trackers, eventos, etc.
Para resetar antes de rodar de novo:

```sql
truncate table list_nodes, reading_sessions, books, tracker_events,
  trackers, workout_entries, users cascade;
```

---

## Como configurar o `.env` do mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...sua-anon-key...
EXPO_PUBLIC_USER_ID=user_test_1
```

Pegue a URL e a `anon` key em **Project Settings → API** no painel do
Supabase. **Nunca use a `service_role` key no mobile** — ela ignora RLS e
dá acesso total ao banco; deve ficar só em ambientes de servidor confiáveis
(e, mesmo lá, não é usada neste projeto).

---

## Como abrir no Expo Go

```bash
pnpm install
pnpm --filter @loopos/mobile start
```

Escaneie o QR code com o app **Expo Go** no celular, na mesma rede Wi-Fi ou
em qualquer rede com internet — diferente do modo API Express, **não há
dependência de IP local nem de rede compartilhada com um servidor seu**: o
celular fala direto com o Supabase, que é público na internet.

Isso é, inclusive, uma vantagem prática deste modo: funciona em qualquer
rede, não só na mesma Wi-Fi do computador.

---

## O que testar

Ver [`docs/visual-checklist.md`](visual-checklist.md) para o roteiro
completo. Resumo: abrir Hoje, registrar um treino em Corpo, criar um
tracker em Ritmo, cadastrar um livro e sessão em Leitura, criar uma lista
em Listas — confirmando que cada ação salva no Supabase e reflete de volta
no app.

---

## Quando voltar para o modo API Express

Quando o ambiente de desenvolvimento permitir rodar `prisma generate` sem
bloqueio de rede (ou ao migrar para produção com deploy real do backend):

1. Trocar as 5 telas de `src/lib/data.ts` de volta para `src/lib/api.ts`
   (mesmas assinaturas de função, troca é direta).
2. Reativar `EXPO_PUBLIC_API_URL` no `.env` do mobile.
3. Seguir `docs/local-visual-run.md` para subir o backend Express
   normalmente.
4. Avaliar se RLS deve ser ativado no Supabase mesmo usando o backend
   (boa prática de defesa em profundidade, mesmo com auth no servidor).

O backend Express não precisou de nenhuma mudança para isso ser possível —
ele ficou parado, não foi modificado.
