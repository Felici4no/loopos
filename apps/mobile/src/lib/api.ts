/**
 * Cliente HTTP do LoopOS Mobile.
 *
 * Configuração:
 *   EXPO_PUBLIC_API_URL — URL base da API (ex: http://localhost:3333)
 *   EXPO_PUBLIC_USER_ID — userId temporário até Supabase Auth (Etapa 4)
 *
 * Celular físico: troque localhost pelo IP local da máquina.
 * Ex: EXPO_PUBLIC_API_URL=http://192.168.1.42:3333
 */

import type { TodayResponse } from '../types/today.js';
import type {
  WorkoutEntry,
  WorkoutsResponse,
  WorkoutResponse,
  CreateWorkoutPayload,
  UpdateWorkoutPayload,
} from '../types/workout.js';
import type {
  Book,
  ReadingSession,
  BookResponse,
  BooksResponse,
  SessionResponse,
  SessionsResponse,
  CreateBookPayload,
  UpdateBookPayload,
  CreateReadingSessionPayload,
} from '../types/reading.js';
import type {
  Tracker,
  TrackerEvent,
  TrackerResponse,
  TrackersResponse,
  TrackerEventResponse,
  TrackerEventsResponse,
  CreateTrackerPayload,
  UpdateTrackerPayload,
  CreateTrackerEventPayload,
} from '../types/rhythm.js';
import type {
  ListNode,
  ListNodeResponse,
  ListNodesResponse,
  CreateListNodePayload,
  UpdateListNodePayload,
} from '../types/lists.js';

const BASE_URL = (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3333').replace(/\/$/, '');
const USER_ID = process.env['EXPO_PUBLIC_USER_ID'] ?? 'user_test_1';

// ─── Core fetch ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // body não é JSON — mantém mensagem padrão
    }
    throw new ApiError(response.status, code, message);
  }

  return response.json() as Promise<T>;
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch<void>(path, { method: 'DELETE' });
}

// ─── Today ───────────────────────────────────────────────────────────────────

export async function getToday(date?: string): Promise<TodayResponse> {
  const qs = date ? `?date=${date}` : '';
  return apiGet<TodayResponse>(`/api/today${qs}`);
}

// ─── Body / Workouts ─────────────────────────────────────────────────────────

export async function getWorkouts(date?: string): Promise<WorkoutEntry[]> {
  const qs = date ? `?date=${date}` : '';
  const result = await apiGet<WorkoutsResponse>(`/api/body/workouts${qs}`);
  return result.data;
}

export async function createWorkout(payload: CreateWorkoutPayload): Promise<WorkoutEntry> {
  const result = await apiPost<WorkoutResponse>('/api/body/workouts', payload);
  return result.data;
}

export async function updateWorkout(id: string, payload: UpdateWorkoutPayload): Promise<WorkoutEntry> {
  const result = await apiPatch<WorkoutResponse>(`/api/body/workouts/${id}`, payload);
  return result.data;
}

export async function deleteWorkout(id: string): Promise<void> {
  await apiDelete(`/api/body/workouts/${id}`);
}

// ─── Reading / Books ─────────────────────────────────────────────────────────

export async function getBooks(status?: string): Promise<Book[]> {
  const qs = status ? `?status=${status}` : '';
  const result = await apiGet<BooksResponse>(`/api/reading/books${qs}`);
  return result.data;
}

export async function getBook(id: string): Promise<Book> {
  const result = await apiGet<BookResponse>(`/api/reading/books/${id}`);
  return result.data;
}

export async function createBook(payload: CreateBookPayload): Promise<Book> {
  const result = await apiPost<BookResponse>('/api/reading/books', payload);
  return result.data;
}

export async function updateBook(id: string, payload: UpdateBookPayload): Promise<Book> {
  const result = await apiPatch<BookResponse>(`/api/reading/books/${id}`, payload);
  return result.data;
}

export async function deleteBook(id: string): Promise<void> {
  await apiDelete(`/api/reading/books/${id}`);
}

