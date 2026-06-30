/**
 * Cliente Supabase do LoopOS Mobile — modo direto (sem backend Express).
 *
 * Usado temporariamente para validação visual rápida. O backend Express +
 * Prisma em server/ continua sendo a arquitetura planejada para produção —
 * este cliente é um atalho para destravar o Expo Go sem depender de subir
 * o servidor local. Ver docs/supabase-direct-mode.md.
 *
 * Configuração via .env:
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *   EXPO_PUBLIC_USER_ID (substitui x-user-id; mesmo princípio do ADR-013)
 *
 * Usa a anon key — segura para expor no cliente. NUNCA usar a service role
 * key aqui; ela ignora RLS e dá acesso total ao banco.
 */

import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[LoopOS] EXPO_PUBLIC_SUPABASE_URL ou EXPO_PUBLIC_SUPABASE_ANON_KEY ' +
      'não configurados. Copie apps/mobile/.env.example para .env e preencha.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Sem autenticação real ainda (ADR-013) — desativa persistência de sessão
    // para evitar comportamento inesperado do client de auth do Supabase.
    persistSession: false,
    autoRefreshToken: false,
  },
});

/** userId fixo temporário, equivalente ao header x-user-id do modo API. */
export const CURRENT_USER_ID = process.env['EXPO_PUBLIC_USER_ID'] ?? 'user_test_1';
