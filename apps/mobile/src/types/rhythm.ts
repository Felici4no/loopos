/**
 * Tipos do módulo Ritmo (Tracker + TrackerEvent).
 *
 * Tracker.type e TrackerEvent.eventType são strings no Prisma (sem enum).
 * Valores reais usados no banco e validados pelo Zod no server:
 *   Tracker.type:       'boolean' | 'count' | 'duration'
 *   TrackerEvent.eventType: 'check' | 'value'
 */

export type TrackerType = 'boolean' | 'count' | 'duration';
export type TrackerEventType = 'check' | 'value';

export interface Tracker {
  id: string;
  userId: string;
  title: string;
  type: TrackerType;
  target: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackerEvent {
  id: string;
  userId: string;
  trackerId: string;
  date: string;           // YYYY-MM-DD
  eventType: TrackerEventType;
  value: number | null;
  note: string | null;
  createdAt: string;
  tracker?: Pick<Tracker, 'id' | 'title' | 'type' | 'target'>;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateTrackerPayload {
  title: string;
  type: TrackerType;
  target?: number | null;
  isActive?: boolean;
}

export interface UpdateTrackerPayload {
  title?: string;
  type?: TrackerType;
  target?: number | null;
  isActive?: boolean;
}

export interface CreateTrackerEventPayload {
  trackerId: string;
  date: string;
  eventType: TrackerEventType;
  value?: number | null;
  note?: string | null;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface TrackerResponse { data: Tracker }
export interface TrackersResponse { data: Tracker[] }
export interface TrackerEventResponse { data: TrackerEvent }
export interface TrackerEventsResponse { data: TrackerEvent[] }
