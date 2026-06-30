import { Router } from 'express';
import { validateBody } from '../../middleware/validateBody.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createBookSchema,
  updateBookSchema,
  createReadingSessionSchema,
} from '@loopos/shared';
import {
  listBooks,
  getBook,
  createBook,
  updateBook,
  deleteBook,
  listReadingSessions,
  createReadingSession,
  deleteReadingSession,
} from './reading.handlers.js';

export const readingRouter = Router();

readingRouter.use(requireAuth);

readingRouter.get('/books', listBooks);
readingRouter.get('/books/:id', getBook);
readingRouter.post('/books', validateBody(createBookSchema), createBook);
readingRouter.patch('/books/:id', validateBody(updateBookSchema), updateBook);
readingRouter.delete('/books/:id', deleteBook);

readingRouter.get('/sessions', listReadingSessions);
readingRouter.post('/sessions', validateBody(createReadingSessionSchema), createReadingSession);
readingRouter.delete('/sessions/:id', deleteReadingSession);
