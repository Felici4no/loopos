/**
 * Tela Hoje — módulo principal do LoopOS.
 *
 * Chama GET /api/today e renderiza cards para cada módulo do dia.
 * Sem daily_entries — tudo é agregação real dos módulos.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getToday, DataError as ApiError } from '../../lib/data.js';
import { resetDbWithSeed } from '../../lib/localDb.js';
import type { TodayResponse } from '../../types/today.js';
import {
  Card,
  SectionTitle,
  LoadingState,
  ErrorState,
  EmptyState,
  colors,
} from '../../components/ui.js';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const d = new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Sub-cards ────────────────────────────────────────────────────────────────

function WorkoutsCard({ data }: { data: TodayResponse['workouts'] }) {
  if (data.length === 0) {
    return (
      <Card>
        <SectionTitle label="Corpo" />
        <EmptyState message="Nenhum treino hoje" hint="Registre na aba Corpo" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle label="Corpo" count={data.length} />
      {data.map((w) => (
        <View key={w.id} style={styles.itemRow}>
          {w.rawInput && (
            <Text style={styles.itemLabel}>{w.rawInput}</Text>
          )}
          <View style={styles.statRow}>
            {w.runKm !== null && (
              <StatBadge value={`${w.runKm}km`} label="corrida" />
            )}
            {w.pullupSets !== null && w.pullupReps !== null && (
              <StatBadge value={`${w.pullupSets}×${w.pullupReps}`} label="pullup" />
            )}
          </View>
          {w.notes && <Text style={styles.itemNote}>{w.notes}</Text>}
        </View>
      ))}
    </Card>
  );
}

function RhythmCard({ data }: { data: TodayResponse['rhythm'] }) {
  if (data.length === 0) {
    return (
      <Card>
        <SectionTitle label="Ritmo" />
        <EmptyState message="Nenhum hábito registrado hoje" hint="Registre na aba Ritmo" />
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle label="Ritmo" count={data.length} />
      {data.map((e) => (
        <View key={e.id} style={styles.rhythmRow}>
          <View style={styles.checkDot} />
          <View style={styles.rhythmContent}>
            <Text style={styles.rhythmTitle}>{e.tracker.title}</Text>
            {e.eventType === 'value' && e.value !== null && (
              <Text style={styles.rhythmValue}>
                {e.value}
                {e.tracker.type === 'duration' ? ' min' : ''}
              </Text>
            )}
            {e.note && <Text style={styles.itemNote}>{e.note}</Text>}
          </View>
        </View>
      ))}
    </Card>
  );
}

function ReadingCard({ data }: { data: TodayResponse['reading'] }) {
  if (data.length === 0) {
    return (
      <Card>
        <SectionTitle label="Leitura" />
        <EmptyState message="Nenhuma sessão de leitura hoje" hint="Registre na aba Leitura" />
      </Card>
    );
  }

  const totalPages = data.reduce((sum, s) => sum + s.pagesRead, 0);

  return (
    <Card>
      <SectionTitle label="Leitura" count={data.length} />
      {data.map((s) => (
        <View key={s.id} style={styles.itemRow}>
          <Text style={styles.itemLabel}>{s.book.title}</Text>
          {s.book.author && <Text style={styles.itemSub}>{s.book.author}</Text>}
          <View style={styles.statRow}>
            <StatBadge value={`${s.pagesRead}p`} label="lidas" />
            {s.fromPage !== null && s.toPage !== null && (
              <StatBadge value={`${s.fromPage}–${s.toPage}`} label="páginas" />
            )}
            {s.book.currentPage !== null && s.book.totalPages !== null && (
              <StatBadge
                value={`${s.book.currentPage}/${s.book.totalPages}`}
                label="progresso"
              />
            )}
          </View>
        </View>
      ))}
      {data.length > 1 && (
        <Text style={styles.totalLine}>{totalPages} páginas no total hoje</Text>
      )}
    </Card>
  );
}

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
      <SectionTitle label="Listas" count={data.length} />
      {data.map((node) => (
        <View key={node.id} style={styles.listRow}>
          <Text style={styles.listBullet}>›</Text>
          <Text style={[styles.listTitle, node.isDone && styles.listDone]}>
            {node.title}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function StatBadge({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeValue}>{value}</Text>
      <Text style={styles.badgeLabel}>{label}</Text>
    </View>
  );
}

// ─── Today Screen ─────────────────────────────────────────────────────────────

export default function TodayScreen() {
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const result = await getToday();
      setData(result);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Não foi possível conectar à API. Verifique se o servidor está rodando.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Recarrega ao voltar para a aba (ex: após registrar treino em Corpo)
  useFocusEffect(
    useCallback(() => {
      // Só recarrega silenciosamente se já tiver dados (evita double-load na montagem)
      if (data !== null) {
        void load(true);
      }
    }, [load, data]),
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Hoje</Text>
            {data && (
              <Text style={styles.headerDate}>{formatDate(data.date)}</Text>
            )}
          </View>
          <TouchableOpacity
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
            style={styles.resetBtn}
          >
            <Text style={styles.resetBtnText}>↺ seed</Text>
          </TouchableOpacity>
        </View>

        {/* Cards */}
        {data && (
          <>
            <WorkoutsCard data={data.workouts} />
            <RhythmCard data={data.rhythm} />
            <ReadingCard data={data.reading} />
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
    paddingBottom: 40,
    gap: 12,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  resetBtn: {
    borderWidth: 1,
    borderColor: colors.textMuted,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 2,
  },
  resetBtnText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  itemRow: {
    gap: 4,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  itemSub: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  statRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  badge: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
  },
  badgeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.accent,
  },
  badgeLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  totalLine: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'right',
  },
  rhythmRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginTop: 6,
  },
  rhythmContent: { flex: 1, gap: 2 },
  rhythmTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text,
  },
  rhythmValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.accent,
  },
  listRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
  },
  listBullet: {
    fontSize: 16,
    color: colors.textMuted,
    lineHeight: 22,
  },
  listTitle: {
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  listDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
});
