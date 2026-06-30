# LoopOS — Checklist Técnico do MVP v0.1

Checklist de fechamento técnico antes de iniciar a validação de 7 dias.
Ver `docs/validation-7-days.md` para o protocolo de uso real.

---

## Backend

- [x] Prisma schema com todos os modelos da v0.1 (User, WorkoutEntry, Tracker, TrackerEvent, Book, ReadingSession, ListNode)
- [x] Migrations rodando em PostgreSQL/Supabase real
- [x] Zod validando todos os payloads de entrada (create/update)
- [x] Error handler global padronizado (`{ error: { message, code } }`)
- [x] `GET /health` respondendo
- [x] `GET /api/today` como agregação real, sem tabela `daily_entries`
- [x] `GET /api/today?date=` aceitando data específica do cliente
- [x] CRUD completo: Corpo (workouts)
- [x] CRUD completo: Ritmo (trackers + events)
- [x] CRUD completo: Leitura (books + sessions)
- [x] CRUD completo: Listas (nodes recursivos)
- [x] Isolamento por `userId` em todos os handlers (nenhum endpoint vaza dados de outro usuário)
- [x] `onDelete: Cascade` configurado em todas as relações dependentes
- [x] Seed de desenvolvimento (`user_test_1` + dados de exemplo)
- [ ] Unique constraint `(tracker_id, user_id, date)` — **pendência conhecida, não bloqueante** (ver ADR-015)

## Mobile

- [x] Navegação com 5 abas (Hoje, Corpo, Ritmo, Leitura, Listas)
- [x] Cliente HTTP único (`src/lib/api.ts`) com tratamento de erro padronizado
- [x] `EXPO_PUBLIC_API_URL` configurável via `.env`
- [x] Header `x-user-id` enviado em todas as chamadas autenticadas
- [x] Tela Hoje consumindo `/api/today` com dados reais
- [x] Tela Hoje recarrega ao ganhar foco (`useFocusEffect`)
- [x] Módulo Corpo: registro via parser local, histórico, delete
- [x] Módulo Ritmo: trackers, eventos, streak local, anti-duplicidade no cliente
- [x] Módulo Leitura: biblioteca, sessões, progresso calculado
- [x] Módulo Listas: raiz → item → subitem (2 níveis), toggle done, delete com cascade
- [x] Todas as telas com estado de loading visível
- [x] Todas as telas com estado de erro + botão "Tentar novamente"
- [x] Estados vazios orientados à próxima ação (não genéricos)
- [x] Pull-to-refresh nas 5 telas principais

## Dados

- [x] Datas no formato `YYYY-MM-DD` consistente entre mobile e backend
- [x] `todayISO()` calcula data local corretamente (sem bug de timezone)
- [x] Nenhuma data hardcoded incorreta em docs, seed ou código
- [x] `/api/today` retorna arrays consistentes em todos os campos (workouts, rhythm, reading, lists)
- [x] Progresso de leitura (`currentPage`/`totalPages`) protegido contra divisão por zero

## UX

- [x] Hierarquia visual consistente entre telas (header, cards, botão de ação principal)
- [x] Botões destrutivos (excluir) sempre com confirmação via `Alert`
- [x] Feedback visual após criar/registrar (banner ou texto temporário)
- [x] Placeholder do input de Corpo orienta o formato esperado (`Ex: 10km 4x11`)
- [x] Cores consistentes: accent (violeta), success (verde), error (vermelho) em todas as telas
- [ ] Revisão de contraste em luz solar direta — **não testado, recomendado durante os 7 dias**

## Testes manuais

- [x] Fluxo Corpo: registrar `10km 4x11`, `4x11`, `10km` isoladamente — parser cobre os 3 casos
- [x] Fluxo Ritmo: criar boolean, marcar, tentar duplicar (bloqueado no cliente), criar count, registrar valor
- [x] Fluxo Leitura: criar livro, registrar sessão, verificar `currentPage` atualizado, excluir
- [x] Fluxo Listas: criar raiz, criar item, marcar feito, criar subitem, excluir item, excluir lista
- [x] Confirmar que excluir em qualquer módulo reflete em `/api/today` após reload
- [x] Confirmar que navegar entre abas e voltar para Hoje atualiza os dados

## Deploy / uso real

- [x] `.env.example` documentado para server e mobile
- [x] Instruções de IP local para celular físico (Android emulador vs físico vs iOS)
- [x] README com seção de setup completo
- [ ] App testado em dispositivo físico real (não apenas emulador) — **fazer antes ou durante os 7 dias**
- [ ] Banco de produção/staging separado do banco de desenvolvimento — **não configurado, usar o mesmo durante a validação**

## Pendências pós-v0.1 (não bloqueiam a validação de 7 dias)

- Supabase Auth substituindo `x-user-id` fixo (ADR-013)
- Unique constraint de banco para anti-duplicidade de eventos (ADR-015)
- Streak calculado no server para resumos automáticos futuros
- Filtro de trackers arquivados (`isActive: false`) na tela Ritmo
- Edição de campos de treino além de criar/excluir
- Histórico de sessões de leitura visível por livro (atualmente só nas últimas 10 via `getBook`)
- Reordenação manual de itens em Listas (campo `position` existe mas não é editável via UI)
- Dashboard web, widgets, Telegram, IA, notificações — todos fora de escopo até v0.2+
