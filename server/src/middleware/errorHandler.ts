/**
 * Error handler global do Express.
 * Captura todos os erros não tratados e retorna JSON padronizado.
 *
 * Formato de resposta de erro:
 * { "error": { "message": "...", "code": "..." } }
 */

import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        message: 'Dados de entrada inválidos',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        message: err.message,
        code: err.code,
      },
    });
    return;
  }

  // Unknown errors — never expose internals in production
  const isDev = process.env['NODE_ENV'] === 'development';

  console.error('[LoopOS] Unhandled error:', err);

  res.status(500).json({
    error: {
      message: isDev && err instanceof Error ? err.message : 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
    },
  });
};
