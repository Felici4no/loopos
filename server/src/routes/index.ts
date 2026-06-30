/**
 * Roteador raiz da API.
 * Todos os módulos ativos na Etapa 3.
 */

import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { todayRouter } from '../modules/today/today.routes.js';
import { bodyRouter } from '../modules/body/body.routes.js';
import { rhythmRouter } from '../modules/rhythm/rhythm.routes.js';
import { readingRouter } from '../modules/reading/reading.routes.js';
import { listsRouter } from '../modules/lists/lists.routes.js';

export const apiRouter = Router();

apiRouter.use('/today', todayRouter);
apiRouter.use('/body', bodyRouter);
apiRouter.use('/rhythm', rhythmRouter);
apiRouter.use('/reading', readingRouter);
apiRouter.use('/lists', listsRouter);

export { healthRouter };
