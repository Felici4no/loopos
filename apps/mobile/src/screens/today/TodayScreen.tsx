/**
 * Tela Hoje — dashboard do LoopOS.
 *
 * Síntese visual dos módulos: além do snapshot do dia (getToday), agrega
 * históricos leves (treinos dos últimos 7 dias, trackers ativos, livro em
 * leitura) para responder de relance: treinei? quanto corri? como está a
 * semana? o que falta hoje? quanto avancei no livro?
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  getToday,
  getWorkouts,
  getTrackers,
  getBooks,
  DataError as ApiError,
} from '../../lib/data.js';
import { resetDbWithSeed } from '../../lib/localDb.js';
import type { TodayResponse } from '../../types/today.js';
import type { WorkoutEntry } from '../../types/workout.js';
import type { Tracker } from '../../types/rhythm.js';
import type { Book } from '../../types/reading.js';
import {
  Card,
  SectionTitle,
  LoadingState,
  ErrorState,
  EmptyState,
  colors,
} from '../../components/ui.js';
import {
  ProgressBar,
  TimeProgress,
  WeekBars,
  TrendLine,
} from '../../components/viz.js';
import {
  parseISODate,
  toISODate,
  timeProgress,
  formatKm,
  getWeeklyRunKmSeries,
  getWeeklyPullupSeries,
} from '../../lib/insights.js';

// ─── Date helpers ─────────────────────────────────────────────────────────────

/** "quinta-feira, 2 de julho de 2026" com a primeira letra maiúscula. */
function formatFullDate(iso: string): string {
  const s = parseISODate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Corpo card ───────────────────────────────────────────────────────────────

function BodyCard({
  today,
  workouts,
}: {
  today: TodayResponse['workouts'];
  workouts: WorkoutEntry[];
}) {
  const endIso = today[0]?.date ?? toISODate(new Date());
  const reps = getWeeklyPullupSeries(workouts, endIso);
  const km = getWeeklyRunKmSeries(workouts, endIso);
  const totalReps = reps.reduce((s, d) => s + d.value, 0);
  const avgReps = Math.round(totalReps / 7);
  const totalKm = km.reduce((s, d) => s + d.value, 0);
  const hasHistory = totalReps > 0 || totalKm > 0;

  const headline =
    today.length > 0
      ? today
          .map((w) => w.rawInput)
          .filter(Boolean)
          .join(' · ') || 'Treino registrado'
      : 'Sem treino hoje';

  return (
    <Card>
      <SectionTitle label="Corpo" meta={today.length > 0 ? 'treinou hoje' : undefined} />
      <Text style={today.length > 0 ? styles.bodyHeadline : styles.bodyHeadlineMuted}>
        {headline}
      </Text>

      {hasHistory ? (
        <>
          {totalReps > 0 && (
            <View style={styles.vizBlock}>
              <View style={styles.vizHeader}>
                <Text style={styles.vizLabel}>REPETIÇÕES · 7 DIAS</Text>
                <Text style={styles.vizMeta}>média {avgReps}/dia</Text>
              </View>
              <WeekBars data={reps} height={48} />
            </View>
          )}
          {totalKm > 0 && (
            <View style={styles.vizBlock}>
              <View style={styles.vizHeader}>
                <Text style={styles.vizLabel}>KM POR DIA</Text>
                <Text style={styles.vizMeta}>{formatKm(totalKm)} km na semana</Text>
              </View>
              <TrendLine data={km} height={52} formatValue={formatKm} />
            </View>
          )}
        </>
      ) : (
        <EmptyState message="Sem treinos na semana" hint="Registre na aba Corpo" />
      )}
    </Card>
  );
}

// ─── Ritmo card ───────────────────────────────────────────────────────────────

interface TrackerStatus {
  tracker: Tracker;
  current: number;
  done: boolean;
  progress: number | null; // null = sem meta numérica
}

function trackerStatuses(
  trackers: Tracker[],
  rhythm: TodayResponse['rhythm'],
): TrackerStatus[] {
  const statuses = trackers
    .filter((t) => t.isActive)
    .map((t) => {
      const events = rhythm.filter((e) => e.tracker.id === t.id);
      const current = events.reduce((s, e) => s + (e.value ?? 0), 0);
      const checked = events.length > 0;
      if (t.type === 'boolean' || t.target === null) {
        return { tracker: t, current, done: checked, progress: null };
      }
      return {
        tracker: t,
        current,
        done: current >= t.target,
        progress: Math.min(current / t.target, 1),
      };
    });

  // Pendentes com meta primeiro (mais acionáveis), concluídos por último.
  return statuses.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if ((a.progress !== null) !== (b.progress !== null)) {
      return a.progress !== null ? -1 : 1;
    }
    return 0;
  });
}

