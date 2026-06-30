# LoopOS — Roadmap

---

## v0.1 — Fundação (atual)
**Meta: 7 dias de uso contínuo sem abandono.**

- [ ] App mobile com os 5 módulos funcionais: Hoje, Corpo, Ritmo, Leitura, Listas.
- [ ] API Express com endpoints CRUD para cada módulo.
- [ ] Banco PostgreSQL com Prisma, schema completo e migrations.
- [ ] Autenticação básica (email/senha ou magic link via Supabase Auth).
- [ ] Navegação entre módulos via bottom tab.
- [ ] Persistência offline-first básica (cache local com sync).

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
