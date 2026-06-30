/**
 * LoopOS API Server — Entry Point
 *
 * Carrega variáveis de ambiente, valida, inicia o servidor HTTP.
 */

import { env } from './env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`[LoopOS API] Running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`[LoopOS API] ${signal} recebido — encerrando...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('[LoopOS API] Encerrado com sucesso.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