function RhythmCard({
  trackers,
  rhythm,
}: {
  trackers: Tracker[];
  rhythm: TodayResponse['rhythm'];
}) {
  const statuses = trackerStatuses(trackers, rhythm);

  if (statuses.length === 0) {
    return (
      <Card>
        <SectionTitle label="Ritmo" />
        <EmptyState message="Nenhum hábito ativo" hint="Crie um contador na aba Ritmo" />
      </Card>
    );
  }

  const doneCount = statuses.filter((s) => s.done).length;

  return (
    <Card>
      <SectionTitle label="Ritmo" meta={`${doneCount}/${statuses.length} hoje`} />
      <View style={styles.trackerList}>
        {statuses.map(({ tracker, current, done, progress }) => (
          <View key={tracker.id} style={styles.trackerRow}>
            <Ionicons
              name={done ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={done ? colors.success : colors.textMuted}
            />
            <View style={styles.trackerBody}>
              <View style={styles.trackerHeader}>
                <Text style={[styles.trackerTitle, done && styles.trackerTitleDone]}>
                  {tracker.title}
                </Text>
                {progress !== null && tracker.target !== null && (
                  <Text style={styles.trackerCount}>
                    {current}
                    <Text style={styles.trackerTarget}> / {tracker.target}</Text>
                  </Text>
                )}
              </View>
              {progress !== null && (
                <ProgressBar
                  value={progress}
                  height={4}
                  color={done ? colors.success : colors.accent}
                />
              )}
            </View>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Leitura card ─────────────────────────────────────────────────────────────

function ReadingCard({
  sessions,
  books,
}: {
  sessions: TodayResponse['reading'];
  books: Book[];
}) {
  // Livro em destaque: o da sessão de hoje, senão o primeiro em leitura.
  const sessionBook = sessions[0]?.book;
  const book = sessionBook ?? books[0];

  if (!book) {
    return (
      <Card>
        <SectionTitle label="Leitura" />
        <EmptyState message="Nenhum livro em leitura" hint="Adicione na aba Leitura" />
      </Card>
    );
  }

  const current = book.currentPage ?? 0;
  const total = book.totalPages;
  const pct = total ? Math.min(current / total, 1) : null;
  const pagesToday = sessions.reduce((s, x) => s + x.pagesRead, 0);

  return (
    <Card>
      <SectionTitle
        label="Leitura"
        meta={pagesToday > 0 ? `${pagesToday} págs hoje` : undefined}
      />
      <Text style={styles.bookTitle}>{book.title}</Text>
      {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}

      {pct !== null ? (
        <View style={styles.readingProgress}>
          <Text style={styles.readingPct}>{Math.round(pct * 100)}%</Text>
          <View style={styles.readingBarArea}>
            <ProgressBar value={pct} height={6} />
            <Text style={styles.readingPages}>
              {current} de {total} páginas
              {pagesToday === 0 && ' · nada lido hoje'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.readingPages}>
          página {current}
          {pagesToday > 0 ? ` · ${pagesToday} lidas hoje` : ' · nada lido hoje'}
        </Text>
      )}
    </Card>
  );
}

// ─── Listas card ──────────────────────────────────────────────────────────────

function ListsCard({ data }: { data: TodayResponse['lists'] }) {
  if (data.length === 0) {
    return (
      <Card>
        <SectionTitle label="Listas" />
        <EmptyState message="Nenhuma lista atualizada hoje" hint="Crie ou edite na aba Listas" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle label="Listas" meta={`${data.length} hoje`} />
      {data.map((node) => (
        <View key={node.id} style={styles.listRow}>
          <Ionicons
            name={node.isDone ? 'checkmark-circle' : 'chevron-forward'}
            size={15}
            color={node.isDone ? colors.success : colors.textMuted}
          />
          <Text style={[styles.listTitle, node.isDone && styles.listDone]}>
            {node.title}
          </Text>
        </View>
      ))}
    </Card>
  );
}

// ─── Today Screen ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [readingBooks, setReadingBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [today, allWorkouts, allTrackers, booksReading] = await Promise.all([
        getToday(),
        getWorkouts(),
        getTrackers(),
        getBooks('READING'),
      ]);
      setData(today);
      setWorkouts(allWorkouts);
      setTrackers(allTrackers);
      setReadingBooks(booksReading);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível carregar os dados locais.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Recarrega ao voltar para a aba (ex: após registrar treino em Corpo).
  // hasDataRef (em vez de depender de `data`) mantém o callback estável:
  // depender de `data` refazia o efeito a cada load — loop infinito com o
  // spinner do RefreshControl piscando ao lado do header.
  const hasDataRef = useRef(false);
  useEffect(() => {
    hasDataRef.current = data !== null;
  }, [data]);

  useFocusEffect(
    useCallback(() => {
      // Só recarrega silenciosamente se já tiver dados (evita double-load na montagem)
      if (hasDataRef.current) {
        void load(true);
      }
    }, [load]),
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ErrorState
          message={error}
          hint="Dados locais do aparelho (AsyncStorage)"
          onRetry={() => void load()}
        />
      </SafeAreaView>
    );
  }

  const tp = data ? timeProgress(data.date) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.accent}
          />
        }
      >
        {/* Header editorial: título + data corrida, seed discreto */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Hoje</Text>
            {data && (
              <Text style={styles.headerDate}>{formatFullDate(data.date)}</Text>
            )}
          </View>
          <TouchableOpacity
            hitSlop={10}
            accessibilityLabel="Resetar dados de teste"
            onPress={() => {
              Alert.alert(
                'Resetar dados de teste',
                'Apaga todos os dados e recria o seed inicial. Continuar?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Resetar',
                    style: 'destructive',
                    onPress: () => {
                      void resetDbWithSeed().then(() => void load());
                    },
                  },
                ],
              );
            }}
            style={styles.seedBtn}
          >
            <Ionicons name="refresh" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quanto do tempo já passou */}
        {tp && (
          <View style={styles.timeRow}>
            <TimeProgress label="Semana" value={tp.week} />
            <TimeProgress label="Mês" value={tp.month} />
            <TimeProgress label="Ano" value={tp.year} />
          </View>
        )}

        {/* Cards */}
        {data && (
          <>
            <BodyCard today={data.workouts} workouts={workouts} />
            <RhythmCard trackers={trackers} rhythm={data.rhythm} />
            <ReadingCard sessions={data.reading} books={readingBooks} />
            <ListsCard data={data.lists} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: { flex: 1 },
  content: {
    padding: 16,
    // Tab bar flutuante — conteúdo rola por baixo dela.
    paddingBottom: 100,
    gap: 14,
  },

  // Header
  header: {
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.8,
  },
  headerDate: {
    fontSize: 15,
    color: colors.textSecondary,
    letterSpacing: -0.1,
  },
  seedBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 2,
    marginBottom: 4,
  },

  // Corpo
  bodyHeadline: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  bodyHeadlineMuted: {
    fontSize: 15,
    color: colors.textMuted,
    marginBottom: 4,
  },
  vizBlock: {
    marginTop: 12,
    gap: 8,
  },
  vizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  vizLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
  },
  vizMeta: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },

  // Ritmo
  trackerList: {
    gap: 14,
    marginTop: 2,
  },
  trackerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  trackerBody: {
    flex: 1,
    gap: 6,
  },
  trackerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  trackerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  trackerTitleDone: {
    color: colors.textSecondary,
  },
  trackerCount: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  trackerTarget: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },

  // Leitura
  bookTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.2,
  },
  bookAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  readingProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 12,
  },
  readingPct: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  readingBarArea: {
    flex: 1,
    gap: 6,
  },
  readingPages: {
    fontSize: 12,
    color: colors.textSecondary,
  },

  // Listas
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  listDone: {
    color: colors.textMuted,
    textDecorationLine: 'line-through',
  },
});
