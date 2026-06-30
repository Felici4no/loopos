/**
 * Camada de dados — modo Supabase direto.
 *
 * Mesma API pública de src/lib/api.ts, mas falando direto com o Supabase
 * via @supabase/supabase-js em vez do backend Express. Permite trocar a
 * fonte de dados nas telas sem mudar a forma como elas chamam as funções.
 *
 * Tabelas em snake_case (supabase/schema.sql) são convertidas para os
 * mesmos tipos camelCase já usados em src/types/*, mantendo as telas
 * exatamente como estavam.
 *
 * Modo temporário de validação visual — ver docs/supabase-direct-mode.md.
 * O backend Express + Prisma (server/) continua sendo a arquitetura
 * planejada; nada aqui o substitui permanentemente.
 */

import { supabase, CURRENT_USER_ID } from './supabase.js';
import { todayISO } from '@loopos/shared';

import type { TodayResponse } from '../types/today.js';
import type {
  WorkoutEntry,
  CreateWorkoutPayload,
} from '../types/workout.js';
import type {
  Book,
  ReadingSession,
  CreateBookPayload,
  CreateReadingSessionPayload,
} from '../types/reading.js';
import type {
  Tracker,
  TrackerEvent,
  CreateTrackerPayload,
  CreateTrackerEventPayload,
} from '../types/rhythm.js';
import type {
  ListNode,
  CreateListNodePayload,
  UpdateListNodePayload,
} from '../types/lists.js';

// ─── Error helper ────────────────────────────────────────────────────────────

export class DataError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'DataError';
  }
}

function assertNoError<T>(data: T | null, error: { message: string } | null, context: string): T {
  if (error) {
    throw new DataError(`${context}: ${error.message}`, error);
  }
  if (data === null) {
    throw new DataError(`${context}: resposta vazia do Supabase`);
  }
  return data;
}

// ─── Row → Domain mappers (snake_case → camelCase) ───────────────────────────

