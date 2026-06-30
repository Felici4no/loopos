# LoopOS — Roadmap

---

## v0.1 — Fundação (em andamento)
**Meta: 7 dias de uso contínuo sem abandono.**

- [x] Monorepo pnpm + Turborepo + TypeScript strict
- [x] Prisma schema v0.1 com todos os modelos
- [x] API Express com CRUDs de Corpo, Ritmo, Leitura, Listas
- [x] GET /api/today como agregação real (sem daily_entries)
- [x] Seed de desenvolvimento com user_test_1
- [x] **App mobile base com navegação 5 abas**
- [x] **Tela Hoje funcional consumindo /api/today**
- [ ] Autenticação real (Supabase Auth)
- [ ] Telas CRUD completas dos 4 módulos
- [ ] Persistência offline-first básica

---

## v0.2 — Acesso rápido
**Meta: registrar dados em menos de 10 segundos a partir da home screen.**

- [ ] Widget Android para registro rápido de hábitos (Ritmo).
- [ ] Widget Android para registro rápido de treino (Corpo).
- [ ] Atalho de teclado para entrada rápida no módulo Hoje.
- [ ] Notificações diárias configuráveis (lembrete de registro).

---

## v0.3 — Dashboard web
**Meta: visualização histórica dos dados registrados no mobile.**

- [ ] Dashboard Next.js com autenticação.
- [ ] Visualizações por módulo: calendário, gráficos de frequência, histórico de leitura.
- [ ] Exportação de dados (CSV, JSON).
- [ ] Configurações de conta e preferências.

---

## v0.4 — Bot Telegram
**Meta: registrar dados via chat sem abrir o app.**

- [ ] Bot Telegram integrado à API.
- [ ] Comandos para registro em cada módulo: `/treino`, `/habito`, `/livro`.
- [ ] Resumo diário automático via Telegram.

---

## v0.5 — Inteligência e automações
**Meta: o LoopOS começa a devolver insights, não só armazenar dados.**

- [ ] Alertas inteligentes (ex: "Você não treinou há 5 dias").
- [ ] Resumos semanais automáticos (texto gerado com LLM).
- [ ] Correlações simples entre módulos (ex: treino × humor).
- [ ] Sugestões contextuais baseadas em padrões históricos.

---

## Fora do escopo até v0.5
- Social features ou compartilhamento de dados.
- Sincronização com wearables.
- Marketplace de módulos.
- Planos pagos / monetização.
