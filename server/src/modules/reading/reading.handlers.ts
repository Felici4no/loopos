/**
 * Reading module — handlers
 * Módulo Leitura: biblioteca de livros e sessões de leitura.
 */

import type { RequestHandler } from 'express';
import type { CreateBookInput, UpdateBookInput, CreateReadingSessionInput } from '@loopos/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

// ─── Books ────────────────────────────────────────────────────────────────────

// GET /api/reading/books?status=READING
export const listBooks: RequestHandler = async (req, res, next) => {
  try {
    const { status } = req.query;

    const validStatuses = ['WANT_TO_READ', 'READING', 'FINISHED', 'DROPPED'];
    const statusFilter =
      typeof status === 'string' && validStatuses.includes(status)
        ? (status as 'WANT_TO_READ' | 'READING' | 'FINISHED' | 'DROPPED')
        : undefined;

    const books = await prisma.book.findMany({
      where: {
        userId: req.userId,
        ...(statusFilter ? { status: statusFilter } : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ data: books });
  } catch (err) {
    next(err);
  }
};

// GET /api/reading/books/:id
export const getBook: RequestHandler = async (req, res, next) => {
  try {
    const book = await prisma.book.findFirst({
      where: { id: req.params['id'], userId: req.userId },
      include: {
        sessions: { orderBy: { date: 'desc' }, take: 10 },
      },
    });

    if (!book) return next(new AppError('Livro não encontrado', 404, 'NOT_FOUND'));

    res.json({ data: book });
  } catch (err) {
    next(err);
  }
};

// POST /api/reading/books
export const createBook: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateBookInput;

    const book = await prisma.book.create({
      data: {
        userId: req.userId,
        title: body.title,
        author: body.author,
        totalPages: body.totalPages,
        currentPage: body.currentPage ?? 0,
        status: body.status ?? 'WANT_TO_READ',
        startedAt: body.startedAt ? new Date(body.startedAt) : undefined,
        finishedAt: body.finishedAt ? new Date(body.finishedAt) : undefined,
      },
    });

    res.status(201).json({ data: book });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/reading/books/:id
export const updateBook: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.book.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Livro não encontrado', 404, 'NOT_FOUND'));

    const body = req.body as UpdateBookInput;

    const updated = await prisma.book.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.author !== undefined && { author: body.author }),
        ...(body.totalPages !== undefined && { totalPages: body.totalPages }),
        ...(body.currentPage !== undefined && { currentPage: body.currentPage }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.startedAt !== undefined && body.startedAt !== null && {
          startedAt: new Date(body.startedAt),
        }),
        ...(body.finishedAt !== undefined && body.finishedAt !== null && {
          finishedAt: new Date(body.finishedAt),
        }),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/reading/books/:id
export const deleteBook: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.book.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Livro não encontrado', 404, 'NOT_FOUND'));

    await prisma.book.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};

// ─── Reading Sessions ─────────────────────────────────────────────────────────

// GET /api/reading/sessions?bookId=...&date=YYYY-MM-DD
export const listReadingSessions: RequestHandler = async (req, res, next) => {
  try {
    const { bookId, date } = req.query;

    const sessions = await prisma.readingSession.findMany({
      where: {
        userId: req.userId,
        ...(typeof bookId === 'string' ? { bookId } : {}),
        ...(typeof date === 'string' ? { date } : {}),
      },
      include: { book: { select: { title: true, author: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
};

// POST /api/reading/sessions
export const createReadingSession: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateReadingSessionInput;

    const book = await prisma.book.findFirst({
      where: { id: body.bookId, userId: req.userId },
    });

    if (!book) return next(new AppError('Livro não encontrado', 404, 'NOT_FOUND'));

    const session = await prisma.readingSession.create({
      data: {
        userId: req.userId,
        bookId: body.bookId,
        date: body.date,
        pagesRead: body.pagesRead,
        fromPage: body.fromPage,
        toPage: body.toPage,
        note: body.note,
      },
    });

    // Atualiza currentPage do livro se toPage foi informado e é maior que o atual
    if (body.toPage !== undefined && (book.currentPage === null || body.toPage > book.currentPage)) {
      await prisma.book.update({
        where: { id: book.id },
        data: { currentPage: body.toPage },
      });
    }

    res.status(201).json({ data: session });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/reading/sessions/:id
export const deleteReadingSession: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.readingSession.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Sessão não encontrada', 404, 'NOT_FOUND'));

    await prisma.readingSession.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
