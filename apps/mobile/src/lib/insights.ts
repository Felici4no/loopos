/**
 * Insights locais do LoopOS — funções puras derivadas dos dados reais.
 *
 * Tudo aqui é calculado a partir dos arrays vindos do localDb (via data.ts):
 * workoutEntries, trackers, trackerEvents, books, readingSessions.
 * Nada é fixo/mockado.
 */

import type { WorkoutEntry } from '../types/workout.js';
import type { Tracker } from '../types/rhythm.js';
import type { RhythmEventSummary } from '../types/today.js';

// ─── Datas ────────────────────────────────────────────────────────────────────

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const WEEKDAY_INITIALS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;

export interface DayRef {
  iso: string;
  label: string;
}

/** Últimos `n` dias terminando em `endIso` (inclusive). */
export function lastDays(endIso: string, n: number): DayRef[] {
  const end = parseISODate(endIso);
  const out: DayRef[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86_400_000);
    out.push({ iso: toISODate(d), label: WEEKDAY_INITIALS[d.getDay()] ?? '' });
  }
  return out;
}

/** Quanto da semana/mês/ano já passou (0–1). */
export function timeProgress(iso: string): { week: number; month: number; year: number } {
  const d = parseISODate(iso);
  const mondayIndex = (d.getDay() + 6) % 7; // seg=0 ... dom=6
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const dayOfYear =
    Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000) + 1;
  const daysInYear =
    (new Date(d.getFullYear() + 1, 0, 1).getTime() - startOfYear.getTime()) /
    86_400_000;
  return {
    week: (mondayIndex + 1) / 7,
    month: d.getDate() / daysInMonth,
    year: dayOfYear / daysInYear,
  };
}

export function formatKm(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace('.', ',');
}

// ─── Corpo ────────────────────────────────────────────────────────────────────

export interface SeriesPoint {
  label: string;
  value: number;
  emphasis?: boolean;
}

/** Km corridos por dia nos últimos 7 dias (último dia em destaque). */
export function getWeeklyRunKmSeries(
  workouts: WorkoutEntry[],
  endIso: string,
): SeriesPoint[] {
  return lastDays(endIso, 7).map((day, i, arr) => ({
    label: day.label,
    emphasis: i === arr.length - 1,
    value: workouts
      .filter((w) => w.date === day.iso)
      .reduce((sum, w) => sum + (w.runKm ?? 0), 0),
  }));
}

/** Volume de repetições (séries × reps) por dia nos últimos 7 dias. */
export function getWeeklyPullupSeries(
  workouts: WorkoutEntry[],
  endIso: string,
): SeriesPoint[] {
  return lastDays(endIso, 7).map((day, i, arr) => ({
    label: day.label,
    emphasis: i === arr.length - 1,
    value: workouts
      .filter((w) => w.date === day.iso)
      .reduce((sum, w) => sum + (w.pullupSets ?? 0) * (w.pullupReps ?? 0), 0),
  }));
}

export interface WeeklyWorkoutSummary {
  totalKm: number;
  totalReps: number;
  avgRepsPerDay: number;
  workoutDays: number;
  /** Dia com maior km na janela, se houver corrida. */
  bestRun: { iso: string; km: number } | null;
}

/** Resumo dos últimos 7 dias de treino. */
export function getWeeklyWorkoutSummary(
  workouts: WorkoutEntry[],
  endIso: string,
): WeeklyWorkoutSummary {
  const days = lastDays(endIso, 7);
  const inWindow = workouts.filter((w) => days.some((d) => d.iso === w.date));

  const totalKm = inWindow.reduce((s, w) => s + (w.runKm ?? 0), 0);
  const totalReps = inWindow.reduce(
    (s, w) => s + (w.pullupSets ?? 0) * (w.pullupReps ?? 0),
    0,
  );
  const workoutDays = new Set(inWindow.map((w) => w.date)).size;

  let bestRun: WeeklyWorkoutSummary['bestRun'] = null;
  for (const day of days) {
    const km = inWindow
      .filter((w) => w.date === day.iso)
      .reduce((s, w) => s + (w.runKm ?? 0), 0);
    if (km > 0 && (bestRun === null || km > bestRun.km)) {
      bestRun = { iso: day.iso, km };
    }
  }

  return {
    totalKm,
    totalReps,
    avgRepsPerDay: Math.round(totalReps / 7),
    workoutDays,
    bestRun,
  };
}

