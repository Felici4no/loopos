/**
 * Tela Corpo — módulo de treinos do LoopOS.
 *
 * Fluxo: input rápido → parser local → POST /api/body/workouts
 *        → recarrega lista → tela Hoje reflete ao ganhar foco.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getWorkouts, createWorkout, deleteWorkout, DataError as ApiError } from '../../lib/data.js';
import { parseWorkoutInput, formatParsedWorkout } from '../../lib/parseWorkoutInput.js';
import type { WorkoutEntry } from '../../types/workout.js';
import { colors } from '../../components/ui.js';
import { todayISO } from '@loopos/shared';

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── WorkoutCard ─────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  item: WorkoutEntry;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function WorkoutCard({ item, onDelete, deleting }: WorkoutCardProps) {
  const parsed = item.rawInput ? parseWorkoutInput(item.rawInput) : null;
  const summary = parsed ? formatParsedWorkout(parsed) : null;

  function handleDelete() {
    Alert.alert(
      'Excluir treino',
      item.rawInput ? `"${item.rawInput}"` : 'Este treino',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => onDelete(item.id),
        },
      ],
    );
  }

  return (
    <View style={styles.card}>
      {/* Linha principal */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardRaw}>
          {item.rawInput ?? '—'}
        </Text>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <Text style={styles.deleteBtnText}>✕</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Badges numéricos */}
      {(item.runKm !== null || item.pullupSets !== null) && (
        <View style={styles.badgeRow}>
          {item.runKm !== null && (
            <View style={styles.badge}>
              <Text style={styles.badgeValue}>{item.runKm}km</Text>
              <Text style={styles.badgeLabel}>corrida</Text>
            </View>
          )}
          {item.pullupSets !== null && item.pullupReps !== null && (
            <View style={styles.badge}>
              <Text style={styles.badgeValue}>{item.pullupSets}×{item.pullupReps}</Text>
              <Text style={styles.badgeLabel}>pullup</Text>
            </View>
          )}
        </View>
      )}

      {/* Sumário parseado (se diferente do raw) */}
      {summary && summary !== item.rawInput && (
        <Text style={styles.cardSummary}>{summary}</Text>
      )}

      {/* Nota */}
      {item.notes && (
        <Text style={styles.cardNote}>{item.notes}</Text>
      )}

      {/* Data */}
      <Text style={styles.cardDate}>{formatDisplayDate(item.date)}</Text>
    </View>
  );
}

// ─── BodyScreen ───────────────────────────────────────────────────────────────

export default function BodyScreen() {
  const [workouts, setWorkouts] = useState<WorkoutEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [input, setInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const inputRef = useRef<TextInput>(null);

  // ─── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getWorkouts();
      setWorkouts(data);
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Não foi possível carregar os treinos.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // ─── Create ──────────────────────────────────────────────────────────────

  async function handleRegister() {
    const trimmed = input.trim();
    if (!trimmed) return;

    setSaving(true);
    setSaveError(null);
    setLastSaved(null);

    try {
      const parsed = parseWorkoutInput(trimmed);
      const today = todayISO();

      const created = await createWorkout({
        date: today,
        runKm: parsed.runKm ?? null,
        pullupSets: parsed.pullupSets ?? null,
        pullupReps: parsed.pullupReps ?? null,
        rawInput: parsed.rawInput,
      });

      // Prepend: treino mais recente no topo
      setWorkouts((prev) => [created, ...prev]);
      setInput('');
      setLastSaved(created.rawInput ?? 'treino registrado');

      // Limpa feedback após 3s
      setTimeout(() => setLastSaved(null), 3000);
    } catch (err) {
      const msg = err instanceof ApiError
        ? `Erro ao salvar: ${err.message}`
        : 'Erro ao salvar treino. Verifique a conexão.';
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete ──────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteWorkout(id);
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      const msg = err instanceof ApiError
        ? err.message
        : 'Erro ao excluir treino.';
      Alert.alert('Erro', msg);
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const todayStr = todayISO();
  const todayWorkouts = workouts.filter((w) => w.date === todayStr);
  const olderWorkouts = workouts.filter((w) => w.date !== todayStr);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Corpo</Text>
          <Text style={styles.headerSub}>Registro de treinos</Text>
        </View>

        {/* Input rápido */}
        <View style={styles.inputSection}>
          <View style={styles.inputRow}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ex: 10km 4x11"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              onSubmitEditing={() => void handleRegister()}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={[styles.registerBtn, (!input.trim() || saving) && styles.registerBtnDisabled]}
              onPress={() => void handleRegister()}
              disabled={!input.trim() || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.bg} />
              ) : (
                <Text style={styles.registerBtnText}>Registrar</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Feedback de salvamento */}
          {lastSaved && (
            <Text style={styles.savedFeedback}>✓ "{lastSaved}" registrado</Text>
          )}
          {saveError && (
            <Text style={styles.saveErrorText}>{saveError}</Text>
          )}
        </View>

        {/* Lista */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.stateText}>Carregando...</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
              <Text style={styles.retryBtnText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={[
              // Seção Hoje
              ...(todayWorkouts.length > 0
                ? [{ _section: 'Hoje', _count: todayWorkouts.length } as const]
                : [{ _section: 'Hoje', _count: 0 } as const]),
              ...todayWorkouts,
              // Seção Histórico (apenas se tiver)
              ...(olderWorkouts.length > 0
                ? [{ _section: 'Histórico', _count: olderWorkouts.length } as const]
                : []),
              ...olderWorkouts,
            ]}
            keyExtractor={(item) =>
              '_section' in item ? `section-${item._section}` : item.id
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void load(true)}
                tintColor={colors.accent}
              />
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              if ('_section' in item) {
                return (
                  <View style={styles.sectionRow}>
                    <Text style={styles.sectionLabel}>{item._section.toUpperCase()}</Text>
                    {item._count > 0 && (
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>{item._count}</Text>
                      </View>
                    )}
                    {item._section === 'Hoje' && item._count === 0 && (
                      <Text style={styles.emptyInline}>
                        Nenhum treino hoje. Registre algo como "10km 4x11" acima.
                      </Text>
                    )}
                  </View>
                );
              }
              return (
                <WorkoutCard
                  item={item}
                  onDelete={(id) => void handleDelete(id)}
                  deleting={deletingId === item.id}
                />
              );
            }}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Input
  inputSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 6,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  registerBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  registerBtnDisabled: {
    opacity: 0.4,
  },
  registerBtnText: {
    color: colors.bg,
    fontWeight: '700',
    fontSize: 14,
  },
  savedFeedback: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '500',
  },
  saveErrorText: {
    fontSize: 13,
    color: colors.error,
  },

  // List
  listContent: {
    padding: 16,
    // Tab bar flutuante — conteúdo rola por baixo dela.
    paddingBottom: 100,
    gap: 10,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  sectionBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '600',
  },
  emptyInline: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardRaw: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  deleteBtn: {
    padding: 2,
  },
  deleteBtnText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
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
  cardSummary: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  cardNote: {
    fontSize: 13,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  cardDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  // States
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 60,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  errorIcon: {
    fontSize: 28,
    color: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
