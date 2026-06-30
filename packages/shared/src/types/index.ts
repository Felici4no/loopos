/**
 * Shared domain types for LoopOS.
 *
 * ⚠️  PROVISÓRIO — Etapa 1 apenas.
 *
 * Estas interfaces são rascunhos de planejamento usados antes da modelagem
 * Prisma/Zod da Etapa 2. Elas NÃO são a fonte de verdade dos dados.
 *
 * A partir da Etapa 2:
 * - Tipos de entidades persistidas devem ser inferidos de `@prisma/client`.
 * - Tipos de contratos de API devem ser inferidos de schemas Zod em `../schemas/`.
 * - As interfaces manuais abaixo devem ser removidas ou substituídas módulo a módulo.
 *
 * Ver ADR-008 em docs/decisions.md.
 */

// ─── Identity ────────────────────────────────────────────────────────────────

export type ID = string;

export interface BaseEntity {
  id: ID;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Modules ─────────────────────────────────────────────────────────────────

export type ModuleKey = 'today' | 'body' | 'rhythm' | 'reading' | 'lists';

// ─── Today (Rotina) ──────────────────────────────────────────────────────────
//
// ⚠️  NÃO existe tabela `daily_entries` no banco.
// O módulo Hoje é uma agregação dos dados de Corpo, Ritmo, Leitura e Listas.
// Este tipo representa apenas a shape da view agregada no cliente.
// Ver ADR-009 em docs/decisions.md.

export interface TodayAggregation {
  date: string; // YYYY-MM-DD
  workouts: WorkoutEntry[];
  trackerEvents: TrackerEvent[];
  readingSessions: ReadingSession[];
  listsActivity: ListNode[];
}

// ─── Body (Corpo) ─────────────────────────────────────────────────────────────

export interface WorkoutEntry extends BaseEntity {
  userId: ID;
  date: string;
  type: string;
  durationMinutes: number;
  note?: string;
}

// ─── Rhythm (Ritmo / Hábitos) ────────────────────────────────────────────────

export interface Tracker extends BaseEntity {
  userId: ID;
  name: string;
  unit?: string;
  color?: string;
  isArchived: boolean;
}

export interface TrackerEvent extends BaseEntity {
  trackerId: ID;
  userId: ID;
  date: string;
  value?: number;
  note?: string;
}

// ─── Reading (Leitura) ───────────────────────────────────────────────────────

export interface Book extends BaseEntity {
  userId: ID;
  title: string;
  author?: string;
  totalPages?: number;
  coverUrl?: string;
  status: 'want_to_read' | 'reading' | 'finished' | 'dropped';
  startedAt?: Date;
  finishedAt?: Date;
}

export interface ReadingSession extends BaseEntity {
  bookId: ID;
  userId: ID;
  date: string;
  pagesRead: number;
  durationMinutes?: number;
  note?: string;
}

// ─── Lists (Listas) ──────────────────────────────────────────────────────────

export interface ListNode extends BaseEntity {
  userId: ID;
  listId: ID;
  content: string;
  isChecked: boolean;
  order: number;
  parentId?: ID;
}

export interface List extends BaseEntity {
  userId: ID;
  title: string;
  color?: string;
  isArchived: boolean;
}

// ─── User ────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  email: string;
  name?: string;
  avatarUrl?: string;
  timezone: string;
}
