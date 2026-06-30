/**
 * GET /api/today
 *
 * Agregação real dos dados do dia corrente de cada módulo.
 * Não depende de nenhuma tabela `daily_entries` — ver ADR-009.
 *
 * Estrutura de resposta:
 * {
 *   date: "YYYY-MM-DD",
 *   workouts:  WorkoutEntry[],
 *   rhythm:    (TrackerEvent & { tracker })[],
 *   reading:   (ReadingSession & { book })[],
 *   lists:     ListNode[]
 * }
 *
 * Nota sobre timezone: o servidor usa UTC internamente.
 * A data enviada pelo cliente (YYYY-MM-DD) define a janela de busca.
 * Se o cliente não enviar ?date=, usa a data UTC atual do servidor.
 * Para o MVP v0.1, isso é aceitável — timezone por usuário entra na Etapa 4.
 */

import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { prisma } from '../../lib/prisma.js';
import { todayISO, isValidISODate } from '@loopos/shared';

export const todayRouter = Router();

todayRouter.use(requireAuth);

todayRouter.get('/', async (req, res, next) => {
  try {
    // Aceita ?date=YYYY-MM-DD do cliente ou usa data UTC do servidor
    const dateParam = req.query['date'];
    const date =
      typeof dateParam === 'string' && isValidISODate(dateParam)
        ? dateParam
        : todayISO();

    const userId = req.userId;

    // Início e fim do dia em UTC para filtro de updatedAt das listas
    const startOfDayUTC = new Date(`${date}T00:00:00.000Z`);
    const endOfDayUTC = new Date(`${date}T23:59:59.999Z`);

    const [workouts, rhythmEvents, readingSessions, listRoots] = await Promise.all([
      // Todos os treinos do dia (ordenados por criação)
      prisma.workoutEntry.findMany({
        where: { userId, date },
        orderBy: { createdAt: 'desc' },
      }),

      // Todos os eventos de tracker do dia com dados do tracker
      prisma.trackerEvent.findMany({
        where: { userId, date },
        include: {
          tracker: { select: { id: true, title: true, type: true, target: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Todas as sessões de leitura do dia com dados do livro
      prisma.readingSession.findMany({
        where: { userId, date },
        include: {
          book: {
            select: { id: true, title: true, author: true, currentPage: true, totalPages: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),

      // Listas raiz criadas ou atualizadas no dia
      prisma.listNode.findMany({
        where: {
          userId,
          parentId: null,
          updatedAt: { gte: startOfDayUTC, lte: endOfDayUTC },
        },
        orderBy: { position: 'asc' },
        take: 20,
      }),
    ]);

    res.json({
      date,
      workouts,
      rhythm: rhythmEvents,
      reading: readingSessions,
      lists: listRoots,
    });
  } catch (err) {
    next(err);
  }
});
