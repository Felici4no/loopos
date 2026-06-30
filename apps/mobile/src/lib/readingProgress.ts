/**
 * Helpers de progresso de leitura.
 * Funções puras — sem dependências externas.
 *
 * Temporário no mobile. Pode migrar para @loopos/shared
 * quando o server precisar de lógica de progresso (ex: resumos automáticos).
 */

import type { Book } from '../types/reading.js';

export interface ReadingProgress {
  current: number;   // página atual (0 se null)
  total: number;     // total de páginas (0 se null)
  percent: number;   // 0–100, arredondado para inteiro
  isComplete: boolean;
}

/**
 * Calcula o progresso de leitura de um livro.
 * Protege divisão por zero; clamp entre 0 e 100.
 */
export function calculateReadingProgress(book: Pick<Book, 'currentPage' | 'totalPages'>): ReadingProgress {
  const current = book.currentPage ?? 0;
  const total = book.totalPages ?? 0;

  if (total <= 0) {
    return { current, total, percent: 0, isComplete: false };
  }

  const raw = (current / total) * 100;
  const percent = Math.min(100, Math.max(0, Math.round(raw)));
  const isComplete = current >= total;

  return { current, total, percent: isComplete ? 100 : percent, isComplete };
}

/**
 * Retorna label visual de progresso.
 * Ex: "142 / 280 páginas · 51%"
 *     "280 / 280 páginas · 100% ✓"
 *     "Páginas não definidas"
 */
export function formatReadingProgress(book: Pick<Book, 'currentPage' | 'totalPages'>): string {
  const { current, total, percent, isComplete } = calculateReadingProgress(book);

  if (total === 0) return 'Páginas não definidas';

  const done = isComplete ? ' ✓' : '';
  return `${current} / ${total} páginas · ${percent}%${done}`;
}

/**
 * Retorna label curto para uso em cards compactos.
 * Ex: "p.142/280" ou "p.0/280"
 */
export function getBookProgressLabel(book: Pick<Book, 'currentPage' | 'totalPages'>): string {
  const current = book.currentPage ?? 0;
  const total = book.totalPages ?? 0;
  if (total === 0) return '—';
  return `p.${current}/${total}`;
}
