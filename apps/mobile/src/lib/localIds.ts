/**
 * Gerador de IDs locais.
 * Formato: {prefix}_{timestamp}_{4 chars aleatórios}
 * Ex: workout_1730000000000_ab12
 */
export function createLocalId(prefix: string): string {
  const ts = Date.now().toString();
  const rand = Math.random().toString(36).slice(2, 6);
  return `${prefix}_${ts}_${rand}`;
}