interface WorkoutRow {
  id: string;
  user_id: string;
  date: string;
  run_km: number | null;
  pullup_sets: number | null;
  pullup_reps: number | null;
  raw_input: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapWorkout(row: WorkoutRow): WorkoutEntry {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    runKm: row.run_km,
    pullupSets: row.pullup_sets,
    pullupReps: row.pullup_reps,
    rawInput: row.raw_input,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface TrackerRow {
  id: string;
  user_id: string;
  title: string;
  type: string;
  target: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function mapTracker(row: TrackerRow): Tracker {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    type: row.type as Tracker['type'],
    target: row.target,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface TrackerEventRow {
  id: string;
  user_id: string;
  tracker_id: string;
  date: string;
  event_type: string;
  value: number | null;
  note: string | null;
  created_at: string;
  trackers?: TrackerRow | null; // join aninhado do Supabase
}

function mapTrackerEvent(row: TrackerEventRow): TrackerEvent {
  return {
    id: row.id,
    userId: row.user_id,
    trackerId: row.tracker_id,
    date: row.date,
    eventType: row.event_type as TrackerEvent['eventType'],
    value: row.value,
    note: row.note,
    createdAt: row.created_at,
    tracker: row.trackers
      ? {
          id: row.trackers.id,
          title: row.trackers.title,
          type: row.trackers.type as Tracker['type'],
          target: row.trackers.target,
        }
      : undefined,
  };
}

interface BookRow {
  id: string;
  user_id: string;
  title: string;
  author: string | null;
  total_pages: number | null;
  current_page: number | null;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapBook(row: BookRow): Book {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    author: row.author,
    totalPages: row.total_pages,
    currentPage: row.current_page,
    status: row.status as Book['status'],
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface ReadingSessionRow {
  id: string;
  user_id: string;
  book_id: string;
  date: string;
  pages_read: number;
  from_page: number | null;
  to_page: number | null;
  note: string | null;
  created_at: string;
  books?: BookRow | null; // join aninhado do Supabase
}

function mapReadingSession(row: ReadingSessionRow): ReadingSession {
  return {
    id: row.id,
    userId: row.user_id,
    bookId: row.book_id,
    date: row.date,
    pagesRead: row.pages_read,
    fromPage: row.from_page,
    toPage: row.to_page,
    note: row.note,
    createdAt: row.created_at,
    book: row.books
      ? {
          id: row.books.id,
          title: row.books.title,
          author: row.books.author,
          currentPage: row.books.current_page,
          totalPages: row.books.total_pages,
        }
      : undefined,
  };
}

interface ListNodeRow {
  id: string;
  user_id: string;
  parent_id: string | null;
  title: string;
  content: string | null;
  node_type: string;
  position: number;
  is_done: boolean;
  created_at: string;
  updated_at: string;
}

function mapListNode(row: ListNodeRow, children?: ListNode[]): ListNode {
  return {
    id: row.id,
    userId: row.user_id,
    parentId: row.parent_id,
    title: row.title,
    content: row.content,
    nodeType: row.node_type as ListNode['nodeType'],
    position: row.position,
    isDone: row.is_done,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    children,
  };
}

// ─── Today ───────────────────────────────────────────────────────────────────

export async function getToday(date?: string): Promise<TodayResponse> {
  const targetDate = date ?? todayISO();
  const userId = CURRENT_USER_ID;

  const startOfDay = `${targetDate}T00:00:00.000Z`;
  const endOfDay = `${targetDate}T23:59:59.999Z`;

  const [workoutsRes, rhythmRes, readingRes, listsRes] = await Promise.all([
    supabase
      .from('workout_entries')
      .select('*')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .order('created_at', { ascending: false }),

    supabase
      .from('tracker_events')
      .select('*, trackers(id, title, type, target)')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .order('created_at', { ascending: true }),

    supabase
      .from('reading_sessions')
      .select('*, books(id, title, author, current_page, total_pages)')
      .eq('user_id', userId)
      .eq('date', targetDate)
      .order('created_at', { ascending: true }),

    supabase
      .from('list_nodes')
      .select('*')
      .eq('user_id', userId)
      .is('parent_id', null)
      .gte('updated_at', startOfDay)
      .lte('updated_at', endOfDay)
      .order('position', { ascending: true })
      .limit(20),
  ]);

  const workouts = assertNoError(workoutsRes.data, workoutsRes.error, 'getToday/workouts');
  const rhythm = assertNoError(rhythmRes.data, rhythmRes.error, 'getToday/rhythm');
  const reading = assertNoError(readingRes.data, readingRes.error, 'getToday/reading');
  const lists = assertNoError(listsRes.data, listsRes.error, 'getToday/lists');

  return {
    date: targetDate,
    workouts: (workouts as WorkoutRow[]).map(mapWorkout).map((w) => ({
      id: w.id,
      date: w.date,
      runKm: w.runKm,
      pullupSets: w.pullupSets,
      pullupReps: w.pullupReps,
      rawInput: w.rawInput,
      notes: w.notes,
    })),
    rhythm: (rhythm as TrackerEventRow[]).map(mapTrackerEvent).map((e) => ({
      id: e.id,
      eventType: e.eventType,
      value: e.value,
      note: e.note,
      tracker: {
        id: e.tracker?.id ?? '',
        title: e.tracker?.title ?? '',
        type: e.tracker?.type ?? 'boolean',
        target: e.tracker?.target ?? null,
      },
    })),
    reading: (reading as ReadingSessionRow[]).map(mapReadingSession).map((s) => ({
      id: s.id,
      pagesRead: s.pagesRead,
      fromPage: s.fromPage,
      toPage: s.toPage,
      note: s.note,
      book: {
        id: s.book?.id ?? '',
        title: s.book?.title ?? '',
        author: s.book?.author ?? null,
        currentPage: s.book?.currentPage ?? null,
        totalPages: s.book?.totalPages ?? null,
      },
    })),
    lists: (lists as ListNodeRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      nodeType: row.node_type,
      parentId: row.parent_id,
      isDone: row.is_done,
    })),
  };
}

// ─── Body / Workouts ─────────────────────────────────────────────────────────

export async function getWorkouts(date?: string): Promise<WorkoutEntry[]> {
  let query = supabase
    .from('workout_entries')
    .select('*')
    .eq('user_id', CURRENT_USER_ID)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (date) query = query.eq('date', date);

  const { data, error } = await query;
  const rows = assertNoError(data, error, 'getWorkouts');
  return (rows as WorkoutRow[]).map(mapWorkout);
}

export async function createWorkout(payload: CreateWorkoutPayload): Promise<WorkoutEntry> {
  const { data, error } = await supabase
    .from('workout_entries')
    .insert({
      user_id: CURRENT_USER_ID,
      date: payload.date,
      run_km: payload.runKm ?? null,
      pullup_sets: payload.pullupSets ?? null,
      pullup_reps: payload.pullupReps ?? null,
      raw_input: payload.rawInput ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createWorkout');
  return mapWorkout(row as WorkoutRow);
}

export async function deleteWorkout(id: string): Promise<void> {
  const { error } = await supabase
    .from('workout_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID);

  if (error) throw new DataError(`deleteWorkout: ${error.message}`, error);
}

// ─── Reading / Books ─────────────────────────────────────────────────────────

export async function getBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', CURRENT_USER_ID)
    .order('updated_at', { ascending: false });

  const rows = assertNoError(data, error, 'getBooks');
  return (rows as BookRow[]).map(mapBook);
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert({
      user_id: CURRENT_USER_ID,
      title: payload.title,
      author: payload.author ?? null,
      total_pages: payload.totalPages,
      current_page: payload.currentPage ?? 0,
      status: payload.status ?? 'READING',
      started_at: payload.startedAt ?? null,
      finished_at: payload.finishedAt ?? null,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createBook');
  return mapBook(row as BookRow);
}

export async function createReadingSession(
  payload: CreateReadingSessionPayload,
): Promise<ReadingSession> {
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      user_id: CURRENT_USER_ID,
      book_id: payload.bookId,
      date: payload.date,
      pages_read: payload.pagesRead,
      from_page: payload.fromPage ?? null,
      to_page: payload.toPage ?? null,
      note: payload.note ?? null,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createReadingSession');

  // Diferente do backend Express, o Supabase direto não atualiza
  // automaticamente current_page do livro — fazemos isso aqui.
  if (payload.toPage !== undefined && payload.toPage !== null) {
    const { data: bookData } = await supabase
      .from('books')
      .select('current_page')
      .eq('id', payload.bookId)
      .single();

    const currentPage = (bookData as { current_page: number | null } | null)?.current_page;
    if (currentPage === null || currentPage === undefined || payload.toPage > currentPage) {
      await supabase
        .from('books')
        .update({ current_page: payload.toPage, updated_at: new Date().toISOString() })
        .eq('id', payload.bookId)
        .eq('user_id', CURRENT_USER_ID);
    }
  }

  return mapReadingSession(row as ReadingSessionRow);
}

export async function deleteBook(id: string): Promise<void> {
  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID);

  if (error) throw new DataError(`deleteBook: ${error.message}`, error);
}

// ─── Rhythm / Trackers ────────────────────────────────────────────────────────

export async function getTrackers(): Promise<Tracker[]> {
  const { data, error } = await supabase
    .from('trackers')
    .select('*')
    .eq('user_id', CURRENT_USER_ID)
    .order('created_at', { ascending: true });

  const rows = assertNoError(data, error, 'getTrackers');
  return (rows as TrackerRow[]).map(mapTracker);
}

export async function getTrackerEvents(params?: {
  date?: string;
  trackerId?: string;
}): Promise<TrackerEvent[]> {
  let query = supabase
    .from('tracker_events')
    .select('*, trackers(id, title, type, target)')
    .eq('user_id', CURRENT_USER_ID)
    .order('created_at', { ascending: false });

  if (params?.date) query = query.eq('date', params.date);
  if (params?.trackerId) query = query.eq('tracker_id', params.trackerId);

  const { data, error } = await query;
  const rows = assertNoError(data, error, 'getTrackerEvents');
  return (rows as TrackerEventRow[]).map(mapTrackerEvent);
}

export async function createTracker(payload: CreateTrackerPayload): Promise<Tracker> {
  const { data, error } = await supabase
    .from('trackers')
    .insert({
      user_id: CURRENT_USER_ID,
      title: payload.title,
      type: payload.type,
      target: payload.target ?? null,
      is_active: payload.isActive ?? true,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createTracker');
  return mapTracker(row as TrackerRow);
}

export async function createTrackerEvent(
  payload: CreateTrackerEventPayload,
): Promise<TrackerEvent> {
  const { data, error } = await supabase
    .from('tracker_events')
    .insert({
      user_id: CURRENT_USER_ID,
      tracker_id: payload.trackerId,
      date: payload.date,
      event_type: payload.eventType,
      value: payload.value ?? null,
      note: payload.note ?? null,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createTrackerEvent');
  return mapTrackerEvent(row as TrackerEventRow);
}

export async function deleteTracker(id: string): Promise<void> {
  const { error } = await supabase
    .from('trackers')
    .delete()
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID);

  if (error) throw new DataError(`deleteTracker: ${error.message}`, error);
}

// ─── Lists / Nodes ────────────────────────────────────────────────────────────

export async function getListNodes(parentId?: string | null): Promise<ListNode[]> {
  let query = supabase
    .from('list_nodes')
    .select('*')
    .eq('user_id', CURRENT_USER_ID)
    .order('position', { ascending: true });

  query = parentId ? query.eq('parent_id', parentId) : query.is('parent_id', null);

  const { data, error } = await query;
  const rows = assertNoError(data, error, 'getListNodes');
  return (rows as ListNodeRow[]).map((row) => mapListNode(row));
}

export async function getListNode(id: string): Promise<ListNode> {
  const { data, error } = await supabase
    .from('list_nodes')
    .select('*')
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID)
    .single();

  const row = assertNoError(data, error, 'getListNode');

  const { data: childrenData, error: childrenError } = await supabase
    .from('list_nodes')
    .select('*')
    .eq('parent_id', id)
    .eq('user_id', CURRENT_USER_ID)
    .order('position', { ascending: true });

  const children = assertNoError(childrenData, childrenError, 'getListNode/children');

  return mapListNode(
    row as ListNodeRow,
    (children as ListNodeRow[]).map((c) => mapListNode(c)),
  );
}

export async function createListNode(payload: CreateListNodePayload): Promise<ListNode> {
  const { data, error } = await supabase
    .from('list_nodes')
    .insert({
      user_id: CURRENT_USER_ID,
      parent_id: payload.parentId ?? null,
      title: payload.title,
      content: payload.content ?? null,
      node_type: payload.nodeType ?? 'ITEM',
      position: payload.position ?? 0,
      is_done: payload.isDone ?? false,
    })
    .select()
    .single();

  const row = assertNoError(data, error, 'createListNode');
  return mapListNode(row as ListNodeRow);
}

export async function updateListNode(
  id: string,
  payload: UpdateListNodePayload,
): Promise<ListNode> {
  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.title !== undefined) updateData['title'] = payload.title;
  if (payload.content !== undefined) updateData['content'] = payload.content;
  if (payload.position !== undefined) updateData['position'] = payload.position;
  if (payload.isDone !== undefined) updateData['is_done'] = payload.isDone;

  const { data, error } = await supabase
    .from('list_nodes')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID)
    .select()
    .single();

  const row = assertNoError(data, error, 'updateListNode');
  return mapListNode(row as ListNodeRow);
}

export async function deleteListNode(id: string): Promise<void> {
  const { error } = await supabase
    .from('list_nodes')
    .delete()
    .eq('id', id)
    .eq('user_id', CURRENT_USER_ID);

  if (error) throw new DataError(`deleteListNode: ${error.message}`, error);
}