// ─── Reading / Sessions ───────────────────────────────────────────────────────

export async function getReadingSessions(params?: {
  bookId?: string;
  date?: string;
}): Promise<ReadingSession[]> {
  const qs = new URLSearchParams();
  if (params?.bookId) qs.set('bookId', params.bookId);
  if (params?.date) qs.set('date', params.date);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const result = await apiGet<SessionsResponse>(`/api/reading/sessions${query}`);
  return result.data;
}

export async function createReadingSession(
  payload: CreateReadingSessionPayload,
): Promise<ReadingSession> {
  const result = await apiPost<SessionResponse>('/api/reading/sessions', payload);
  return result.data;
}

export async function deleteReadingSession(id: string): Promise<void> {
  await apiDelete(`/api/reading/sessions/${id}`);
}

// ─── Rhythm / Trackers ────────────────────────────────────────────────────────

export async function getTrackers(): Promise<Tracker[]> {
  const result = await apiGet<TrackersResponse>('/api/rhythm/trackers');
  return result.data;
}

export async function createTracker(payload: CreateTrackerPayload): Promise<Tracker> {
  const result = await apiPost<TrackerResponse>('/api/rhythm/trackers', payload);
  return result.data;
}

export async function updateTracker(id: string, payload: UpdateTrackerPayload): Promise<Tracker> {
  const result = await apiPatch<TrackerResponse>(`/api/rhythm/trackers/${id}`, payload);
  return result.data;
}

export async function deleteTracker(id: string): Promise<void> {
  await apiDelete(`/api/rhythm/trackers/${id}`);
}

// ─── Rhythm / Events ─────────────────────────────────────────────────────────

export async function getTrackerEvents(params?: {
  date?: string;
  trackerId?: string;
}): Promise<TrackerEvent[]> {
  const qs = new URLSearchParams();
  if (params?.date) qs.set('date', params.date);
  if (params?.trackerId) qs.set('trackerId', params.trackerId);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  const result = await apiGet<TrackerEventsResponse>(`/api/rhythm/events${query}`);
  return result.data;
}

export async function createTrackerEvent(
  payload: CreateTrackerEventPayload,
): Promise<TrackerEvent> {
  const result = await apiPost<TrackerEventResponse>('/api/rhythm/events', payload);
  return result.data;
}

export async function deleteTrackerEvent(id: string): Promise<void> {
  await apiDelete(`/api/rhythm/events/${id}`);
}

// ─── Lists / Nodes ────────────────────────────────────────────────────────────

/**
 * Lista nós filhos de um parentId. Sem parentId (ou null) → retorna raízes.
 */
export async function getListNodes(parentId?: string | null): Promise<ListNode[]> {
  const qs = parentId ? `?parentId=${parentId}` : '';
  const result = await apiGet<ListNodesResponse>(`/api/lists/nodes${qs}`);
  return result.data;
}

/** Busca um nó com seus filhos diretos incluídos. */
export async function getListNode(id: string): Promise<ListNode> {
  const result = await apiGet<ListNodeResponse>(`/api/lists/nodes/${id}`);
  return result.data;
}

/** Cria um nó (lista raiz se parentId omitido, item se fornecido). */
export async function createListNode(payload: CreateListNodePayload): Promise<ListNode> {
  const result = await apiPost<ListNodeResponse>('/api/lists/nodes', payload);
  return result.data;
}

/** Atualiza título, conteúdo, posição ou isDone. Não altera parentId/nodeType. */
export async function updateListNode(id: string, payload: UpdateListNodePayload): Promise<ListNode> {
  const result = await apiPatch<ListNodeResponse>(`/api/lists/nodes/${id}`, payload);
  return result.data;
}

/** Remove um nó. Cascade no banco apaga todos os filhos automaticamente. */
export async function deleteListNode(id: string): Promise<void> {
  await apiDelete(`/api/lists/nodes/${id}`);
}
