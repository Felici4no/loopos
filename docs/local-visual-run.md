# LoopOS — Rodar localmente para visualização

Guia direto para subir banco, API e mobile na sua máquina e ver o LoopOS
funcionando de verdade. Use isto junto com `docs/android-build.md` quando
quiser gerar uma APK depois de validar visualmente no Expo Go.

> Este documento descreve comandos para você rodar **localmente**. O
> ambiente onde o código é gerado (sandbox) não tem acesso de rede ao
> Prisma nem Android SDK/emulador — não é possível abrir o app aqui. Ver
> seção "Limitações do ambiente de geração" no fim deste documento.

---

## 1. Instalar dependências

```bash
pnpm install
```

## 2. Configurar o banco

```bash
cp server/.env.example server/.env
```

Edite `server/.env` com as credenciais do seu projeto Supabase
(**Project Settings → Database** no painel do Supabase):

```env
DATABASE_URL="postgresql://postgres.[ref]:[senha]@[host].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[senha]@[host].pooler.supabase.com:5432/postgres"
PORT=3333
NODE_ENV=development
```

`DATABASE_URL` usa o **pooler** (porta 6543, modo transaction) para queries
normais da aplicação. `DIRECT_URL` usa a **conexão direta** (porta 5432),
necessária porque migrations precisam de uma conexão que suporte `prepared
statements`, o que o pooler em modo transaction não garante.

Nunca commite `server/.env` — ele já está no `.gitignore`.

## 3. Criar as tabelas e popular com dados de teste

```bash
pnpm --filter @loopos/server prisma:generate
pnpm --filter @loopos/server prisma:migrate
pnpm --filter @loopos/server prisma:seed
```

No `prisma:migrate`, quando perguntado o nome da migration, use algo como
`init_v0_1`.

O seed cria o usuário `user_test_1` com dados de exemplo em todos os
módulos: um treino de hoje, dois trackers com eventos, um livro com sessão
de leitura, e uma lista com item e subitem. Rodar o seed mais de uma vez
não duplica os dados (usa `upsert`).

## 4. Subir a API

```bash
pnpm --filter @loopos/server dev
```

Deixe rodando neste terminal. Abra um novo terminal para os próximos passos.

## 5. Validar a API por linha de comando

```bash
curl http://localhost:3333/health
```
Esperado: `{"status":"ok","service":"loopos-api",...}`

```bash
curl -H "x-user-id: user_test_1" http://localhost:3333/api/debug/me
```
Esperado: dados do usuário `user_test_1` com contagem de registros por módulo.

```bash
curl -H "x-user-id: user_test_1" http://localhost:3333/api/today
```
Esperado (resumido, valores reais variam conforme a data e o seed):
```json
{
  "date": "2026-06-30",
  "workouts": [{ "rawInput": "10km 4x11", "runKm": 10, ... }],
  "rhythm": [{ "eventType": "check", "tracker": { "title": "Meditação" } }, ...],
  "reading": [{ "pagesRead": 22, "book": { "title": "..." } }],
  "lists": [{ "title": "Leituras 2025", "nodeType": "LIST" }]
}
```

Se `/api/today` não retornar dados, confira se o seed rodou sem erro e se a
data do seed bate com a data atual do seu sistema — os registros do seed
usam a data de hoje no momento em que o seed foi executado.

## 6. Configurar e rodar o mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env`:

```env
EXPO_PUBLIC_USER_ID=user_test_1
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3333
```

**Para celular físico, não use `localhost`.** O celular é um dispositivo
diferente do computador na rede — `localhost` no celular aponta para ele
mesmo, não para a sua máquina. Use o IP local da máquina:

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```

O celular precisa estar na mesma rede Wi-Fi do computador.

Para emuladores, há atalhos: `http://localhost:3333` no emulador iOS (mesmo
Mac) e `http://10.0.2.2:3333` no emulador Android.

```bash
pnpm --filter @loopos/mobile start
```

Escaneie o QR code exibido no terminal com o app **Expo Go** (disponível na
Play Store / App Store).

## 7. Checklist visual

Ver `docs/visual-checklist.md` para o roteiro completo de validação manual
em cada módulo.

---

## Limitações do ambiente de geração deste código

Este guia foi escrito para você rodar **na sua máquina**. O ambiente onde o
código foi gerado e revisado (sandbox usado pelo assistente) tem duas
limitações que impedem qualquer validação visual a partir dali:

1. **Rede bloqueada para o Prisma.** O domínio `binaries.prisma.sh`, de onde
   o Prisma baixa o engine nativo necessário para `generate`/`migrate`, não
   está acessível nesse sandbox (`403 Forbidden`, `host_not_allowed`). Sem o
   engine, o `PrismaClient` não pode ser instanciado e a API não sobe.
2. **Sem Android SDK, emulador ou Expo Go instalados.** Mesmo que a API
   subisse, não há como abrir o app mobile visualmente nesse ambiente — não
   existe tela, emulador nem cliente Expo Go disponível ali.

Por isso, qualquer validação visual do LoopOS — telas abrindo, dados
aparecendo, fluxos funcionando — só pode ser confirmada rodando os comandos
deste documento na sua própria máquina, com seu próprio Supabase configurado
e seu próprio celular ou emulador.
