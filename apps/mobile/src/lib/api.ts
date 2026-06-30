/**
 * Cliente HTTP do LoopOS Mobile.
 *
 * Configuração:
 *   EXPO_PUBLIC_API_URL — URL base da API (ex: http://localhost:3333)
 *   EXPO_PUBLIC_USER_ID — userId temporário até Supabase Auth (Etapa 4)
 *
 * Celular físico: troque localhost pelo IP local da máquina.
 * Ex: EXPO_PUBLIC_API_URL=http://192.168.1.42:3333
 */

import type { TodayResponse } from '../types/today.js';

const BASE_URL = (process.env['EXPO_PUBLIC_API_URL'] ?? 'http://localhost:3333').replace(/\/$/, '');
const USER_ID = process.env['EXPO_PUBLIC_USER_ID'] ?? 'user_test_1';

// ─── Core fetch ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': USER_ID,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `HTTP ${response.status}`;

    try {
      const body = (await response.json()) as { error?: { code?: string; message?: string } };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
    } catch {
      // body não é JSON — mantém mensagem padrão
    }

    throw new ApiError(response.status, code, message);
  }

  return response.json() as Promise<T>;
}

// ─── Generic helpers ─────────────────────────────────────────────────────────

export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: 'GET' });
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function apiDelete(path: string): Promise<void> {
  await apiFetch<void>(path, { method: 'DELETE' });
}

// ─── Today ───────────────────────────────────────────────────────────────────

export async function getToday(date?: string): Promise<TodayResponse> {
  const qs = date ? `?date=${date}` : '';
  const result = await apiGet<TodayResponse>(`/api/today${qs}`);
  return result;
}
