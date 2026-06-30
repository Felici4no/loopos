/**
 * Banco de dados local do LoopOS — armazenado em JSON via AsyncStorage.
 *
 * Toda a persistência do modo local-only passa por aqui.
 * Supabase e o backend Express permanecem no repositório, mas não
 * são usados neste modo. Ver docs/local-only-apk.md.
 */

import { getLocalData, setLocalData, clearLocalData } from './localStore.js';
import { createLocalId } from './localIds.js';
import { todayISO } from '@loopos/shared';

import type { WorkoutEntry } from '../types/workout.js';
import type { Book, ReadingSession } from '../types/reading.js';
import type { Tracker, TrackerEvent } from '../types/rhythm.js';
import type { ListNode } from '../types/lists.js';

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface LocalDatabase {
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  workoutEntries: WorkoutEntry[];
  trackers: Tracker[];
  trackerEvents: TrackerEvent[];
  books: Book[];
  readingSessions: ReadingSession[];
  listNodes: ListNode[];
}

export const LOCAL_DB_KEY = '@loopos/local-db-v1';

export function createEmptyLocalDb(): LocalDatabase {
  return {
    users: [],
    workoutEntries: [],
    trackers: [],
    trackerEvents: [],
    books: [],
    readingSessions: [],
    listNodes: [],
  };
}

// ─── Seed ────────────────────────────────────────────────────────────────────

export function createSeedLocalDb(): LocalDatabase {
  const db = createEmptyLocalDb();
  const today = todayISO();
  const now = new Date().toISOString();

  // User
  db.users.push({
    id: 'user_test_1',
    email: 'lucas@test.loopos.local',
    name: 'Lucas Test',
    createdAt: now,
    updatedAt: now,
  });

  // Corpo — treino de hoje
  const workoutId = createLocalId('workout');
  db.workoutEntries.push({
    id: workoutId,
    userId: 'user_test_1',
    date: today,
    runKm: 10,
    pullupSets: 4,
    pullupReps: 11,
    rawInput: '10km 4x11',
    notes: 'Treino seed — corrida + pullups',
    createdAt: now,
    updatedAt: now,
  });

  // Ritmo — trackers
  const meditacaoId = createLocalId('tracker');
  const aguaId = createLocalId('tracker');

  db.trackers.push(
    {
      id: meditacaoId,
      userId: 'user_test_1',
      title: 'Meditação',
      type: 'boolean',
      target: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: aguaId,
      userId: 'user_test_1',
      title: 'Água',
      type: 'count',
      target: 8,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  );

  // Ritmo — eventos de hoje
  db.trackerEvents.push(
    {
      id: createLocalId('event'),
      userId: 'user_test_1',
      trackerId: meditacaoId,
      date: today,
      eventType: 'check',
      value: null,
      note: 'Meditação matinal — 15min',
      createdAt: now,
    },
    {
      id: createLocalId('event'),
      userId: 'user_test_1',
      trackerId: aguaId,
      date: today,
      eventType: 'value',
      value: 6,
      note: '6 copos hoje',
      createdAt: now,
    },
  );

  // Leitura — livro
  const bookId = createLocalId('book');
  const startedAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  db.books.push({
    id: bookId,
    userId: 'user_test_1',
    title: 'A Psicologia Financeira',
    author: 'Morgan Housel',
    totalPages: 256,
    currentPage: 142,
    status: 'READING',
    startedAt,
    finishedAt: null,
    createdAt: now,
    updatedAt: now,
  });

  // Leitura — sessão de hoje
  db.readingSessions.push({
    id: createLocalId('session'),
    userId: 'user_test_1',
    bookId,
    date: today,
    pagesRead: 22,
    fromPage: 121,
    toPage: 142,
    note: 'Capítulo sobre viés de confirmação',
    createdAt: now,
  });

  // Listas — raiz → item → subitem
  const listId = createLocalId('list');
  const itemId = createLocalId('node');
  const subId = createLocalId('node');

  db.listNodes.push(
    {
      id: listId,
      userId: 'user_test_1',
      parentId: null,
      title: 'Compras',
      content: null,
      nodeType: 'LIST',
      position: 0,
      isDone: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: itemId,
      userId: 'user_test_1',
      parentId: listId,
      title: 'Ovos',
      content: null,
      nodeType: 'ITEM',
      position: 0,
      isDone: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: subId,
      userId: 'user_test_1',
      parentId: itemId,
      title: 'Orgânicos',
      content: 'Preferir se tiver na feira',
      nodeType: 'ITEM',
      position: 0,
      isDone: false,
      createdAt: now,
      updatedAt: now,
    },
  );

  return db;
}

// ─── Core I/O ─────────────────────────────────────────────────────────────────

export async function getDb(): Promise<LocalDatabase> {
  const empty = createEmptyLocalDb();
  const db = await getLocalData<LocalDatabase>(LOCAL_DB_KEY, empty);
  // Primeira abertura: inicializa com seed automaticamente
  if (db.users.length === 0) {
    const seeded = createSeedLocalDb();
    await saveDb(seeded);
    return seeded;
  }
  return db;
}

export async function saveDb(db: LocalDatabase): Promise<void> {
  await setLocalData(LOCAL_DB_KEY, db);
}

export async function resetDbWithSeed(): Promise<LocalDatabase> {
  await clearLocalData(LOCAL_DB_KEY);
  const seeded = createSeedLocalDb();
  await saveDb(seeded);
  return seeded;
}
