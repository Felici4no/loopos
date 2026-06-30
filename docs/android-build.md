# LoopOS — Build Android (APK de preview)

Guia para rodar o LoopOS no Expo Go durante o desenvolvimento e gerar uma APK
de preview instalável em qualquer Android, sem depender da Play Store.

> Pré-requisito: a API precisa estar rodando e acessível na sua rede antes de
> testar no Expo Go ou instalar a APK. Veja `README.md` para subir o backend
> com Prisma + Supabase.

---

## 1. Configurar `apps/mobile/.env`

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

Edite `apps/mobile/.env`:

```env
EXPO_PUBLIC_USER_ID=user_test_1
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3333
```

### Por que não usar `localhost`

`localhost` em um celular físico aponta para o próprio celular, não para o seu
computador. O celular e o computador são dispositivos diferentes na rede — o
celular precisa do endereço IP real do computador para alcançá-lo.

Isso só não se aplica a emuladores, que rodam *dentro* do computador:

| Ambiente | `EXPO_PUBLIC_API_URL` |
|---|---|
| Emulador iOS (mesmo Mac) | `http://localhost:3333` |
| Emulador Android | `http://10.0.2.2:3333` (alias especial para o host) |
| **Celular físico** (Expo Go ou APK) | `http://SEU_IP_LOCAL:3333` |

### Como descobrir seu IP local

```bash
# macOS/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
# procure "Endereço IPv4" na sua rede Wi-Fi
```

O celular e o computador precisam estar na **mesma rede Wi-Fi**. Redes
corporativas ou com isolamento de cliente (AP isolation) podem bloquear essa
comunicação mesmo na mesma rede — nesse caso, use um hotspot pessoal como
alternativa.

---

## 2. Rodar a API localmente

```bash
pnpm --filter @loopos/server dev
```

Confirme que está respondendo antes de seguir:

```bash
curl http://localhost:3333/health
curl -H "x-user-id: user_test_1" http://localhost:3333/api/today
```

Se `/api/today` não responder com dados, pare aqui — a APK vai apresentar
loading infinito ou erro de conexão. Resolva a API primeiro.

---

## 3. Testar no Expo Go (antes de gerar APK)

```bash
pnpm --filter @loopos/mobile start
```

Escaneie o QR code com o app **Expo Go** (disponível na Play Store) no
celular físico, na mesma rede Wi-Fi do computador.

### Checklist mínimo antes de avançar para a APK

- [ ] Tela Hoje abre e carrega dados (não fica em loading infinito)
- [ ] Registrar um treino em Corpo funciona e aparece na lista
- [ ] Voltar para Hoje reflete o treino registrado
- [ ] Criar um livro e uma sessão em Leitura funciona
- [ ] Criar um tracker em Ritmo funciona
- [ ] Criar uma lista em Listas funciona

Se qualquer item falhar no Expo Go, **não gere a APK ainda**. A APK empacota
o mesmo JS bundle — qualquer erro aqui se repete lá, só que mais lento de
depurar (sem live reload, sem Metro logs no terminal).

---

## 4. Gerar a APK com EAS Build

O projeto não fixa `eas-cli` como dependência do monorepo — a Expo recomenda
sempre usar a versão mais recente via `npx`, evitando desalinhamento entre o
CLI instalado localmente e o que o servidor EAS espera.

### Login (uma vez por máquina)

```bash
npx eas-cli login
```

### Primeira execução — vincula o projeto ao EAS

```bash
cd apps/mobile
npx eas-cli init
```

Isso preenche `extra.eas.projectId` em `app.config.ts` automaticamente (não é
necessário editar manualmente).

### Gerar a APK de preview

```bash
cd apps/mobile
npx eas-cli build -p android --profile preview
```

Ou, usando o script já configurado no `package.json`:

```bash
pnpm --filter @loopos/mobile build:preview
```

O build roda nos servidores da Expo (gratuito dentro do plano free, com fila).
Ao final, o terminal mostra um link para baixar o `.apk` — ou acesse
[expo.dev](https://expo.dev), aba **Builds**, do seu projeto.

### Build local (opcional, mais rápido se seu ambiente já tem Android SDK)

```bash
npx eas-cli build -p android --profile preview --local
```

Requer Android SDK e Java configurados na máquina. Se não tiver certeza, use
o build remoto (sem `--local`) — é mais lento, mas não exige nada além do
Node instalado.

---

## 5. Instalar a APK no celular

1. Baixe o `.apk` pelo link gerado no passo anterior.
2. Transfira para o celular (cabo USB, link direto, ou Google Drive).
3. Abra o arquivo no celular — pode ser necessário permitir "instalar de
   fontes desconhecidas" nas configurações do Android.
4. Abra o app. Ele vai tentar se conectar ao `EXPO_PUBLIC_API_URL` que estava
   configurado **no momento do build** — esse valor fica embutido no bundle,
   não é lido em runtime.

### Importante: a API precisa estar acessível

A APK não roda nenhum servidor — ela só consome a API que você configurou no
`.env` antes do build. Isso significa:

- Se a API está rodando no seu computador (`pnpm --filter @loopos/server dev`),
  o celular só vai conseguir falar com ela enquanto **ambos estiverem na mesma
  rede Wi-Fi** e o computador estiver ligado com a API ativa.
- Se você sair dessa rede (4G, outra Wi-Fi), a APK vai falhar ao carregar
  dados — isso é esperado neste estágio do projeto, não é bug.
- Para uma APK que funcione em qualquer rede, a API precisaria estar deployada
  publicamente (Railway, Render, Fly.io, etc.) — isso está fora do escopo
  desta etapa e não foi feito.

---

## 6. Diferença entre `preview` (APK) e `production` (AAB)

| | `preview` | `production` |
|---|---|---|
| Formato | `.apk` | `.aab` (Android App Bundle) |
| Instalação | Direta, fora da loja | Apenas via Play Store |
| Uso | Testes manuais, distribuição informal | Publicação oficial |
| Assinatura | Gerenciada pela Expo (debug-like) | Requer keystore de produção |

Para o teste de validação de 7 dias e qualquer instalação manual em
dispositivos de teste, **sempre use o profile `preview`**. O profile
`production` gera um `.aab`, que não pode ser instalado diretamente — ele
existe apenas para submissão à Play Store, o que está fora do escopo atual.

---

## Resumo de comandos

```bash
# 1. Configurar
cp apps/mobile/.env.example apps/mobile/.env
# editar com EXPO_PUBLIC_API_URL=http://SEU_IP:3333

# 2. Rodar API
pnpm --filter @loopos/server dev

# 3. Testar no Expo Go
pnpm --filter @loopos/mobile start

# 4. Gerar APK (após validar no Expo Go)
npx eas-cli login
cd apps/mobile && npx eas-cli init
pnpm --filter @loopos/mobile build:preview
```
