/**
 * GET /api/today
 *
 * Agregação real dos dados do dia corrente de cada módulo.
 * Não depende de nenhuma tabela `daily_entries` — ver ADR-009.
 *
 * Estrutura de resposta:
 * {
 *   date: "YYYY-MM-DD",
 *   body: WorkoutEntry | null,
 *   rhythm: (TrackerEvent & { tracker })[]
 *   reading: ReadingSession & { book } | null,
 *   lists: ListNode[]
 * }
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { todayISO } from '@loopos/shared';

export const todayRouter = Router();

todayRouter.use(requireAuth);

todayRouter.get('/', async (req, res, next) => {
  try {
    const date = todayISO();
    const userId = req.userId;

    const [workouts, rhythmEvents, readingSessions, listRoots] = await Promise.all([
      // Último treino do dia (pode haver mais de um, pegamos o mais recente)
      prisma.workoutEntry.findFirst({
        where: { userId, date },
        orderBy: { createdAt: 'desc' },
      }),

      // Todos os eventos de tracker do dia
      prisma.trackerEvent.findMany({
        where: { userId, date },
        include: { tracker: { select: { id: true, title: true, type: true } } },
        orderBy: { createdAt: 'asc' },
      }),

      // Última sessão de leitura do dia
      prisma.readingSession.findFirst({
        where: { userId, date },
        include: { book: { select: { id: true, title: true, author: true, currentPage: true, totalPages: true } } },
        orderBy: { createdAt: 'desc' },
      }),

      // Listas raiz movimentadas hoje (criadas ou atualizadas)
      prisma.listNode.findMany({
        where: {
          userId,
          parentId: null,
          updatedAt: { gte: new Date(`${date}T00:00:00.000Z`) },
        },
        orderBy: { position: 'asc' },
        take: 20,
      }),
    ]);

    res.json({
      date,
      body: workouts,
      rhythm: rhythmEvents,
      reading: readingSessions,
      lists: listRoots,
    });
  } catch (err) {
    next(err);
  }
});
