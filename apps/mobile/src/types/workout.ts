/**
 * Tipos do módulo Corpo (WorkoutEntry).
 *
 * Espelham a shape retornada pela API (inferida do Prisma no server).
 * Não usar @prisma/client no mobile — tipos locais mantêm o bundle limpo.
 */

export interface WorkoutEntry {
  id: string;
  userId: string;
  date: string;           // YYYY-MM-DD
  runKm: number | null;
  pullupSets: number | null;
  pullupReps: number | null;
  rawInput: string | null;
  notes: string | null;
  createdAt: string;      // ISO timestamp (JSON serializado)
  updatedAt: string;
}

export interface CreateWorkoutPayload {
  date: string;           // YYYY-MM-DD obrigatório
  runKm?: number | null;
  pullupSets?: number | null;
  pullupReps?: number | null;
  rawInput?: string | null;
  notes?: string | null;
}

export interface UpdateWorkoutPayload {
  runKm?: number | null;
  pullupSets?: number | null;
  pullupReps?: number | null;
  rawInput?: string | null;
  notes?: string | null;
}

/** Shape da resposta { data: WorkoutEntry } */
export interface WorkoutResponse {
  data: WorkoutEntry;
}

/** Shape da resposta { data: WorkoutEntry[] } */
export interface WorkoutsResponse {
  data: WorkoutEntry[];
}
