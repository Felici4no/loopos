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
