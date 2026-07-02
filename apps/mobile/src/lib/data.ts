/**
 * Camada de dados — modo local-only.
 *
 * Mesma API pública de antes (getToday, getWorkouts, etc.), agora
 * implementada com AsyncStorage via localDb.ts. Sem Supabase, sem
 * backend Express, sem .env obrigatório.
 *
 * As telas não precisaram mudar — só a implementação aqui dentro.
 * Ver docs/local-only-apk.md.
 */

import { todayISO } from '@loopos/shared';
import { getDb, saveDb } from './localDb.js';
import { createLocalId } from './localIds.js';

import type { TodayResponse } from '../types/today.js';
import type {
  WorkoutEntry,
  CreateWorkoutPayload,
  UpdateWorkoutPayload,
} from '../types/workout.js';
import type {
  Book,
  ReadingSession,
  CreateBookPayload,
  UpdateBookPayload,
  CreateReadingSessionPayload,
} from '../types/reading.js';
import type {
  Tracker,
  TrackerEvent,
  CreateTrackerPayload,
  UpdateTrackerPayload,
  CreateTrackerEventPayload,
} from '../types/rhythm.js';
import type {
  ListNode,
  CreateListNodePayload,
  UpdateListNodePayload,
} from '../types/lists.js';

// ─── Error ────────────────────────────────────────────────────────────────────

export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DataError';
  }
}

// ─── Today ───────────────────────────────────────────────────────────────────

export async function getToday(date?: string): Promise<TodayResponse> {
  const targetDate = date ?? todayISO();
  const db = await getDb();

  const workouts = db.workoutEntries.filter((w) => w.date === targetDate);

  const rhythmEvents = db.trackerEvents
    .filter((e) => e.date === targetDate)
    .map((e) => {
      const tracker = db.trackers.find((t) => t.id === e.trackerId);
      return {
        id: e.id,
        eventType: e.eventType,
        value: e.value,
        note: e.note,
        tracker: {
          id: tracker?.id ?? '',
          title: tracker?.title ?? '',
          type: tracker?.type ?? 'boolean',
          target: tracker?.target ?? null,
        },
      };
    });

  const readingSessions = db.readingSessions
    .filter((s) => s.date === targetDate)
    .map((s) => {
      const book = db.books.find((b) => b.id === s.bookId);
      return {
        id: s.id,
        pagesRead: s.pagesRead,
        fromPage: s.fromPage,
        toPage: s.toPage,
        note: s.note,
        book: {
          id: book?.id ?? '',
          title: book?.title ?? '',
          author: book?.author ?? null,
          currentPage: book?.currentPage ?? null,
          totalPages: book?.totalPages ?? null,
        },
      };
    });

  const listRoots = db.listNodes.filter(
    (n) => n.parentId === null && n.updatedAt.startsWith(targetDate),
  );

  return {
    date: targetDate,
    workouts: workouts.map((w) => ({
      id: w.id,
      date: w.date,
      runKm: w.runKm,
      pullupSets: w.pullupSets,
      pullupReps: w.pullupReps,
      rawInput: w.rawInput,
      notes: w.notes,
    })),
    rhythm: rhythmEvents,
    reading: readingSessions,
    lists: listRoots.map((n) => ({
      id: n.id,
      title: n.title,
      nodeType: n.nodeType,
      parentId: n.parentId,
      isDone: n.isDone,
    })),
  };
}

// ─── Body / Workouts ─────────────────────────────────────────────────────────

