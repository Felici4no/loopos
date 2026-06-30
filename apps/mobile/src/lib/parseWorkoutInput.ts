/**
 * Parser de input rápido de treino.
 *
 * Converte texto livre como "10km 4x11" em campos estruturados.
 * Funciona 100% offline, sem IA e sem backend.
 *
 * Temporário: pode ser movido para @loopos/shared e reaproveitado
 * pelo servidor (parsing de rawInput) em etapa futura.
 *
 * Casos aceitos:
 *   "10km 4x11"          → { runKm: 10,  pullupSets: 4,  pullupReps: 11 }
 *   "5 km 3x8"           → { runKm: 5,   pullupSets: 3,  pullupReps: 8  }
 *   "4x11"               → {             pullupSets: 4,  pullupReps: 11 }
 *   "10km"               → { runKm: 10                                   }
 *   "corrida 7km barra 5x6" → { runKm: 7, pullupSets: 5, pullupReps: 6  }
 *   ""                   → {}
 */

export interface ParsedWorkout {
  runKm?: number;
  pullupSets?: number;
  pullupReps?: number;
  rawInput: string;
}

/**
 * Regex para quilometragem.
 * Captura: "10km", "10 km", "5.5km", "5,5 km"
 * Aceita vírgula como separador decimal (pt-BR).
 */
const KM_PATTERN = /(\d+(?:[.,]\d+)?)\s*km/i;

/**
 * Regex para séries × repetições.
 * Captura: "4x11", "4X11", "4 x 11", "4×11" (unicode ×)
 */
const SETS_REPS_PATTERN = /(\d+)\s*[xX×]\s*(\d+)/;

export function parseWorkoutInput(raw: string): ParsedWorkout {
  const trimmed = raw.trim();

  const result: ParsedWorkout = { rawInput: trimmed };

  // ─── Quilometragem ────────────────────────────────────────────────────────
  const kmMatch = KM_PATTERN.exec(trimmed);
  if (kmMatch?.[1]) {
    // Normaliza vírgula para ponto antes de converter
    const kmStr = kmMatch[1].replace(',', '.');
    const km = parseFloat(kmStr);
    if (!isNaN(km) && km > 0) {
      result.runKm = km;
    }
  }

  // ─── Séries × Repetições ──────────────────────────────────────────────────
  const setsMatch = SETS_REPS_PATTERN.exec(trimmed);
  if (setsMatch?.[1] && setsMatch?.[2]) {
    const sets = parseInt(setsMatch[1], 10);
    const reps = parseInt(setsMatch[2], 10);
    if (!isNaN(sets) && !isNaN(reps) && sets > 0 && reps > 0) {
      result.pullupSets = sets;
      result.pullupReps = reps;
    }
  }

  return result;
}

/**
 * Formata um ParsedWorkout de volta em texto legível para exibição.
 * Ex: { runKm: 10, pullupSets: 4, pullupReps: 11 } → "10km · 4×11"
 */
export function formatParsedWorkout(parsed: ParsedWorkout): string {
  const parts: string[] = [];

  if (parsed.runKm !== undefined) {
    parts.push(`${parsed.runKm}km`);
  }

  if (parsed.pullupSets !== undefined && parsed.pullupReps !== undefined) {
    parts.push(`${parsed.pullupSets}×${parsed.pullupReps}`);
  }

  if (parts.length === 0 && parsed.rawInput) {
    return parsed.rawInput;
  }

  return parts.join(' · ');
}

// ─── Casos de teste documentados ─────────────────────────────────────────────
// Rodar manualmente: node -e "const {parseWorkoutInput} = require('./parseWorkoutInput'); ..."
// ou via: pnpm --filter @loopos/mobile typecheck (valida tipos apenas)

export const PARSER_TEST_CASES: Array<{ input: string; expected: Omit<ParsedWorkout, 'rawInput'> }> = [
  {
    input: '10km 4x11',
    expected: { runKm: 10, pullupSets: 4, pullupReps: 11 },
  },
  {
    input: '5 km 3x8',
    expected: { runKm: 5, pullupSets: 3, pullupReps: 8 },
  },
  {
    input: '4x11',
    expected: { pullupSets: 4, pullupReps: 11 },
  },
  {
    input: '10km',
    expected: { runKm: 10 },
  },
  {
    input: 'corrida 7km barra 5x6',
    expected: { runKm: 7, pullupSets: 5, pullupReps: 6 },
  },
  {
    input: '',
    expected: {},
  },
  // Extras
  {
    input: '5,5km 3x10',
    expected: { runKm: 5.5, pullupSets: 3, pullupReps: 10 },
  },
  {
    input: 'aquecimento 20min',
    expected: {},
  },
];

/**
 * Valida todos os casos de teste.
 * Retorna array de falhas (vazio = tudo ok).
 * Útil para rodar em um script de validação manual.
 */
export function runParserTests(): string[] {
  const failures: string[] = [];

  for (const { input, expected } of PARSER_TEST_CASES) {
    const result = parseWorkoutInput(input);

    const checks: Array<[string, unknown, unknown]> = [
      ['runKm', result.runKm, expected.runKm],
      ['pullupSets', result.pullupSets, expected.pullupSets],
      ['pullupReps', result.pullupReps, expected.pullupReps],
    ];

    for (const [field, got, want] of checks) {
      if (got !== want) {
        failures.push(
          `FAIL "${input}" → ${field}: got ${String(got)}, want ${String(want)}`,
        );
      }
    }
  }

  return failures;
}
