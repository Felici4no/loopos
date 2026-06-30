/**
 * LoopOS API — configuração do Express.
 *
 * Separado de index.ts para permitir testes de integração
 * sem iniciar o servidor HTTP.
 */

import express from 'express';
import cors from 'cors';
import { healthRouter, apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  // ─── Middleware global ──────────────────────────────────────────────────────
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── Routes ────────────────────────────────────────────────────────────────
  app.use('/health', healthRouter);
  app.use('/api', apiRouter);

  // ─── 404 ───────────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({
      error: { message: 'Rota não encontrada', code: 'NOT_FOUND' },
    });
  });

  // ─── Error handler (deve ser o último middleware) ──────────────────────────
  app.use(errorHandler);

  return app;
}
