/**
 * Ações de alto nível do LoopOS — operações com side effects + feedback.
 *
 * Camadas:
 *   localDb.ts  → persistência (AsyncStorage)
 *   data.ts     → CRUD local básico
 *   actions.ts  → AQUI: operações de alto nível, regras de transição e as
 *                 mensagens de sucesso/exclusão (fonte única — as telas não
 *                 hardcodam "Parabéns...")
 *   insights.ts → cálculos puros
 *   dashboard.ts→ agregação derivada para a Home
 */

import {
  createWorkout,
  deleteWorkout as dataDeleteWorkout,
  createReadingSession,
  getBook,
  getBooks,
  deleteBook as dataDeleteBook,
  createTrackerEvent,
  getTrackerEvents,
  deleteTracker as dataDeleteTracker,
  deleteListNode as dataDeleteListNode,
  updateListNode,
} from './data.js';
import {
  getWorkoutSuccessMessage,
  getReadingSuccessMessage,
  getTrackerDayProgress,
} from './insights.js';
import { calculateCurrentStreak } from './rhythmStats.js';
import type { WorkoutEntry, CreateWorkoutPayload } from '../types/workout.js';
import type { ReadingSession, CreateReadingSessionPayload } from '../types/reading.js';
import type {
  Tracker,
  TrackerEvent,
  CreateTrackerEventPayload,
} from '../types/rhythm.js';
import type { ListNode } from '../types/lists.js';

export interface ActionResult<T> {
  data: T;
  message: string;
}

export interface DeleteResult {
  success: true;
  message: string;
}

// ─── Corpo ────────────────────────────────────────────────────────────────────

export async function registerWorkout(
  payload: CreateWorkoutPayload,
): Promise<ActionResult<WorkoutEntry>> {
  const data = await createWorkout(payload);
  return { data, message: getWorkoutSuccessMessage(data) };
}

export async function deleteWorkout(id: string): Promise<DeleteResult> {
  await dataDeleteWorkout(id);
  return { success: true, message: 'Treino excluído.' };
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

export async function registerReadingSession(
  payload: CreateReadingSessionPayload,
): Promise<ActionResult<ReadingSession>> {
  const before = await getBook(payload.bookId);
  const wasFinished = before.status === 'FINISHED';
  const data = await createReadingSession(payload);
  const after = await getBook(payload.bookId);
  const justFinished = !wasFinished && after.status === 'FINISHED';
  return { data, message: getReadingSuccessMessage(payload.pagesRead, justFinished) };
}

export async function deleteBook(id: string): Promise<DeleteResult> {
  await dataDeleteBook(id);
  return { success: true, message: 'Livro excluído com suas sessões.' };
}

// ─── Ritmo ────────────────────────────────────────────────────────────────────

export async function registerTrackerEvent(
  tracker: Tracker,
  payload: CreateTrackerEventPayload,
): Promise<ActionResult<TrackerEvent>> {
  const data = await createTrackerEvent(payload);
  const events = await getTrackerEvents();
  const progressAfter = getTrackerDayProgress(tracker, events, payload.date);

  // Mensagem por prioridade: meta batida > jornada mantida > registro simples
  let message: string;
  if (progressAfter.target !== null && progressAfter.done) {
    message = `Meta de ${tracker.title} batida: ${progressAfter.current}/${progressAfter.target}.`;
  } else {
    const streak = calculateCurrentStreak(tracker, events, payload.date);
    if (tracker.type === 'boolean' && streak >= 2) {
      message = `Você manteve ${tracker.title} por ${streak} dias seguidos.`;
    } else if (progressAfter.target !== null) {
      message = `${tracker.title}: ${progressAfter.current}/${progressAfter.target} hoje.`;
    } else {
      message = `${tracker.title} registrado hoje.`;
    }
  }
  return { data, message };
}

export async function deleteTracker(id: string): Promise<DeleteResult> {
  await dataDeleteTracker(id);
  return { success: true, message: 'Contador excluído com seus registros.' };
}

// ─── Listas ───────────────────────────────────────────────────────────────────

export async function toggleListItem(node: ListNode): Promise<ActionResult<ListNode>> {
  const data = await updateListNode(node.id, { isDone: !node.isDone });
  return { data, message: data.isDone ? 'Item concluído.' : 'Item reaberto.' };
}

export async function deleteListNode(
  node: Pick<ListNode, 'id' | 'nodeType' | 'parentId'>,
): Promise<DeleteResult> {
  await dataDeleteListNode(node.id);
  const isRoot = node.parentId === null;
  return {
    success: true,
    message: isRoot ? 'Lista excluída com todos os itens.' : 'Item excluído.',
  };
}

// Reexporta para conveniência das telas (fonte única de leitura + ação)
export { getBooks };
