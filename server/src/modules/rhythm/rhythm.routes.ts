import { Router } from 'express';
import { validateBody } from '../../middleware/validateBody.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createTrackerSchema,
  updateTrackerSchema,
  createTrackerEventSchema,
} from '@loopos/shared';
import {
  listTrackers,
  createTracker,
  updateTracker,
  deleteTracker,
  listTrackerEvents,
  createTrackerEvent,
  deleteTrackerEvent,
} from './rhythm.handlers.js';

export const rhythmRouter = Router();

rhythmRouter.use(requireAuth);

rhythmRouter.get('/trackers', listTrackers);
rhythmRouter.post('/trackers', validateBody(createTrackerSchema), createTracker);
rhythmRouter.patch('/trackers/:id', validateBody(updateTrackerSchema), updateTracker);
rhythmRouter.delete('/trackers/:id', deleteTracker);

rhythmRouter.get('/events', listTrackerEvents);
rhythmRouter.post('/events', validateBody(createTrackerEventSchema), createTrackerEvent);
rhythmRouter.delete('/events/:id', deleteTrackerEvent);
