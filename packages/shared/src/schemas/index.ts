/**
 * @loopos/shared — Zod Schemas
 *
 * Fonte de verdade dos contratos de entrada da API.
 * Todos os schemas de criação e atualização vivem aqui e são compartilhados
 * entre server (validação) e mobile/web (formulários).
 *
 * Tipos de resposta da API devem ser inferidos de @prisma/client no server.
 * Estes schemas cobrem apenas os payloads de entrada (create / update).
 */

import { z } from 'zod';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD')
  .refine((v) => !isNaN(Date.parse(v)), 'Data inválida');

const positiveInt = z.number().int().positive();
const positiveFloat = z.number().positive();

// ─── Body / WorkoutEntry ─────────────────────────────────────────────────────

export const createWorkoutEntrySchema = z.object({
  date: isoDate,
  runKm: positiveFloat.optional(),
  pullupSets: positiveInt.optional(),
  pullupReps: positiveInt.optional(),
  rawInput: z.string().max(2000).optional(),
  notes: z.string().max(2000).optional(),
});

export const updateWorkoutEntrySchema = createWorkoutEntrySchema.partial().omit({ date: true });

export type CreateWorkoutEntryInput = z.infer<typeof createWorkoutEntrySchema>;
export type UpdateWorkoutEntryInput = z.infer<typeof updateWorkoutEntrySchema>;

// ─── Rhythm / Tracker ────────────────────────────────────────────────────────

const trackerType = z.enum(['boolean', 'count', 'duration']);

export const createTrackerSchema = z.object({
  title: z.string().min(1).max(100),
  type: trackerType.default('boolean'),
  target: positiveInt.optional(),
  isActive: z.boolean().default(true),
});

export const updateTrackerSchema = createTrackerSchema.partial();

export type CreateTrackerInput = z.infer<typeof createTrackerSchema>;
export type UpdateTrackerInput = z.infer<typeof updateTrackerSchema>;

// ─── Rhythm / TrackerEvent ───────────────────────────────────────────────────

const trackerEventType = z.enum(['check', 'value']);

export const createTrackerEventSchema = z.object({
  trackerId: z.string().min(1, 'trackerId obrigatório'),
  date: isoDate,
  eventType: trackerEventType.default('check'),
  value: z.number().optional(),
  note: z.string().max(500).optional(),
});

export type CreateTrackerEventInput = z.infer<typeof createTrackerEventSchema>;

// ─── Reading / Book ──────────────────────────────────────────────────────────

const bookStatus = z.enum(['WANT_TO_READ', 'READING', 'FINISHED', 'DROPPED']);

export const createBookSchema = z.object({
  title: z.string().min(1).max(300),
  author: z.string().max(200).optional(),
  totalPages: positiveInt.optional(),
  currentPage: z.number().int().min(0).optional(),
  status: bookStatus.default('WANT_TO_READ'),
  startedAt: z.string().datetime({ offset: true }).optional(),
  finishedAt: z.string().datetime({ offset: true }).optional(),
});

export const updateBookSchema = createBookSchema.partial();

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;

// ─── Reading / ReadingSession ─────────────────────────────────────────────────

export const createReadingSessionSchema = z
  .object({
    bookId: z.string().min(1, 'bookId obrigatório'),
    date: isoDate,
    pagesRead: positiveInt,
    fromPage: z.number().int().min(1).optional(),
    toPage: z.number().int().min(1).optional(),
    note: z.string().max(1000).optional(),
  })
  .refine(
    (data) => {
      if (data.fromPage !== undefined && data.toPage !== undefined) {
        return data.toPage >= data.fromPage;
      }
      return true;
    },
    { message: 'toPage deve ser maior ou igual a fromPage', path: ['toPage'] },
  );

export type CreateReadingSessionInput = z.infer<typeof createReadingSessionSchema>;

// ─── Lists / ListNode ────────────────────────────────────────────────────────

const listNodeType = z.enum(['LIST', 'ITEM']);

export const createListNodeSchema = z.object({
  parentId: z.string().min(1, 'parentId obrigatório').optional(),
  title: z.string().min(1).max(500),
  content: z.string().max(5000).optional(),
  nodeType: listNodeType.default('ITEM'),
  position: z.number().int().min(0).default(0),
  isDone: z.boolean().default(false),
});

export const updateListNodeSchema = createListNodeSchema
  .partial()
  .omit({ parentId: true, nodeType: true });

export type CreateListNodeInput = z.infer<typeof createListNodeSchema>;
export type UpdateListNodeInput = z.infer<typeof updateListNodeSchema>;
