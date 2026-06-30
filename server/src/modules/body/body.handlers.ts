/**
 * Body module — handlers
 * Módulo Corpo: registro de treinos (WorkoutEntry).
 */

import type { RequestHandler } from 'express';
import type { CreateWorkoutEntryInput, UpdateWorkoutEntryInput } from '@loopos/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

// GET /api/body/workouts?date=YYYY-MM-DD
export const listWorkouts: RequestHandler = async (req, res, next) => {
  try {
    const { date } = req.query;

    const entries = await prisma.workoutEntry.findMany({
      where: {
        userId: req.userId,
        ...(typeof date === 'string' ? { date } : {}),
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ data: entries });
  } catch (err) {
    next(err);
  }
};

// GET /api/body/workouts/:id
export const getWorkout: RequestHandler = async (req, res, next) => {
  try {
    const entry = await prisma.workoutEntry.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!entry) return next(new AppError('Treino não encontrado', 404, 'NOT_FOUND'));

    res.json({ data: entry });
  } catch (err) {
    next(err);
  }
};

// POST /api/body/workouts
export const createWorkout: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateWorkoutEntryInput;

    const entry = await prisma.workoutEntry.create({
      data: {
        userId: req.userId,
        date: body.date,
        runKm: body.runKm,
        pullupSets: body.pullupSets,
        pullupReps: body.pullupReps,
        rawInput: body.rawInput,
        notes: body.notes,
      },
    });

    res.status(201).json({ data: entry });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/body/workouts/:id
export const updateWorkout: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.workoutEntry.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Treino não encontrado', 404, 'NOT_FOUND'));

    const body = req.body as UpdateWorkoutEntryInput;

    const updated = await prisma.workoutEntry.update({
      where: { id: existing.id },
      data: {
        ...(body.runKm !== undefined && { runKm: body.runKm }),
        ...(body.pullupSets !== undefined && { pullupSets: body.pullupSets }),
        ...(body.pullupReps !== undefined && { pullupReps: body.pullupReps }),
        ...(body.rawInput !== undefined && { rawInput: body.rawInput }),
        ...(body.notes !== undefined && { notes: body.notes }),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/body/workouts/:id
export const deleteWorkout: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.workoutEntry.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Treino não encontrado', 404, 'NOT_FOUND'));

    await prisma.workoutEntry.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
