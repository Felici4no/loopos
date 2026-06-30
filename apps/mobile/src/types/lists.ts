/**
 * Tipos do módulo Listas (ListNode).
 *
 * nodeType é enum Prisma real (não string livre como Tracker.type):
 *   enum ListNodeType { LIST, ITEM }
 *
 * parentId = null/omitido → nó raiz (LIST)
 * parentId = <id>         → filho de outro nó (ITEM ou subitem)
 *
 * Update não permite alterar parentId nem nodeType (ver updateListNodeSchema
 * no server — .omit({ parentId: true, nodeType: true })).
 */

export type ListNodeType = 'LIST' | 'ITEM';

export interface ListNode {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  content: string | null;
  nodeType: ListNodeType;
  position: number;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  children?: ListNode[];   // presente apenas em GET /nodes/:id
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateListNodePayload {
  parentId?: string | null;
  title: string;
  content?: string | null;
  nodeType?: ListNodeType;
  position?: number;
  isDone?: boolean;
}

export interface UpdateListNodePayload {
  title?: string;
  content?: string | null;
  position?: number;
  isDone?: boolean;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface ListNodeResponse { data: ListNode }
export interface ListNodesResponse { data: ListNode[] }
