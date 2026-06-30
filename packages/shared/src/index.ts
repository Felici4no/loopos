/**
 * @loopos/shared
 *
 * Exports:
 * - schemas: Zod schemas para validação de inputs da API (create/update)
 * - validators: funções puras de validação (sem dependências)
 * - date: utilitários de data (YYYY-MM-DD, ISO, semanas)
 *
 * Tipos de entidades persistidas NÃO são exportados daqui na Etapa 2+.
 * Devem ser importados de @prisma/client no server, ou inferidos dos
 * schemas Zod quando usados no cliente. Ver ADR-008.
 */

// Schemas Zod — contratos de entrada da API
export * from './schemas/index.js';

// Validators puros — sem dependências externas
export * from './validators/index.js';

// Utilitários de data
export * from './date/index.js';
