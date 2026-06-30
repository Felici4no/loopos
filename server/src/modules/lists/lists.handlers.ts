/**
 * Lists module — handlers
 * Módulo Listas: nós hierárquicos (LIST → ITEM → subitem).
 *
 * Modelo de dados: ListNode com auto-referência via parentId.
 * - parentId = null → nó raiz (LIST)
 * - parentId = <id> → filho de outro nó (ITEM ou subitem)
 */

import type { RequestHandler } from 'express';
import type { CreateListNodeInput, UpdateListNodeInput } from '@loopos/shared';
import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';

// GET /api/lists/nodes?parentId=<id>
// Sem parentId → retorna raízes (listas). Com parentId → retorna filhos.
export const listNodes: RequestHandler = async (req, res, next) => {
  try {
    const { parentId } = req.query;

    const nodes = await prisma.listNode.findMany({
      where: {
        userId: req.userId,
        parentId: typeof parentId === 'string' ? parentId : null,
      },
      orderBy: { position: 'asc' },
    });

    res.json({ data: nodes });
  } catch (err) {
    next(err);
  }
};

// GET /api/lists/nodes/:id
export const getNode: RequestHandler = async (req, res, next) => {
  try {
    const node = await prisma.listNode.findFirst({
      where: { id: req.params['id'], userId: req.userId },
      include: {
        children: { orderBy: { position: 'asc' } },
      },
    });

    if (!node) return next(new AppError('Nó não encontrado', 404, 'NOT_FOUND'));

    res.json({ data: node });
  } catch (err) {
    next(err);
  }
};

// POST /api/lists/nodes
export const createNode: RequestHandler = async (req, res, next) => {
  try {
    const body = req.body as CreateListNodeInput;

    // Se parentId fornecido, verifica que pertence ao usuário
    if (body.parentId) {
      const parent = await prisma.listNode.findFirst({
        where: { id: body.parentId, userId: req.userId },
      });
      if (!parent) return next(new AppError('Nó pai não encontrado', 404, 'NOT_FOUND'));
    }

    const node = await prisma.listNode.create({
      data: {
        userId: req.userId,
        parentId: body.parentId,
        title: body.title,
        content: body.content,
        nodeType: body.nodeType ?? 'ITEM',
        position: body.position ?? 0,
        isDone: body.isDone ?? false,
      },
    });

    res.status(201).json({ data: node });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/lists/nodes/:id
export const updateNode: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.listNode.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Nó não encontrado', 404, 'NOT_FOUND'));

    const body = req.body as UpdateListNodeInput;

    const updated = await prisma.listNode.update({
      where: { id: existing.id },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.content !== undefined && { content: body.content }),
        ...(body.position !== undefined && { position: body.position }),
        ...(body.isDone !== undefined && { isDone: body.isDone }),
      },
    });

    res.json({ data: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/lists/nodes/:id
// Cascade no banco apaga todos os filhos automaticamente.
export const deleteNode: RequestHandler = async (req, res, next) => {
  try {
    const existing = await prisma.listNode.findFirst({
      where: { id: req.params['id'], userId: req.userId },
    });

    if (!existing) return next(new AppError('Nó não encontrado', 404, 'NOT_FOUND'));

    await prisma.listNode.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
