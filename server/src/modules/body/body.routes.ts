import { Router } from 'express';
import { validateBody } from '../../middleware/validateBody.js';
import { requireAuth } from '../../middleware/auth.js';
import {
  createWorkoutEntrySchema,
  updateWorkoutEntrySchema,
} from '@loopos/shared';
import {
  listWorkouts,
  getWorkout,
  createWorkout,
  updateWorkout,
  deleteWorkout,
} from './body.handlers.js';

export const bodyRouter = Router();

bodyRouter.use(requireAuth);

bodyRouter.get('/workouts', listWorkouts);
bodyRouter.get('/workouts/:id', getWorkout);
bodyRouter.post('/workouts', validateBody(createWorkoutEntrySchema), createWorkout);
bodyRouter.patch('/workouts/:id', validateBody(updateWorkoutEntrySchema), updateWorkout);
bodyRouter.delete('/workouts/:id', deleteWorkout);
