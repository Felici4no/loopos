/**
 * Exemplo isolado de Edge Function usando @supabase/server.
 *
 * NÃO É USADO PELO APP MOBILE. Este arquivo existe apenas como referência
 * para quando o LoopOS migrar de "Supabase direto no mobile" para
 * "server handlers com auth real" — ver docs/supabase-server-sdk.md.
 *
 * auth: "user" exige um JWT válido de usuário autenticado no header
 * Authorization (Bearer token). ctx.supabase já vem configurado para
 * respeitar RLS como esse usuário — nunca como admin.
 *
 * Para rodar/deployar isto de verdade, é necessário:
 *   1. RLS ativado nas tabelas (ver supabase/schema.sql, seção final)
 *   2. Variáveis de ambiente server-side configuradas (ver .env.example
 *      neste mesmo diretório)
 *   3. supabase/config.toml com verify_jwt apropriado para o modo de auth
 *      escolhido (ver docs/supabase-server-sdk.md, seção 10)
 */

import { withSupabase } from '@supabase/server';

export default {
  fetch: withSupabase({ auth: 'user' }, async (_req, ctx) => {
    const { data, error } = await ctx.supabase
      .from('workout_entries')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }

    return Response.json({ data });
  }),
};
