/**
 * Tipos da resposta /api/today.
 *
 * Definidos localmente no mobile para manter independência de ciclo de build
 * com o @loopos/shared. Quando os tipos do shared forem derivados do Prisma
 * (Etapa 4), estes podem ser substituídos por imports do shared.
 */

export interface WorkoutSummary {
  id: string;
  date: string;
  runKm: number | null;
  pullupSets: number | null;
  pullupReps: number | null;
  rawInput: string | null;
  notes: string | null;
}

export interface TrackerSummary {
  id: string;
  title: string;
  type: string;
  target: number | null;
}

export interface RhythmEventSummary {
  id: string;
  eventType: string;
  value: number | null;
  note: string | null;
  tracker: TrackerSummary;
}

export interface BookSummary {
  id: string;
  title: string;
  author: string | null;
  currentPage: number | null;
  totalPages: number | null;
}

export interface ReadingSessionSummary {
  id: string;
  pagesRead: number;
  fromPage: number | null;
  toPage: number | null;
  note: string | null;
  book: BookSummary;
}

export interface ListNodeSummary {
  id: string;
  title: string;
  nodeType: string;
  parentId: string | null;
  isDone: boolean;
}

export interface TodayResponse {
  date: string;
  workouts: WorkoutSummary[];
  rhythm: RhythmEventSummary[];
  reading: ReadingSessionSummary[];
  lists: ListNodeSummary[];
}
