/**
 * Rhythm module — handlers
 * Módulo Ritmo: trackers de hábitos e eventos diários.
 */

import type { RequestHandler } from 'express';
import type { CreateTrackerInput, UpdateTrackerInput, CreateTrackerEventInput } from '@loopos/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─── Trackers ─────────────────────────────────────────────────────────────────

// GET /api/rhythm/trackers
export const listTrackers: RequestHandler = async (req, res, next) => {
  try {
    const trackers = await prisma.tracker.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: trackers });
  } catch (err) {
    next(err);
  }
};

// POST /api/rhythm/trackers
export const createTracker: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateTrackerInput;

    const tracker = await prisma.tracker.create({
      data: {
        userId: req.userId,
        title: body.title,
        type: body.type ?? 'boolean',
        target: body.target,
        isActive: body.isActive ?? true,
      },
    });

    res.status(201).json({ data: tracker });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/rhythm/trackers/:id
export const updateTracker: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.tracker.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Tracker não encontrado', 404, 'NOT_FOUND'));

    const body = req.body as UpdateTrackerInput;

    const updated = await prisma.tracker.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.type !== undefined && { type: body.type }),
        ...(body.target !== undefined && { target: body.target }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rhythm/trackers/:id
export const deleteTracker: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.tracker.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Tracker não encontrado', 404, 'NOT_FOUND'));

    await prisma.tracker.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Tracker Events ───────────────────────────────────────────────────────────

// GET /api/rhythm/events?date=YYYY-MM-DD
export const listTrackerEvents: RequestHandler = async (req, res, next) => {
  try {
    const { date, trackerId } = req.query;

    const events = await prisma.trackerEvent.findMany({
      where: {
        userId: req.userId,
        ...(typeof date === 'string' ? { date } : {}),
        ...(typeof trackerId === 'string' ? { trackerId } : {}),
      },
      include: { tracker: { select: { title: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: events });
  } catch (err) {
    next(err);
  }
};

// POST /api/rhythm/events
export const createTrackerEvent: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateTrackerEventInput;

    // Verifica que o tracker pertence ao usuário
    const tracker = await prisma.tracker.findFirst({
      where: { id: body.trackerId, userId: req.userId },
    });

    if (!tracker) return next(new AppError('Tracker não encontrado', 404, 'NOT_FOUND'));

    const event = await prisma.trackerEvent.create({
      data: {
        trackerId: body.trackerId,
        userId: req.userId,
        date: body.date,
        eventType: body.eventType ?? 'check',
        value: body.value,
        note: body.note,
      },
    });

    res.status(201).json({ data: event });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rhythm/events/:id
export const deleteTrackerEvent: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.trackerEvent.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Evento não encontrado', 404, 'NOT_FOUND'));

    await prisma.trackerEvent.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
