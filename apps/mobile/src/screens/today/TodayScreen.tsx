/**
 * Tela Hoje — dashboard do LoopOS.
 *
 * Renderiza o TodayDashboard (lib/dashboard.ts): todo o estado derivado —
 * séries, jornadas, livro atual, progresso de listas — chega pronto.
 * Esta tela só apresenta e interage; não calcula nada com dado solto.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { buildTodayDashboard, type TodayDashboard } from '../../lib/dashboard.js';
import { formatKm } from '../../lib/insights.js';
import { confirmDestructive } from '../../lib/confirm.js';
import { resetDbWithSeed } from '../../lib/localDb.js';
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

// ─── Corpo card ───────────────────────────────────────────────────────────────

function BodyCard({ body }: { body: TodayDashboard['body'] }) {
  const trained = body.todayWorkouts.length > 0;
  const headline = trained
    ? body.todayWorkouts.map((w) => w.rawInput).filter(Boolean).join(' · ') ||
      'Treino registrado'
    : 'Sem treino hoje';
  const totalReps = body.pullupSeries.reduce((s, d) => s + d.value, 0);
  const hasHistory = totalReps > 0 || body.weeklyKm > 0;

  return (
    <Card>
      <SectionTitle label="Corpo" meta={trained ? 'treinou hoje' : undefined} />
      <Text style={trained ? styles.bodyHeadline : styles.bodyHeadlineMuted}>
        {headline}
      </Text>

      {hasHistory ? (
        <>
          {totalReps > 0 && (
            <View style={styles.vizBlock}>
              <View style={styles.vizHeader}>
                <Text style={styles.vizLabel}>REPETIÇÕES · 7 DIAS</Text>
                <Text style={styles.vizMeta}>média {body.weeklyPullupAverage}/dia</Text>
              </View>
              <WeekBars data={body.pullupSeries} height={48} />
            </View>
          )}
          {body.weeklyKm > 0 && (
            <View style={styles.vizBlock}>
              <View style={styles.vizHeader}>
                <Text style={styles.vizLabel}>KM POR DIA</Text>
                <Text style={styles.vizMeta}>{formatKm(body.weeklyKm)} km na semana</Text>
              </View>
              <TrendLine data={body.runKmSeries} height={52} formatValue={formatKm} />
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

function RhythmCard({ rhythm }: { rhythm: TodayDashboard['rhythm'] }) {
  if (rhythm.trackers.length === 0) {
    return (
      <Card>
        <SectionTitle label="Ritmo" />
        <EmptyState message="Nenhum hábito ativo" hint="Crie um contador na aba Ritmo" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        label="Ritmo"
        meta={`${rhythm.completedToday}/${rhythm.totalToday} hoje`}
      />
      <View style={styles.trackerList}>
        {rhythm.trackers.map(({ tracker, todayValue, target, progress, isDoneToday, label }) => (
          <View key={tracker.id} style={styles.trackerRow}>
            <Ionicons
              name={isDoneToday ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={isDoneToday ? colors.success : colors.textMuted}
            />
            <View style={styles.trackerBody}>
              <View style={styles.trackerHeader}>
                <View style={styles.trackerTitleBlock}>
                  <Text
                    style={[styles.trackerTitle, isDoneToday && styles.trackerTitleDone]}
                  >
                    {tracker.title}
                  </Text>
                  {label && (
                    <Text style={styles.trackerJourney}>
                      <Ionicons name="flame" size={10} color={colors.accent} /> {label}
                    </Text>
                  )}
                </View>
                {target !== null && (
                  <Text style={styles.trackerCount}>
                    {todayValue}
                    <Text style={styles.trackerTarget}> / {target}</Text>
                  </Text>
                )}
              </View>
              {target !== null && (
                <ProgressBar
                  value={progress}
                  height={4}
                  color={isDoneToday ? colors.success : colors.accent}
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

function ReadingCard({ reading }: { reading: TodayDashboard['reading'] }) {
  const book = reading.currentBook;

  if (!book) {
    return (
      <Card>
        <SectionTitle label="Leitura" />
        <EmptyState message="Nenhum livro em leitura" hint="Adicione na aba Leitura" />
      </Card>
    );
  }

  const pct = reading.currentBookProgress;
  const isSuggestion = reading.currentBookKind === 'suggestion';

  return (
    <Card>
      <SectionTitle
        label="Leitura"
        meta={
          reading.pagesReadToday > 0
            ? `${reading.pagesReadToday} págs hoje`
            : isSuggestion
              ? 'próximo livro'
              : undefined
        }
      />
      {reading.finishedToday.length > 0 && (
        <View style={styles.finishedTodayChip}>
          <Ionicons name="trophy" size={12} color={colors.success} />
          <Text style={styles.finishedTodayText}>
            Você finalizou {reading.finishedToday[0]!.title} hoje
          </Text>
        </View>
      )}
      <Text style={styles.bookTitle}>{book.title}</Text>
      {book.author && <Text style={styles.bookAuthor}>{book.author}</Text>}

      {isSuggestion ? (
        <Text style={styles.readingPages}>
          Na sua fila — comece registrando a primeira sessão.
        </Text>
      ) : (
        <View style={styles.readingProgress}>
          <Text style={styles.readingPct}>{Math.round(pct * 100)}%</Text>
          <View style={styles.readingBarArea}>
            <ProgressBar value={pct} height={6} />
            <Text style={styles.readingPages}>
              {book.currentPage ?? 0} de {book.totalPages ?? 0} páginas
              {reading.pagesReadToday === 0 && ' · nada lido hoje'}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

// ─── Listas card ──────────────────────────────────────────────────────────────

function ListsCard({ lists }: { lists: TodayDashboard['lists'] }) {
  if (lists.rootLists.length === 0) {
    return (
      <Card>
        <SectionTitle label="Listas" />
        <EmptyState message="Nenhuma lista criada" hint="Crie na aba Listas" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle
        label="Listas"
        meta={
          lists.updatedTodayCount > 0
            ? `${lists.updatedTodayCount} hoje`
            : undefined
        }
      />
      <View style={styles.listRows}>
        {lists.rootLists.map(({ node, totalItems, doneItems, progress }) => (
          <View key={node.id} style={styles.listRow}>
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>{node.title}</Text>
              <Text style={styles.listCount}>
                {totalItems === 0 ? 'vazia' : `${doneItems}/${totalItems}`}
              </Text>
            </View>
            {totalItems > 0 && (
              <ProgressBar
                value={progress}
                height={4}
                color={doneItems === totalItems ? colors.success : colors.accent}
              />
            )}
          </View>
        ))}
      </View>
    </Card>
  );
}

// ─── Today Screen ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const [dash, setDash] = useState<TodayDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setDash(await buildTodayDashboard());
    } catch {
      setError('Não foi possível carregar os dados locais.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Recarrega ao voltar para a aba (ex: após registrar treino em Corpo).
  // hasDataRef (em vez de depender de `dash`) mantém o callback estável:
  // depender do dado refazia o efeito a cada load — loop infinito com o
  // spinner do RefreshControl piscando ao lado do header.
  const hasDataRef = useRef(false);
  useEffect(() => {
    hasDataRef.current = dash !== null;
  }, [dash]);

  useFocusEffect(
    useCallback(() => {
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

  if (error || !dash) {
    return (
      <SafeAreaView style={styles.screen} edges={['top']}>
        <ErrorState
          message={error ?? 'Dados indisponíveis.'}
          hint="Dados locais do aparelho (AsyncStorage)"
          onRetry={() => void load()}
        />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.headerDate}>{dash.formattedDate}</Text>
          </View>
          <TouchableOpacity
            hitSlop={10}
            accessibilityLabel="Resetar dados de teste"
            onPress={() => {
              void (async () => {
                const ok = await confirmDestructive({
                  title: 'Resetar dados de teste',
                  message: 'Apaga todos os dados e recria o seed inicial. Continuar?',
                  confirmLabel: 'Resetar',
                });
                if (ok) {
                  await resetDbWithSeed();
                  void load();
                }
              })();
            }}
            style={styles.seedBtn}
          >
            <Ionicons name="refresh" size={15} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Quanto do tempo já passou */}
        <View style={styles.timeRow}>
          <TimeProgress label="Semana" value={dash.timeProgress.week} />
          <TimeProgress label="Mês" value={dash.timeProgress.month} />
          <TimeProgress label="Ano" value={dash.timeProgress.year} />
        </View>

        {/* Conquista do dia (derivada, some quando não há) */}
        {dash.achievements.length > 0 && (
          <View style={styles.achievementRow}>
            <Ionicons name="sparkles" size={12} color={colors.accent} />
            <Text style={styles.achievementText}>{dash.achievements[0]}</Text>
          </View>
        )}

        {/* Cards */}
        <BodyCard body={dash.body} />
        <RhythmCard rhythm={dash.rhythm} />
        <ReadingCard reading={dash.reading} />
        <ListsCard lists={dash.lists} />
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
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  achievementText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.textSecondary,
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
    alignItems: 'flex-start',
    gap: 8,
  },
  trackerTitleBlock: {
    flex: 1,
    gap: 2,
  },
  trackerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  trackerTitleDone: {
    color: colors.textSecondary,
  },
  trackerJourney: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
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
  finishedTodayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.22)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 6,
  },
  finishedTodayText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
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
    marginTop: 4,
  },

  // Listas
  listRows: {
    gap: 12,
    marginTop: 2,
  },
  listRow: {
    gap: 6,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  listCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    fontVariant: ['tabular-nums'],
  },
});