export async function getWorkouts(date?: string): Promise<WorkoutEntry[]> {
  const db = await getDb();
  return db.workoutEntries
    .filter((w) => (date ? w.date === date : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createWorkout(payload: CreateWorkoutPayload): Promise<WorkoutEntry> {
  const db = await getDb();
  const now = new Date().toISOString();
  const entry: WorkoutEntry = {
    id: createLocalId('workout'),
    userId: 'user_test_1',
    date: payload.date,
    runKm: payload.runKm ?? null,
    pullupSets: payload.pullupSets ?? null,
    pullupReps: payload.pullupReps ?? null,
    rawInput: payload.rawInput ?? null,
    notes: payload.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.workoutEntries.push(entry);
  await saveDb(db);
  return entry;
}

export async function updateWorkout(
  id: string,
  payload: UpdateWorkoutPayload,
): Promise<WorkoutEntry> {
  const db = await getDb();
  const idx = db.workoutEntries.findIndex((w) => w.id === id);
  if (idx === -1) throw new DataError('Treino não encontrado');
  const updated: WorkoutEntry = {
    ...db.workoutEntries[idx]!,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  db.workoutEntries[idx] = updated;
  await saveDb(db);
  return updated;
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDb();
  db.workoutEntries = db.workoutEntries.filter((w) => w.id !== id);
  await saveDb(db);
}

// ─── Reading / Books ─────────────────────────────────────────────────────────

export async function getBooks(status?: string): Promise<Book[]> {
  const db = await getDb();
  return db.books
    .filter((b) => (status ? b.status === status : true))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getBook(id: string): Promise<Book> {
  const db = await getDb();
  const book = db.books.find((b) => b.id === id);
  if (!book) throw new DataError('Livro não encontrado');
  return book;
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  const db = await getDb();
  const now = new Date().toISOString();
  const book: Book = {
    id: createLocalId('book'),
    userId: 'user_test_1',
    title: payload.title,
    author: payload.author ?? null,
    totalPages: payload.totalPages ?? null,
    currentPage: payload.currentPage ?? 0,
    status: payload.status ?? 'READING',
    startedAt: payload.startedAt ?? null,
    finishedAt: payload.finishedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
  db.books.push(book);
  await saveDb(db);
  return book;
}

export async function updateBook(id: string, payload: UpdateBookPayload): Promise<Book> {
  const db = await getDb();
  const idx = db.books.findIndex((b) => b.id === id);
  if (idx === -1) throw new DataError('Livro não encontrado');
  const updated: Book = {
    ...db.books[idx]!,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  db.books[idx] = updated;
  await saveDb(db);
  return updated;
}

export async function deleteBook(id: string): Promise<void> {
  const db = await getDb();
  db.books = db.books.filter((b) => b.id !== id);
  db.readingSessions = db.readingSessions.filter((s) => s.bookId !== id);
  await saveDb(db);
}

// ─── Reading / Sessions ───────────────────────────────────────────────────────

export async function getReadingSessions(params?: {
  bookId?: string;
  date?: string;
}): Promise<ReadingSession[]> {
  const db = await getDb();
  return db.readingSessions
    .filter((s) => {
      if (params?.bookId && s.bookId !== params.bookId) return false;
      if (params?.date && s.date !== params.date) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createReadingSession(
  payload: CreateReadingSessionPayload,
): Promise<ReadingSession> {
  const db = await getDb();
  const now = new Date().toISOString();
  const session: ReadingSession = {
    id: createLocalId('session'),
    userId: 'user_test_1',
    bookId: payload.bookId,
    date: payload.date,
    pagesRead: payload.pagesRead,
    fromPage: payload.fromPage ?? null,
    toPage: payload.toPage ?? null,
    note: payload.note ?? null,
    createdAt: now,
  };
  db.readingSessions.push(session);

  // Atualizar o livro: currentPage avança com toPage (posição exata) ou,
  // sem toPage, soma pagesRead. Primeira sessão tira o livro de
  // WANT_TO_READ; atingir totalPages finaliza (FINISHED + finishedAt).
  const bookIdx = db.books.findIndex((b) => b.id === payload.bookId);
  if (bookIdx !== -1) {
    const book = db.books[bookIdx]!;
    const base = book.currentPage ?? 0;
    const advanced =
      payload.toPage !== undefined && payload.toPage !== null
        ? Math.max(base, payload.toPage)
        : base + payload.pagesRead;
    const newPage =
      book.totalPages !== null ? Math.min(advanced, book.totalPages) : advanced;
    const finished = book.totalPages !== null && advanced >= book.totalPages;
    db.books[bookIdx] = {
      ...book,
      currentPage: newPage,
      status: finished
        ? 'FINISHED'
        : book.status === 'WANT_TO_READ'
          ? 'READING'
          : book.status,
      startedAt: book.startedAt ?? now,
      finishedAt: finished && !book.finishedAt ? now : book.finishedAt,
      updatedAt: now,
    };
  }

  await saveDb(db);
  return session;
}

export async function deleteReadingSession(id: string): Promise<void> {
  const db = await getDb();
  db.readingSessions = db.readingSessions.filter((s) => s.id !== id);
  await saveDb(db);
}

// ─── Rhythm / Trackers ────────────────────────────────────────────────────────

export async function getTrackers(): Promise<Tracker[]> {
  const db = await getDb();
  return db.trackers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function createTracker(payload: CreateTrackerPayload): Promise<Tracker> {
  const db = await getDb();
  const now = new Date().toISOString();
  const tracker: Tracker = {
    id: createLocalId('tracker'),
    userId: 'user_test_1',
    title: payload.title,
    type: payload.type,
    target: payload.target ?? null,
    isActive: payload.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };
  db.trackers.push(tracker);
  await saveDb(db);
  return tracker;
}

export async function updateTracker(
  id: string,
  payload: UpdateTrackerPayload,
): Promise<Tracker> {
  const db = await getDb();
  const idx = db.trackers.findIndex((t) => t.id === id);
  if (idx === -1) throw new DataError('Tracker não encontrado');
  const updated: Tracker = {
    ...db.trackers[idx]!,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  db.trackers[idx] = updated;
  await saveDb(db);
  return updated;
}

export async function deleteTracker(id: string): Promise<void> {
  const db = await getDb();
  db.trackers = db.trackers.filter((t) => t.id !== id);
  db.trackerEvents = db.trackerEvents.filter((e) => e.trackerId !== id);
  await saveDb(db);
}

// ─── Rhythm / Events ─────────────────────────────────────────────────────────

export async function getTrackerEvents(params?: {
  date?: string;
  trackerId?: string;
}): Promise<TrackerEvent[]> {
  const db = await getDb();
  return db.trackerEvents
    .filter((e) => {
      if (params?.date && e.date !== params.date) return false;
      if (params?.trackerId && e.trackerId !== params.trackerId) return false;
      return true;
    })
    .map((e) => {
      const tracker = db.trackers.find((t) => t.id === e.trackerId);
      return { ...e, tracker: tracker ? { id: tracker.id, title: tracker.title, type: tracker.type, target: tracker.target } : undefined };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createTrackerEvent(
  payload: CreateTrackerEventPayload,
): Promise<TrackerEvent> {
  const db = await getDb();
  const now = new Date().toISOString();
  const event: TrackerEvent = {
    id: createLocalId('event'),
    userId: 'user_test_1',
    trackerId: payload.trackerId,
    date: payload.date,
    eventType: payload.eventType,
    value: payload.value ?? null,
    note: payload.note ?? null,
    createdAt: now,
  };
  db.trackerEvents.push(event);
  await saveDb(db);
  return event;
}

export async function deleteTrackerEvent(id: string): Promise<void> {
  const db = await getDb();
  db.trackerEvents = db.trackerEvents.filter((e) => e.id !== id);
  await saveDb(db);
}

// ─── Lists / Nodes ────────────────────────────────────────────────────────────

export async function getListNodes(parentId?: string | null): Promise<ListNode[]> {
  const db = await getDb();
  return db.listNodes
    .filter((n) =>
      parentId !== undefined ? n.parentId === parentId : n.parentId === null,
    )
    .sort((a, b) => a.position - b.position);
}

export async function getListNode(id: string): Promise<ListNode> {
  const db = await getDb();
  const node = db.listNodes.find((n) => n.id === id);
  if (!node) throw new DataError('Nó não encontrado');
  const children = db.listNodes
    .filter((n) => n.parentId === id)
    .sort((a, b) => a.position - b.position);
  return { ...node, children };
}

export async function createListNode(payload: CreateListNodePayload): Promise<ListNode> {
  const db = await getDb();
  const now = new Date().toISOString();
  const node: ListNode = {
    id: createLocalId('node'),
    userId: 'user_test_1',
    parentId: payload.parentId ?? null,
    title: payload.title,
    content: payload.content ?? null,
    nodeType: payload.nodeType ?? 'ITEM',
    position: payload.position ?? 0,
    isDone: payload.isDone ?? false,
    createdAt: now,
    updatedAt: now,
  };
  db.listNodes.push(node);
  await saveDb(db);
  return node;
}

export async function updateListNode(
  id: string,
  payload: UpdateListNodePayload,
): Promise<ListNode> {
  const db = await getDb();
  const idx = db.listNodes.findIndex((n) => n.id === id);
  if (idx === -1) throw new DataError('Nó não encontrado');
  const updated: ListNode = {
    ...db.listNodes[idx]!,
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  db.listNodes[idx] = updated;
  await saveDb(db);
  return updated;
}

export async function deleteListNode(id: string): Promise<void> {
  const db = await getDb();

  // Deleta recursivamente: coleta ids de todos os descendentes
  const toDelete = new Set<string>([id]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of db.listNodes) {
      if (node.parentId !== null && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
        toDelete.add(node.id);
        changed = true;
      }
    }
  }

  db.listNodes = db.listNodes.filter((n) => !toDelete.has(n.id));
  await saveDb(db);
}
