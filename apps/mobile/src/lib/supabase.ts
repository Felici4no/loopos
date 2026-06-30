/**
 * Cliente Supabase — INATIVO no modo local-only.
 *
 * Este arquivo é mantido como referência para quando o LoopOS migrar
 * de armazenamento local (AsyncStorage) para Supabase direto ou server
 * handlers. Ver docs/supabase-direct-mode.md e docs/supabase-server-sdk.md.
 *
 * Para reativar: adicionar @supabase/supabase-js e react-native-url-polyfill
 * de volta em apps/mobile/package.json e descomentar o código abaixo.
 */

// import 'react-native-url-polyfill/auto';
// import { createClient } from '@supabase/supabase-js';
//
// const SUPABASE_URL = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
// const SUPABASE_ANON_KEY = process.env['EXPO_PUBLIC_SUPABASE_ANON_KEY'] ?? '';
//
// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
//   auth: { persistSession: false, autoRefreshToken: false },
// });
//
// export const CURRENT_USER_ID = process.env['EXPO_PUBLIC_USER_ID'] ?? 'user_test_1';

export const SUPABASE_MODE_INACTIVE = true;
