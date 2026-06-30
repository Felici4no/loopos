import { Router } from 'express';
import { validateBody } from '../../middleware/validateBody.js';
import { requireAuth } from '../../middleware/auth.js';
import { createListNodeSchema, updateListNodeSchema } from '@loopos/shared';
import { listNodes, getNode, createNode, updateNode, deleteNode } from './lists.handlers.js';

export const listsRouter = Router();

listsRouter.use(requireAuth);

listsRouter.get('/nodes', listNodes);
listsRouter.get('/nodes/:id', getNode);
listsRouter.post('/nodes', validateBody(createListNodeSchema), createNode);
listsRouter.patch('/nodes/:id', validateBody(updateListNodeSchema), updateNode);
listsRouter.delete('/nodes/:id', deleteNode);
