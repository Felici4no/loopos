/**
 * Dashboard derivado da Home — camada única de estado agregado.
 *
 * Transforma os dados brutos do localDb (via data.ts) em um TodayDashboard
 * pronto para renderizar. A TodayScreen consome este objeto e não calcula
 * nada com dado solto. Tudo aqui deriva dos arrays reais — nada fixo.
 */

import {
  getWorkouts,
  getTrackers,
  getTrackerEvents,
  getBooks,
  getReadingSessions,
  getListNodes,
  getListNode,
} from './data.js';
import {
  timeProgress,
  formatKm,
  lastDays,
  getWeeklyRunKmSeries,
  getWeeklyPullupSeries,
  getWeeklyWorkoutSummary,
  getTrackerDayProgress,
  getJourneyDays,
  getContinuityLabel,
  parseISODate,
  toISODate,
  type SeriesPoint,
} from './insights.js';
import { calculateCurrentStreak } from './rhythmStats.js';
import { calculateReadingProgress } from './readingProgress.js';
import { todayISO } from '@loopos/shared';
import type { WorkoutEntry } from '../types/workout.js';
import type { Tracker } from '../types/rhythm.js';
import type { Book, ReadingSession } from '../types/reading.js';
import type { ListNode } from '../types/lists.js';

// ─── Tipo ─────────────────────────────────────────────────────────────────────

export interface DashboardTracker {
  tracker: Tracker;
  todayValue: number;
  target: number | null;
  /** 0–1 quando há meta; 0/1 para boolean. */
  progress: number;
  isDoneToday: boolean;
  streakDays: number;
  journeyDays: number;
  /** Continuidade curta: "3 dias seguidos" / "jornada de 5 dias" / null. */
  label: string | null;
}

export interface DashboardRootList {
  node: ListNode;
  totalItems: number;
  doneItems: number;
  progress: number;
  updatedToday: boolean;
}

export interface TodayDashboard {
  date: string;
  formattedDate: string;
  timeProgress: { week: number; month: number; year: number };

  body: {
    todayWorkouts: WorkoutEntry[];
    weeklyKm: number;
    weeklyPullupAverage: number;
    weeklyWorkoutCount: number;
    bestRunKm: number | null;
    runKmSeries: SeriesPoint[];
    pullupSeries: SeriesPoint[];
    latestAchievement: string | null;
  };

  rhythm: {
    trackers: DashboardTracker[];
    completedToday: number;
    totalToday: number;
    mainMessage: string | null;
  };

  reading: {
    currentBook: Book | null;
    /** De onde veio o currentBook — muda o label na Home. */
    currentBookKind: 'reading' | 'recent' | 'suggestion' | null;
    currentBookProgress: number;
    pagesReadToday: number;
    lastSession: ReadingSession | null;
    notesToday: number;
    finishedToday: Book[];
    wantToRead: Book[];
  };

  lists: {
    rootLists: DashboardRootList[];
    updatedTodayCount: number;
  };

