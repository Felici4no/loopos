/**
 * Autenticação mínima para v0.1.
 *
 * Lê o userId do header `x-user-id`. Sem JWT nem Supabase Auth ainda —
 * isso é scaffolding suficiente para os CRUDs funcionarem end-to-end
 * antes de integrar autenticação real na Etapa 4.
 *
 * NUNCA usar em produção sem substituir por Supabase Auth / JWT.
 */

import type { RequestHandler } from 'express';
import { AppError } from './errorHandler.js';

// Extende o tipo Request do Express para incluir userId
declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const userId = req.headers['x-user-id'];

  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    next(new AppError('Header x-user-id obrigatório', 401, 'UNAUTHORIZED'));
    return;
  }

  req.userId = userId.trim();
  next();
};
