/**
 * Debug endpoints — disponíveis APENAS em NODE_ENV !== "production".
 *
 * GET /api/debug/me  → retorna o usuário autenticado via x-user-id
 *
 * Útil para validar que o header está sendo lido corretamente durante
 * o desenvolvimento, antes de integrar Supabase Auth.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../lib/prisma.js';

export const debugRouter = Router();

debugRouter.use(requireAuth);

// GET /api/debug/me
debugRouter.get('/me', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            workoutEntries: true,
            trackers: true,
            books: true,
            readingSessions: true,
            listNodes: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        error: {
          message: `Usuário "${req.userId}" não encontrado no banco. Execute o seed primeiro.`,
          code: 'NOT_FOUND',
          hint: 'pnpm --filter @loopos/server prisma:seed',
        },
      });
      return;
    }

    res.json({
      debug: true,
      userId: req.userId,
      user,
    });
  } catch (err) {
    next(err);
  }
});
