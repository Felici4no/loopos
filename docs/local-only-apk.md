# LoopOS — Modo Local-Only (APK Android)

O app agora roda **100% offline**, sem servidor, sem Supabase, sem `.env`.
Todos os dados ficam no próprio aparelho via AsyncStorage.

> O backend Express (`server/`) e os arquivos Supabase (`supabase/`,
> `apps/mobile/src/lib/supabase.ts`, `apps/mobile/src/lib/data-supabase.ts`)
> **continuam no repositório** — não foram deletados. São o caminho para
> produção, após a validação do app.

---

## Por que local-only

Cada tentativa anterior de rodar o app dependia de algo externo:
- Backend Express → precisava de Prisma engine bloqueado no sandbox
- Supabase direto → precisava configurar URL, anon key, rodar SQL, etc.

Local-only elimina todas essas dependências. O app abre, mostra dados do
seed, e você pode registrar informações reais — sem configurar nada.

---

## Como funciona o armazenamento

```
AsyncStorage (on-device)
  └─ @loopos/local-db-v1  (JSON de todo o banco)
       ├─ workoutEntries[]
       ├─ trackers[]
       ├─ trackerEvents[]
       ├─ books[]
       ├─ readingSessions[]
       └─ listNodes[]
```

Arquivos envolvidos:
- `src/lib/localStore.ts` — wrapper genérico sobre AsyncStorage (get/set/clear)
- `src/lib/localIds.ts` — gerador de IDs locais (`workout_1730000000000_ab12`)
- `src/lib/localDb.ts` — schema, seed, getDb(), saveDb(), resetDbWithSeed()
- `src/lib/data.ts` — API pública (getToday, createWorkout, etc.) usando o banco local

---

## Limitações

- **Dados ficam só no aparelho.** Sem sync, sem backup automático.
- **Desinstalar o app apaga tudo.** O AsyncStorage é ligado ao app — remover o app remove os dados.
- **Sem multi-dispositivo.** Dados registrados no celular não aparecem em outro celular.
- **IDs locais não são UUIDs reais.** Formato `{prefix}_{timestamp}_{4chars}` — funciona para uso local, mas precisaria de migração se/quando sincronizar com um banco remoto.
- **Sem autenticação.** Todos os dados são de `user_test_1`. Não há separação por usuário.
- **getToday** filtra listas raiz por `updatedAt.startsWith(date)` — como o ISO timestamp começa com a data, isso funciona para datas locais, mas pode falhar se o dispositivo estiver em UTC e o dia mudar antes da meia-noite local.

---

## Como resetar os dados

Na tela **Hoje**, canto superior direito, há um botão discreto **"↺ seed"**.

Ao tocar:
1. Um Alert de confirmação aparece ("Resetar dados de teste")
2. Confirmar apaga todos os dados locais
3. O seed é recriado (treino, trackers, livro, lista)
4. A tela Hoje recarrega

Também pode ser chamado programaticamente:
```ts
import { resetDbWithSeed } from './src/lib/localDb';
await resetDbWithSeed();
```

---

## Como rodar no Expo Go

```bash
pnpm install
pnpm --filter @loopos/mobile start
```

Nenhum `.env` necessário. Escanear o QR code com Expo Go — o app abre com
os dados do seed já carregados (criados automaticamente na primeira
abertura do AsyncStorage vazio).

---

## Como gerar a APK

```bash
# Login no EAS (uma vez por máquina)
npx eas-cli login

# Vincular projeto (uma vez por projeto)
cd apps/mobile && npx eas-cli init

# Gerar APK de preview
pnpm --filter @loopos/mobile build:preview
# ou: cd apps/mobile && npx eas-cli build -p android --profile preview
```

A APK gerada funciona **sem internet** para salvar/ler dados locais. Só
precisa de internet se você quiser usar as funcionalidades futuras de
Supabase (não ativas ainda).

---

## Build gerada

Primeira APK funcional do v0.1, gerada em **2026-07-02**:

| Campo | Valor |
|-------|-------|
| Build ID | `fee5e3a8-048e-4b49-a771-1bd7b2b285fe` |
| Status | ✅ FINISHED |
| Profile | `preview` (`buildType: apk`) |
| Commit | `ed4fec1` |
| Comando | `eas build -p android --profile preview --non-interactive` (em `apps/mobile`) |
| Página do build | https://expo.dev/accounts/felici4nos-team/projects/loopos/builds/fee5e3a8-048e-4b49-a771-1bd7b2b285fe |
| Download APK | https://expo.dev/artifacts/eas/eVKhQErg5ByzsxBjd2UfhhuTiOlZbVeKEf9rQLLOOB4.apk |
| Expira no EAS | 2026-07-16 (baixe antes) |

### Correções que destravaram o build

1. **`.npmrc` com `node-linker=hoisted`** — o layout isolado do pnpm
   impedia o Gradle de resolver `@react-native/gradle-plugin`
   (dependência transitiva do react-native). Após mudar o linker,
   delete todos os `node_modules` antes do `pnpm install` para não
   ficar com layout misto.
2. **`apps/mobile/metro.config.js`** — o Metro não resolvia imports
   relativos com extensão `.js` apontando para `.ts/.tsx` (convenção
   NodeNext do repo) nem o `@loopos/shared` fora do projectRoot.
   Pré-validação local sem gastar build: `npx expo export -p android`.

### Limitações desta build

- **Dados 100% no aparelho** (AsyncStorage). Desinstalar o app — ou
  limpar os dados nas configurações do Android — **apaga tudo, sem
  backup**. Não há exportação nem sync nesta versão.
- Supabase e o server Express **não** participam desta build; seguem no
  repositório apenas como caminho futuro.
- Keystore gerado e armazenado pelo EAS (`Build Credentials sHh3l3q937`);
  nenhuma credencial commitada no repositório.
- Distribuição `internal`: instale habilitando "fontes desconhecidas";
  não é build de Play Store (para isso, profile `production`/AAB).

---

## Caminho para integrar Supabase depois

Quando o app estiver validado após 7 dias de uso real
(`docs/validation-7-days.md`), a migração é direta:

1. Adicionar `@supabase/supabase-js` e `react-native-url-polyfill` de volta
   em `apps/mobile/package.json`.
2. Reativar `src/lib/supabase.ts` (código está comentado, não deletado).
3. Criar tabelas no Supabase (`supabase/schema.sql`) e rodar seed
   (`supabase/seed.sql`).
4. Reescrever `src/lib/data.ts` para usar Supabase (ou o `data.ts` anterior
   via modo Supabase direto ainda existe no histórico do git).
5. Configurar `.env` com `EXPO_PUBLIC_SUPABASE_URL` e
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
