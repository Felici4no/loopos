/**
 * Tela Ritmo — módulo de hábitos e trackers do LoopOS.
 *
 * Fluxo: criar tracker → registrar evento diário (sem duplicar) →
 *        streak atualizado → tela Hoje reflete ao ganhar foco.
 *
 * Anti-duplicidade: verificada no cliente com hasEventToday().
 * TODO backend: adicionar unique constraint em (tracker_id, date, user_id).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getTrackers,
  createTracker,
  deleteTracker,
  getTrackerEvents,
  createTrackerEvent,
  ApiError,
} from '../../lib/api.js';
import {
  hasEventToday,
  calculateCurrentStreak,
  getTrackerStatusLabel,
} from '../../lib/rhythmStats.js';
import type {
  Tracker,
  TrackerEvent,
  CreateTrackerPayload,
  TrackerType,
} from '../../types/rhythm.js';
import { colors } from '../../components/ui.js';
import { todayISO } from '@loopos/shared';

// ─── Tracker type labels ─────────────────────────────────────────────────────

const TYPE_LABELS: Record<TrackerType, string> = {
  boolean: 'Sim/Não',
  count: 'Contador',
  duration: 'Duração (min)',
};

// ─── ValueInputModal — para trackers count/duration ───────────────────────────

interface ValueInputModalProps {
  tracker: Tracker | null;
  onClose: () => void;
  onSave: (value: number) => Promise<void>;
}

function ValueInputModal({ tracker, onClose, onSave }: ValueInputModalProps) {
  const [valueStr, setValueStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() { setValueStr(''); setError(null); }

  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    const v = parseFloat(valueStr.replace(',', '.'));
    if (isNaN(v) || v <= 0) {
      setError('Informe um número positivo.');
      return;
    }
    setSaving(true);
    try {
      await onSave(v);
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  if (!tracker) return null;

  const unit = tracker.type === 'duration' ? 'minutos' : 'unidades';
  const placeholder = tracker.target ? `Meta: ${tracker.target} ${unit}` : `Quantidade (${unit})`;

  return (
    <Modal visible={!!tracker} animationType="fade" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.valueModal}>
            <Text style={styles.valueModalTitle}>{tracker.title}</Text>
            <Text style={styles.valueModalSub}>{TYPE_LABELS[tracker.type]}</Text>
            <TextInput
              style={styles.valueInput}
              value={valueStr}
              onChangeText={setValueStr}
              placeholder={placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
              autoFocus
              onSubmitEditing={() => void handleSave()}
            />
            {error && <Text style={styles.fieldError}>{error}</Text>}
            <View style={styles.valueModalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={() => void handleSave()}
                disabled={saving}
              >
                {saving
                  ? <ActivityIndicator size="small" color={colors.bg} />
                  : <Text style={styles.saveBtnText}>Registrar</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

// ─── AddTrackerModal ──────────────────────────────────────────────────────────

interface AddTrackerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: CreateTrackerPayload) => Promise<void>;
}

function AddTrackerModal({ visible, onClose, onSave }: AddTrackerModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TrackerType>('boolean');
  const [targetStr, setTargetStr] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TYPES: TrackerType[] = ['boolean', 'count', 'duration'];

  function reset() { setTitle(''); setType('boolean'); setTargetStr(''); setError(null); }
  function handleClose() { reset(); onClose(); }

  async function handleSave() {
    if (!title.trim()) { setError('Título obrigatório.'); return; }

    const target = targetStr.trim()
      ? parseInt(targetStr.trim(), 10)
      : undefined;

    if (targetStr.trim() && (isNaN(target ?? NaN) || (target ?? 0) <= 0)) {
      setError('Meta deve ser um número positivo.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), type, target: target ?? null, isActive: true });
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar tracker.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Criar contador</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCloseBtn}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>Título *</Text>
          <TextInput
            style={styles.field}
            value={title}
            onChangeText={setTitle}
            placeholder="Ex: Meditação, Água, Sem açúcar"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Tipo *</Text>
          <View style={styles.typeRow}>
            {TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                  {TYPE_LABELS[t]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type !== 'boolean' && (
            <>
              <Text style={styles.fieldLabel}>
                Meta diária {type === 'duration' ? '(min)' : '(qtd)'} — opcional
              </Text>
              <TextInput
                style={styles.field}
                value={targetStr}
                onChangeText={setTargetStr}
                placeholder={type === 'duration' ? 'Ex: 30' : 'Ex: 8'}
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          {error && <Text style={styles.fieldError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveBtnFull, saving && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={styles.saveBtnText}>Criar contador</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── TrackerCard ─────────────────────────────────────────────────────────────

interface TrackerCardProps {
  tracker: Tracker;
  events: TrackerEvent[];
  today: string;
  onCheck: (tracker: Tracker) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
  checking: boolean;
}

function TrackerCard({
  tracker, events, today, onCheck, onDelete, deleting, checking,
}: TrackerCardProps) {
  const done = hasEventToday(tracker, events, today);
  const streak = calculateCurrentStreak(tracker, events, today);
  const statusLabel = getTrackerStatusLabel(tracker, events, today);

  function handleDelete() {
    Alert.alert(
      'Excluir tracker',
      `"${tracker.title}" e todos os eventos serão removidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDelete(tracker.id) },
      ],
    );
  }

  return (
    <View style={[styles.card, done && styles.cardDone]}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle}>{tracker.title}</Text>
          <Text style={styles.cardType}>{TYPE_LABELS[tracker.type]}</Text>
        </View>
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Text style={styles.deleteBtnText}>✕</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Status row */}
      <View style={styles.statusRow}>
        <Text style={[styles.statusLabel, done && styles.statusDone]}>
          {statusLabel}
        </Text>
        {streak >= 2 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{streak}🔥</Text>
          </View>
        )}
      </View>

      {/* Meta, se existir */}
      {tracker.target !== null && (
        <Text style={styles.targetLabel}>
          Meta: {tracker.target}{tracker.type === 'duration' ? ' min' : ''}
        </Text>
      )}

      {/* Botão de check */}
      <TouchableOpacity
        style={[styles.checkBtn, done && styles.checkBtnDone]}
        onPress={() => onCheck(tracker)}
        disabled={checking || done}
      >
        {checking
          ? <ActivityIndicator size="small" color={done ? colors.bg : colors.accent} />
          : <Text style={[styles.checkBtnText, done && styles.checkBtnTextDone]}>
              {done ? '✓ Feito hoje' : '+ Registrar hoje'}
            </Text>
        }
      </TouchableOpacity>
    </View>
  );
}

