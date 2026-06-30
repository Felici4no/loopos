/**
 * Tipos do módulo Leitura (Book + ReadingSession).
 *
 * BookStatus espelha o enum Prisma do server:
 *   WANT_TO_READ | READING | FINISHED | DROPPED
 *
 * (O prompt sugeria PLANNED/ABANDONED — mantidos os valores reais do banco.)
 */

export type BookStatus = 'WANT_TO_READ' | 'READING' | 'FINISHED' | 'DROPPED';

export interface Book {
  id: string;
  userId: string;
  title: string;
  author: string | null;
  totalPages: number | null;
  currentPage: number | null;
  status: BookStatus;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  date: string;         // YYYY-MM-DD
  pagesRead: number;
  fromPage: number | null;
  toPage: number | null;
  note: string | null;
  createdAt: string;
  book?: Pick<Book, 'id' | 'title' | 'author' | 'currentPage' | 'totalPages'>;
}

// ─── Payloads ─────────────────────────────────────────────────────────────────

export interface CreateBookPayload {
  title: string;
  author?: string | null;
  totalPages: number;
  currentPage?: number;
  status?: BookStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface UpdateBookPayload {
  title?: string;
  author?: string | null;
  totalPages?: number;
  currentPage?: number;
  status?: BookStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface CreateReadingSessionPayload {
  bookId: string;
  date: string;       // YYYY-MM-DD
  pagesRead: number;
  fromPage?: number | null;
  toPage?: number | null;
  note?: string | null;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export interface BookResponse { data: Book }
export interface BooksResponse { data: Book[] }
export interface SessionResponse { data: ReadingSession }
export interface SessionsResponse { data: ReadingSession[] }
