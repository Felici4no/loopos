/**
 * Helpers de estatísticas do módulo Ritmo.
 *
 * Trabalham com datas no formato YYYY-MM-DD (string) para evitar
 * problemas de timezone ao comparar dias — sem instanciar Date com horário.
 *
 * Temporário no mobile. Pode migrar para @loopos/shared quando o server
 * precisar calcular streaks para resumos automáticos (v0.5).
 *
 * Decisão de streak:
 *   - Se houver evento hoje → streak inclui hoje e dias anteriores consecutivos.
 *   - Se não houver evento hoje → streak é a sequência encerrada ontem
 *     (ou 0 se ontem também não tiver evento).
 *   - "Consecutivo" significa dias adjacentes sem lacunas.
 *   - Não considera metas (target) — apenas presença de evento na data.
 *
 * Anti-duplicidade:
 *   Feita no cliente por enquanto (hasEventToday). Deve virar regra de
 *   backend (unique constraint em tracker_id + date) em etapa futura.
 */

import type { Tracker, TrackerEvent } from '../types/rhythm.js';

// ─── Date helpers (YYYY-MM-DD, sem Date com horário) ─────────────────────────

/** Subtrai N dias de uma string YYYY-MM-DD. Puro, sem Date de horário. */
function subtractDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 0, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() - days);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Formata uma data YYYY-MM-DD em display curto. Ex: "27/06" */
export function formatShortDate(isoDate: string): string {
  const [, m, d] = isoDate.split('-');
  return `${d}/${m}`;
}

// ─── Core helpers ─────────────────────────────────────────────────────────────

/**
 * Retorna todos os eventos de um tracker específico.
 */
function eventsForTracker(tracker: Tracker, events: TrackerEvent[]): TrackerEvent[] {
  return events.filter((e) => e.trackerId === tracker.id);
}

/**
 * Verifica se existe evento do tracker na data fornecida.
 */
export function hasEventToday(
  tracker: Tracker,
  events: TrackerEvent[],
  date: string,
): boolean {
  return eventsForTracker(tracker, events).some((e) => e.date === date);
}

/**
 * Retorna a data mais recente com evento para o tracker.
 * Retorna null se não houver nenhum evento.
 */
export function getLastEventDate(tracker: Tracker, events: TrackerEvent[]): string | null {
  const mine = eventsForTracker(tracker, events);
  if (mine.length === 0) return null;
  // Datas YYYY-MM-DD ordenam lexicograficamente de forma correta
  return mine.map((e) => e.date).sort().at(-1) ?? null;
}

/**
 * Calcula o streak atual do tracker.
 *
 * Algoritmo:
 *   1. Coleta as datas únicas com evento, em ordem decrescente.
 *   2. A partir de "hoje", conta dias consecutivos com evento.
 *   3. Se hoje não tem evento, tenta a partir de ontem (streak passado).
 *   4. Para cada dia verificado, avança para o anterior e repete.
 *
 * Retorna: número de dias consecutivos (0 se não houver sequência).
 */
export function calculateCurrentStreak(
  tracker: Tracker,
  events: TrackerEvent[],
  today: string,
): number {
  const dates = new Set(eventsForTracker(tracker, events).map((e) => e.date));
  if (dates.size === 0) return 0;

  // Começa de hoje; se não tiver evento hoje, começa de ontem
  let cursor = dates.has(today) ? today : subtractDays(today, 1);

  // Se nem ontem tem evento, streak é 0
  if (!dates.has(cursor)) return 0;

  let streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = subtractDays(cursor, 1);
    // Limite de segurança: máximo 3650 dias (~10 anos)
    if (streak > 3650) break;
  }

  return streak;
}

/**
 * Retorna label de status para o card do tracker.
 * Ex: "✓ feito hoje", "pendente", "3 dias seguidos"
 */
export function getTrackerStatusLabel(
  tracker: Tracker,
  events: TrackerEvent[],
  date: string,
): string {
  const done = hasEventToday(tracker, events, date);
  const streak = calculateCurrentStreak(tracker, events, date);
  const last = getLastEventDate(tracker, events);

  if (done) {
    if (streak >= 2) return `✓ ${streak} dias seguidos`;
    return '✓ feito hoje';
  }

  if (streak > 0) {
    // Streak encerrado ontem
    return `${streak} dia${streak > 1 ? 's' : ''} — retome hoje`;
  }

  if (last) {
    return `último: ${formatShortDate(last)}`;
  }

  return 'pendente';
}

/** Retorna o valor numérico de um evento 'value', ou null. */
export function getEventValue(
  tracker: Tracker,
  events: TrackerEvent[],
  date: string,
): number | null {
  const ev = eventsForTracker(tracker, events).find(
    (e) => e.date === date && e.eventType === 'value',
  );
  return ev?.value ?? null;
}
