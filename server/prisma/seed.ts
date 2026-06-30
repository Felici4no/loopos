/**
 * LoopOS — Seed de desenvolvimento
 *
 * Cria dados mínimos para validação end-to-end da API.
 * Usuário fixo: user_test_1 (autenticado via x-user-id: user_test_1)
 *
 * Idempotente: usa upsert/createMany com skipDuplicates onde possível.
 * Pode ser rodado múltiplas vezes sem duplicar dados críticos.
 *
 * Rodar: pnpm --filter @loopos/server prisma:seed
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { todayISO } from '../../packages/shared/src/date/index.js';

const prisma = new PrismaClient({ log: ['warn', 'error'] });

const USER_ID = 'user_test_1';
const TODAY = todayISO();

async function main() {
  console.log(`[seed] Iniciando seed para data: ${TODAY}`);

  // ─── User ──────────────────────────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where: { id: USER_ID },
    update: { name: 'Lucas Test', email: 'lucas@test.loopos.local' },
    create: {
      id: USER_ID,
      email: 'lucas@test.loopos.local',
      name: 'Lucas Test',
    },
  });
  console.log(`[seed] User: ${user.id} (${user.email})`);

  // ─── Body: WorkoutEntry ────────────────────────────────────────────────────
  const workout = await prisma.workoutEntry.upsert({
    where: { id: 'seed_workout_1' },
    update: { date: TODAY, rawInput: '10km 4x11', runKm: 10, pullupSets: 4, pullupReps: 11 },
    create: {
      id: 'seed_workout_1',
      userId: USER_ID,
      date: TODAY,
      rawInput: '10km 4x11',
      runKm: 10,
      pullupSets: 4,
      pullupReps: 11,
      notes: 'Treino seed — corrida + pullups',
    },
  });
  console.log(`[seed] WorkoutEntry: ${workout.id} (${workout.date})`);

  // ─── Rhythm: Trackers ──────────────────────────────────────────────────────
  const trackerMeditation = await prisma.tracker.upsert({
    where: { id: 'seed_tracker_meditation' },
    update: { title: 'Meditação', type: 'boolean', isActive: true },
    create: {
      id: 'seed_tracker_meditation',
      userId: USER_ID,
      title: 'Meditação',
      type: 'boolean',
      isActive: true,
    },
  });

  const trackerNoSugar = await prisma.tracker.upsert({
    where: { id: 'seed_tracker_no_sugar' },
    update: { title: 'Dias sem açúcar', type: 'count', target: 30, isActive: true },
    create: {
      id: 'seed_tracker_no_sugar',
      userId: USER_ID,
      title: 'Dias sem açúcar',
      type: 'count',
      target: 30,
      isActive: true,
    },
  });
  console.log(`[seed] Trackers: ${trackerMeditation.title}, ${trackerNoSugar.title}`);

  // ─── Rhythm: TrackerEvents ─────────────────────────────────────────────────
  const eventMeditation = await prisma.trackerEvent.upsert({
    where: { id: 'seed_event_meditation_today' },
    update: { date: TODAY },
    create: {
      id: 'seed_event_meditation_today',
      trackerId: trackerMeditation.id,
      userId: USER_ID,
      date: TODAY,
      eventType: 'check',
      note: 'Meditação matinal — 15min',
    },
  });

  const eventNoSugar = await prisma.trackerEvent.upsert({
    where: { id: 'seed_event_no_sugar_today' },
    update: { date: TODAY },
    create: {
      id: 'seed_event_no_sugar_today',
      trackerId: trackerNoSugar.id,
      userId: USER_ID,
      date: TODAY,
      eventType: 'value',
      value: 3,
      note: 'Dia 3 do ciclo',
    },
  });
  console.log(`[seed] TrackerEvents: ${eventMeditation.id}, ${eventNoSugar.id}`);

  // ─── Reading: Book ─────────────────────────────────────────────────────────
  const book = await prisma.book.upsert({
    where: { id: 'seed_book_1' },
    update: { currentPage: 142 },
    create: {
      id: 'seed_book_1',
      userId: USER_ID,
      title: 'A Psicologia Financeira',
      author: 'Morgan Housel',
      totalPages: 256,
      currentPage: 142,
      status: 'READING',
      startedAt: new Date(new Date().setDate(new Date().getDate() - 7)),
    },
  });
  console.log(`[seed] Book: "${book.title}" (p.${book.currentPage ?? 0}/${book.totalPages ?? '?'})`);

  // ─── Reading: ReadingSession ───────────────────────────────────────────────
  const session = await prisma.readingSession.upsert({
    where: { id: 'seed_session_1' },
    update: { date: TODAY },
    create: {
      id: 'seed_session_1',
      userId: USER_ID,
      bookId: book.id,
      date: TODAY,
      pagesRead: 22,
      fromPage: 121,
      toPage: 142,
      note: 'Capítulo sobre viés de confirmação',
    },
  });
  console.log(`[seed] ReadingSession: ${session.id} (${session.fromPage}–${session.toPage})`);

  // ─── Lists: ListNodes hierárquicos ─────────────────────────────────────────
  // Estrutura:
  //   [LIST] Leituras 2025  (raiz, parentId = null)
  //     [ITEM] Não ficção   (filho da lista)
  //       [ITEM] Psicologia Financeira  (subitem — profundidade 2)

  const rootList = await prisma.listNode.upsert({
    where: { id: 'seed_list_root' },
    update: { title: 'Leituras 2025' },
    create: {
      id: 'seed_list_root',
      userId: USER_ID,
      parentId: null,
      title: 'Leituras 2025',
      nodeType: 'LIST',
      position: 0,
      isDone: false,
    },
  });

  const itemNonFiction = await prisma.listNode.upsert({
    where: { id: 'seed_list_item_nonfiction' },
    update: { title: 'Não ficção' },
    create: {
      id: 'seed_list_item_nonfiction',
      userId: USER_ID,
      parentId: rootList.id,
      title: 'Não ficção',
      nodeType: 'ITEM',
      position: 0,
      isDone: false,
    },
  });

  const subItem = await prisma.listNode.upsert({
    where: { id: 'seed_list_subitem_psych' },
    update: { title: 'A Psicologia Financeira — Morgan Housel' },
    create: {
      id: 'seed_list_subitem_psych',
      userId: USER_ID,
      parentId: itemNonFiction.id,
      title: 'A Psicologia Financeira — Morgan Housel',
      content: 'p.142/256 — em andamento',
      nodeType: 'ITEM',
      position: 0,
      isDone: false,
    },
  });
  console.log(`[seed] ListNodes: "${rootList.title}" → "${itemNonFiction.title}" → "${subItem.title}"`);

  console.log('\n[seed] ✓ Seed concluído com sucesso.');
  console.log(`[seed] Testar com: curl -H "x-user-id: ${USER_ID}" http://localhost:3333/api/today`);
}

main()
  .catch((err) => {
    console.error('[seed] Erro:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