// ─── Ritmo ────────────────────────────────────────────────────────────────────

export interface TrackerDayProgress {
  current: number;
  target: number | null;
  done: boolean;
  /** 0–1 quando há meta numérica; null para booleans/sem meta. */
  progress: number | null;
}

/**
 * Progresso do tracker no dia, a partir dos eventos (qualquer formato que
 * tenha trackerId/tracker.id, date, value).
 */
export function getTrackerDayProgress(
  tracker: Tracker,
  events: Array<{ trackerId?: string; tracker?: { id: string }; date?: string; value: number | null }>,
  date?: string,
): TrackerDayProgress {
  const mine = events.filter((e) => {
    const id = e.trackerId ?? e.tracker?.id;
    if (id !== tracker.id) return false;
    return date === undefined || e.date === undefined || e.date === date;
  });
  const current = mine.reduce((s, e) => s + (e.value ?? 0), 0);
  const checked = mine.length > 0;

  if (tracker.type === 'boolean' || tracker.target === null) {
    return { current, target: tracker.target, done: checked, progress: null };
  }
  return {
    current,
    target: tracker.target,
    done: current >= tracker.target,
    progress: Math.min(current / tracker.target, 1),
  };
}

// ─── Jornada ──────────────────────────────────────────────────────────────────

/**
 * Dias de jornada do tracker: distância em dias corridos desde o primeiro
 * evento (inclusive) até a data de referência. 0 se não há eventos.
 * Ex.: primeiro evento há 5 dias → jornada de 6 dias (o dia 1 conta).
 */
export function getJourneyDays(
  events: Array<{ trackerId?: string; date: string }>,
  trackerId: string,
  today: string,
): number {
  const dates = events
    .filter((e) => (e.trackerId ?? '') === trackerId)
    .map((e) => e.date)
    .sort();
  const first = dates[0];
  if (!first) return 0;
  const diff = Math.round(
    (parseISODate(today).getTime() - parseISODate(first).getTime()) / 86_400_000,
  );
  return Math.max(diff + 1, 1);
}

/**
 * Label curto de continuidade para a Home:
 * streak ativo tem prioridade; senão a jornada; senão null.
 */
export function getContinuityLabel(streakDays: number, journeyDays: number): string | null {
  if (streakDays >= 2) return `${streakDays} dias seguidos`;
  if (journeyDays >= 2) return `jornada de ${journeyDays} dias`;
  return null;
}

// ─── Mensagens de sucesso ─────────────────────────────────────────────────────

/** Mensagem após registrar treino. */
export function getWorkoutSuccessMessage(parsed: {
  runKm?: number | null;
  pullupSets?: number | null;
  pullupReps?: number | null;
}): string {
  const km = parsed.runKm ?? 0;
  const reps = (parsed.pullupSets ?? 0) * (parsed.pullupReps ?? 0);
  if (km > 0 && reps > 0) {
    return `Parabéns! ${formatKm(km)} km e ${reps} repetições registradas.`;
  }
  if (km > 0) return `Parabéns! Você correu ${formatKm(km)} km hoje.`;
  if (reps > 0) return `Boa! Você registrou ${reps} repetições.`;
  return 'Treino registrado.';
}

/** Mensagem após registrar sessão de leitura. */
export function getReadingSuccessMessage(pages: number, finished: boolean): string {
  if (finished) return 'Livro finalizado — 100% concluído. Parabéns!';
  return `Você leu ${pages} página${pages === 1 ? '' : 's'} hoje.`;
}

/** Mensagem após registrar evento de tracker. */
export function getTrackerSuccessMessage(
  tracker: Tracker,
  progressAfter: TrackerDayProgress,
): string {
  if (tracker.type === 'boolean' || tracker.target === null) {
    return `${tracker.title} registrado hoje.`;
  }
  if (progressAfter.done) {
    return `Meta de ${tracker.title} batida: ${progressAfter.current}/${tracker.target}.`;
  }
  return `${tracker.title}: ${progressAfter.current}/${tracker.target} hoje.`;
}

// Reexporta o tipo usado pelas telas para montar progressos do dia a partir
// da resposta de getToday() (RhythmEventSummary) sem conversões manuais.
export type { RhythmEventSummary };