  achievements: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFullDate(iso: string): string {
  const s = parseISODate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Livro atual da Home:
 *   1. READING mais recente (updatedAt);
 *   2. senão, livro (não finalizado) da sessão mais recente;
 *   3. senão, primeiro WANT_TO_READ como sugestão ("próximo livro");
 *   4. nunca FINISHED.
 */
function pickCurrentBook(
  books: Book[],
  sessions: ReadingSession[],
): { book: Book | null; kind: TodayDashboard['reading']['currentBookKind'] } {
  const reading = books
    .filter((b) => b.status === 'READING')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (reading[0]) return { book: reading[0], kind: 'reading' };

  const bySession = [...sessions].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );
  for (const s of bySession) {
    const book = books.find((b) => b.id === s.bookId);
    if (book && book.status !== 'FINISHED' && book.status !== 'DROPPED') {
      return { book, kind: 'recent' };
    }
  }

  const want = books.find((b) => b.status === 'WANT_TO_READ');
  if (want) return { book: want, kind: 'suggestion' };

  return { book: null, kind: null };
}

// ─── Build ────────────────────────────────────────────────────────────────────

export async function buildTodayDashboard(): Promise<TodayDashboard> {
  const date = todayISO();

  const [workouts, trackers, events, books, sessions, rootNodes] =
    await Promise.all([
      getWorkouts(),
      getTrackers(),
      getTrackerEvents(),
      getBooks(),
      getReadingSessions(),
      getListNodes(null),
    ]);

  const achievements: string[] = [];

  // ── Corpo ──
  const summary = getWeeklyWorkoutSummary(workouts, date);
  const todayWorkouts = workouts.filter((w) => w.date === date);
  const todayKm = todayWorkouts.reduce((s, w) => s + (w.runKm ?? 0), 0);
  const todayReps = todayWorkouts.reduce(
    (s, w) => s + (w.pullupSets ?? 0) * (w.pullupReps ?? 0),
    0,
  );
  let latestAchievement: string | null = null;
  if (todayKm > 0) {
    latestAchievement = `Você correu ${formatKm(todayKm)} km hoje`;
  } else if (todayReps > 0) {
    latestAchievement = `${todayReps} repetições hoje`;
  }
  if (latestAchievement) achievements.push(latestAchievement);

  // ── Ritmo ──
  const activeTrackers = trackers.filter((t) => t.isActive);
  const dashTrackers: DashboardTracker[] = activeTrackers
    .map((tracker) => {
      const day = getTrackerDayProgress(tracker, events, date);
      const isDoneToday =
        day.progress !== null ? day.done : events.some(
          (e) => e.trackerId === tracker.id && e.date === date,
        );
      const streakDays = calculateCurrentStreak(tracker, events, date);
      const journeyDays = getJourneyDays(events, tracker.id, date);
      return {
        tracker,
        todayValue: day.current,
        target: day.target,
        progress: day.progress ?? (isDoneToday ? 1 : 0),
        isDoneToday,
        streakDays,
        journeyDays,
        label: getContinuityLabel(streakDays, journeyDays),
      };
    })
    // Pendentes com meta primeiro (mais acionáveis), concluídos por último
    .sort((a, b) => {
      if (a.isDoneToday !== b.isDoneToday) return a.isDoneToday ? 1 : -1;
      if ((a.target !== null) !== (b.target !== null)) return a.target !== null ? -1 : 1;
      return 0;
    });

  const completedToday = dashTrackers.filter((t) => t.isDoneToday).length;
  const totalToday = dashTrackers.length;
  let mainMessage: string | null = null;
  if (totalToday > 0 && completedToday === totalToday) {
    mainMessage = 'Tudo concluído hoje';
    achievements.push('Todas as metas de ritmo batidas hoje');
  } else if (totalToday > 0) {
    mainMessage = `${totalToday - completedToday} pendente${totalToday - completedToday === 1 ? '' : 's'} hoje`;
  }
  const bestStreak = dashTrackers.reduce(
    (best, t) => (t.streakDays > (best?.streakDays ?? 1) ? t : best),
    null as DashboardTracker | null,
  );
  if (bestStreak && bestStreak.streakDays >= 3) {
    achievements.push(
      `${bestStreak.tracker.title}: ${bestStreak.streakDays} dias seguidos`,
    );
  }

  // ── Leitura ──
  const { book: currentBook, kind: currentBookKind } = pickCurrentBook(books, sessions);
  const todaySessions = sessions.filter((s) => s.date === date);
  const pagesReadToday = todaySessions.reduce((s, x) => s + x.pagesRead, 0);
  const lastSession =
    [...sessions].sort(
      (a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
    )[0] ?? null;
  const finishedToday = books.filter(
    (b) => b.status === 'FINISHED' && (b.finishedAt ?? '').startsWith(date),
  );
  if (pagesReadToday > 0) achievements.push(`${pagesReadToday} páginas lidas hoje`);
  for (const b of finishedToday) achievements.push(`Livro finalizado: ${b.title}`);

  // ── Listas ──
  const withChildren = await Promise.all(rootNodes.map((r) => getListNode(r.id)));
  const rootLists: DashboardRootList[] = withChildren.map((node) => {
    const children = node.children ?? [];
    const doneItems = children.filter((c) => c.isDone).length;
    return {
      node,
      totalItems: children.length,
      doneItems,
      progress: children.length > 0 ? doneItems / children.length : 0,
      updatedToday: node.updatedAt.startsWith(date),
    };
  });

  return {
    date,
    formattedDate: formatFullDate(date),
    timeProgress: timeProgress(date),
    body: {
      todayWorkouts,
      weeklyKm: summary.totalKm,
      weeklyPullupAverage: summary.avgRepsPerDay,
      weeklyWorkoutCount: summary.workoutDays,
      bestRunKm: summary.bestRun?.km ?? null,
      runKmSeries: getWeeklyRunKmSeries(workouts, date),
      pullupSeries: getWeeklyPullupSeries(workouts, date),
      latestAchievement,
    },
    rhythm: { trackers: dashTrackers, completedToday, totalToday, mainMessage },
    reading: {
      currentBook,
      currentBookKind,
      currentBookProgress: currentBook
        ? calculateReadingProgress(currentBook).percent / 100
        : 0,
      pagesReadToday,
      lastSession,
      notesToday: todaySessions.filter((s) => s.note).length,
      finishedToday,
      wantToRead: books.filter((b) => b.status === 'WANT_TO_READ'),
    },
    lists: {
      rootLists,
      updatedTodayCount: rootLists.filter((l) => l.updatedToday).length,
    },
    achievements,
  };
}

// Reexporta utilidades usadas pela Home junto do dashboard
export { toISODate, lastDays };
