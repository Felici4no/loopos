/**
 * Middleware de validação de req.body via Zod.
 *
 * Uso:
 *   router.post('/', validateBody(createWorkoutEntrySchema), handler)
 *
 * Se a validação falhar, passa o ZodError para o errorHandler global
 * que o transforma em resposta 422 padronizada.
 */

import type { RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

export function validateBody<T extends ZodTypeAny>(
  schema: T,
): RequestHandler<Record<string, string>, unknown, z.infer<T>> {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(result.error);
      return;
    }
    // Replace body with parsed + coerced data
    req.body = result.data as z.infer<T>;
    next();
  };
}