// ─── RhythmScreen ─────────────────────────────────────────────────────────────

export default function RhythmScreen() {
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [events, setEvents] = useState<TrackerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAdd, setShowAdd] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [valueTracker, setValueTracker] = useState<Tracker | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const today = todayISO();

  // ─── Load ────────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [t, e] = await Promise.all([
        getTrackers(),
        getTrackerEvents(),          // todos os eventos do usuário
      ]);
      setTrackers(t.filter((tr) => tr.isActive));
      setEvents(e);
    } catch (err) {
      setError(err instanceof ApiError
        ? `Erro ${err.status}: ${err.message}`
        : 'Não foi possível carregar os trackers.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ─── Add tracker ─────────────────────────────────────────────────────────

  async function handleAddTracker(payload: CreateTrackerPayload) {
    const created = await createTracker(payload);
    setTrackers((prev) => [...prev, created]);
    setShowAdd(false);
    showFeedbackMsg(`"${created.title}" criado`);
  }

  // ─── Check / register event ───────────────────────────────────────────────

  async function handleCheck(tracker: Tracker) {
    // Anti-duplicidade: verificação no cliente
    if (hasEventToday(tracker, events, today)) {
      showFeedbackMsg(`"${tracker.title}" já registrado hoje`);
      return;
    }

    // Trackers count/duration pedem valor numérico
    if (tracker.type !== 'boolean') {
      setValueTracker(tracker);
      return;
    }

    await doRegisterEvent(tracker.id, 'check', undefined);
  }

  async function handleValueSave(value: number) {
    if (!valueTracker) return;
    await doRegisterEvent(valueTracker.id, 'value', value);
    setValueTracker(null);
  }

  async function doRegisterEvent(
    trackerId: string,
    eventType: 'check' | 'value',
    value: number | undefined,
  ) {
    setCheckingId(trackerId);
    try {
      const event = await createTrackerEvent({
        trackerId,
        date: today,
        eventType,
        value: value ?? null,
      });
      setEvents((prev) => [...prev, event]);
      showFeedbackMsg('Registrado ✓');
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao registrar.');
    } finally {
      setCheckingId(null);
    }
  }

  // ─── Delete tracker ───────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteTracker(id);
      setTrackers((prev) => prev.filter((t) => t.id !== id));
      setEvents((prev) => prev.filter((e) => e.trackerId !== id));
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao excluir.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Feedback ────────────────────────────────────────────────────────────

  function showFeedbackMsg(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  const doneToday = trackers.filter((t) => hasEventToday(t, events, today)).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Ritmo</Text>
          <Text style={styles.headerSub}>
            {trackers.length > 0
              ? `${doneToday} / ${trackers.length} hoje`
              : 'Hábitos e contadores'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+ Contador</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      {feedback && (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      {/* Conteúdo */}
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
          data={trackers}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void load(true)}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={[
            styles.listContent,
            trackers.length === 0 && styles.listEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔁</Text>
              <Text style={styles.emptyTitle}>Nenhum contador ainda</Text>
              <Text style={styles.emptyHint}>
                Crie um contador para acompanhar um ciclo, hábito ou frequência diária.
              </Text>
              <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAdd(true)}>
                <Text style={styles.addBtnText}>+ Criar contador</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <TrackerCard
              tracker={item}
              events={events}
              today={today}
              onCheck={(t) => void handleCheck(t)}
              onDelete={(id) => void handleDelete(id)}
              deleting={deletingId === item.id}
              checking={checkingId === item.id}
            />
          )}
        />
      )}

      {/* Modais */}
      <AddTrackerModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={handleAddTracker}
      />
      <ValueInputModal
        tracker={valueTracker}
        onClose={() => setValueTracker(null)}
        onSave={handleValueSave}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },
  addBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: colors.bg, fontWeight: '700', fontSize: 14 },

  feedbackBanner: {
    backgroundColor: colors.accentDim,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  feedbackText: { color: colors.success, fontSize: 13, fontWeight: '500' },

  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  listEmpty: { flex: 1 },

  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyHint: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyAddBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
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
  cardDone: { borderColor: colors.accent + '44' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleBlock: { flex: 1, marginRight: 8, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardType: { fontSize: 12, color: colors.textMuted },
  deleteBtn: { padding: 2 },
  deleteBtnText: { fontSize: 14, color: colors.textMuted },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  statusDone: { color: colors.success },
  streakBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  streakText: { fontSize: 12, color: colors.accent, fontWeight: '600' },
  targetLabel: { fontSize: 12, color: colors.textMuted },

  checkBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  checkBtnDone: { backgroundColor: colors.success + '22', borderColor: colors.success },
  checkBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  checkBtnTextDone: { color: colors.success },

  // Modal geral
  modalWrapper: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: 20, gap: 6, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  modalCloseBtn: { color: colors.textSecondary, fontSize: 15 },

  fieldLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600', marginTop: 8 },
  field: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldError: { fontSize: 13, color: colors.error, marginTop: 4 },

  typeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  typeBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeBtnActive: { backgroundColor: colors.accentDim, borderColor: colors.accent },
  typeBtnText: { fontSize: 13, color: colors.textSecondary },
  typeBtnTextActive: { color: colors.accent, fontWeight: '600' },

  saveBtnFull: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    flex: 1,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 15 },

  // Value modal (overlay)
  overlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 24,
  },
  valueModal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  valueModalTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  valueModalSub: { fontSize: 13, color: colors.textSecondary },
  valueInput: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  valueModalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: colors.textSecondary, fontSize: 15 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  stateText: { color: colors.textSecondary, fontSize: 15 },
  errorIcon: { fontSize: 28, color: colors.error },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnText: { color: colors.accent, fontSize: 14, fontWeight: '600' },
});
