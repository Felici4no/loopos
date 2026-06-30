/**
 * Tela Leitura — módulo de livros e sessões do LoopOS.
 *
 * Fluxo: adicionar livro → registrar sessão → progresso atualizado
 *        → tela Hoje reflete a sessão ao ganhar foco.
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
  getBooks,
  createBook,
  deleteBook,
  createReadingSession,
  ApiError,
} from '../../lib/api.js';
import {
  calculateReadingProgress,
  formatReadingProgress,
} from '../../lib/readingProgress.js';
import type { Book, CreateBookPayload, CreateReadingSessionPayload } from '../../types/reading.js';
import { colors } from '../../components/ui.js';
import { todayISO } from '@loopos/shared';

// ─── ProgressBar ─────────────────────────────────────────────────────────────

function ProgressBar({ percent }: { percent: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(percent, 100)}%` as `${number}%` }]} />
    </View>
  );
}

// ─── BookCard ─────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: Book;
  onRegisterSession: (book: Book) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function BookCard({ book, onRegisterSession, onDelete, deleting }: BookCardProps) {
  const progress = calculateReadingProgress(book);

  function handleDelete() {
    Alert.alert(
      'Excluir livro',
      `"${book.title}" e todas as suas sessões serão removidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => onDelete(book.id) },
      ],
    );
  }

  return (
    <View style={styles.card}>
      {/* Header do card */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{book.title}</Text>
          {book.author && (
            <Text style={styles.cardAuthor}>{book.author}</Text>
          )}
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

      {/* Progresso */}
      {(book.totalPages ?? 0) > 0 && (
        <View style={styles.progressSection}>
          <Text style={styles.progressLabel}>{formatReadingProgress(book)}</Text>
          <ProgressBar percent={progress.percent} />
        </View>
      )}

      {/* Botão de sessão */}
      <TouchableOpacity
        style={styles.sessionBtn}
        onPress={() => onRegisterSession(book)}
      >
        <Text style={styles.sessionBtnText}>+ Registrar leitura</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Modal: Adicionar livro ───────────────────────────────────────────────────

interface AddBookModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (payload: CreateBookPayload) => Promise<void>;
}

function AddBookModal({ visible, onClose, onSave }: AddBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [totalPages, setTotalPages] = useState('');
  const [currentPage, setCurrentPage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setTitle('');
    setAuthor('');
    setTotalPages('');
    setCurrentPage('');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    const trimTitle = title.trim();
    if (!trimTitle) { setError('Título obrigatório.'); return; }

    const pages = parseInt(totalPages.trim(), 10);
    if (!totalPages.trim() || isNaN(pages) || pages <= 0) {
      setError('Total de páginas deve ser um número positivo.');
      return;
    }

    const cur = currentPage.trim() ? parseInt(currentPage.trim(), 10) : 0;
    if (isNaN(cur) || cur < 0) {
      setError('Página atual inválida.');
      return;
    }
    if (cur > pages) {
      setError('Página atual não pode ser maior que o total.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        title: trimTitle,
        author: author.trim() || null,
        totalPages: pages,
        currentPage: cur,
        status: 'READING',
        startedAt: new Date().toISOString(),
      });
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar livro.');
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar livro</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCloseBtn}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Campos */}
          <Text style={styles.fieldLabel}>Título *</Text>
          <TextInput
            style={styles.field}
            value={title}
            onChangeText={setTitle}
            placeholder="Nome do livro"
            placeholderTextColor={colors.textMuted}
            autoFocus
          />

          <Text style={styles.fieldLabel}>Autor</Text>
          <TextInput
            style={styles.field}
            value={author}
            onChangeText={setAuthor}
            placeholder="Opcional"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.fieldLabel}>Total de páginas *</Text>
          <TextInput
            style={styles.field}
            value={totalPages}
            onChangeText={setTotalPages}
            placeholder="Ex: 320"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={styles.fieldLabel}>Página atual</Text>
          <TextInput
            style={styles.field}
            value={currentPage}
            onChangeText={setCurrentPage}
            placeholder="0 se ainda não começou"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          {error && <Text style={styles.fieldError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={styles.saveBtnText}>Salvar livro</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Modal: Registrar sessão ──────────────────────────────────────────────────

interface RegisterSessionModalProps {
  book: Book | null;
  onClose: () => void;
  onSave: (payload: CreateReadingSessionPayload) => Promise<void>;
}

function RegisterSessionModal({ book, onClose, onSave }: RegisterSessionModalProps) {
  const [pagesRead, setPagesRead] = useState('');
  const [fromPage, setFromPage] = useState('');
  const [toPage, setToPage] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pré-preenche fromPage com a página atual do livro
  useEffect(() => {
    if (book) {
      const cur = book.currentPage ?? 0;
      setFromPage(cur > 0 ? String(cur) : '');
    }
  }, [book]);

  function reset() {
    setPagesRead('');
    setFromPage('');
    setToPage('');
    setNote('');
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSave() {
    if (!book) return;

    const pages = parseInt(pagesRead.trim(), 10);
    if (!pagesRead.trim() || isNaN(pages) || pages <= 0) {
      setError('Informe quantas páginas foram lidas (número positivo).');
      return;
    }

    const from = fromPage.trim() ? parseInt(fromPage.trim(), 10) : null;
    const to = toPage.trim() ? parseInt(toPage.trim(), 10) : null;

    if (from !== null && isNaN(from)) { setError('Página inicial inválida.'); return; }
    if (to !== null && isNaN(to)) { setError('Página final inválida.'); return; }
    if (from !== null && to !== null && to < from) {
      setError('Página final deve ser maior ou igual à inicial.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        bookId: book.id,
        date: todayISO(),
        pagesRead: pages,
        fromPage: from,
        toPage: to,
        note: note.trim() || null,
      });
      reset();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar sessão.');
    } finally {
      setSaving(false);
    }
  }

  if (!book) return null;

  const progress = calculateReadingProgress(book);

  return (
    <Modal
      visible={!!book}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.modalWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>Registrar leitura</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.modalCloseBtn}>Cancelar</Text>
            </TouchableOpacity>
          </View>

          {/* Info do livro */}
          <View style={styles.sessionBookInfo}>
            <Text style={styles.sessionBookTitle}>{book.title}</Text>
            {(book.totalPages ?? 0) > 0 && (
              <Text style={styles.sessionBookProgress}>
                {progress.current}/{book.totalPages ?? 0}p · {progress.percent}%
              </Text>
            )}
          </View>

          {/* Campos */}
          <Text style={styles.fieldLabel}>Páginas lidas *</Text>
          <TextInput
            style={styles.field}
            value={pagesRead}
            onChangeText={setPagesRead}
            placeholder="Ex: 22"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
            autoFocus
          />

          <View style={styles.fieldRow}>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>De (página)</Text>
              <TextInput
                style={styles.field}
                value={fromPage}
                onChangeText={setFromPage}
                placeholder="Opcional"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.fieldLabel}>Até (página)</Text>
              <TextInput
                style={styles.field}
                value={toPage}
                onChangeText={setToPage}
                placeholder="Opcional"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>Nota</Text>
          <TextInput
            style={[styles.field, styles.fieldMultiline]}
            value={note}
            onChangeText={setNote}
            placeholder="Observação opcional"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />

          {error && <Text style={styles.fieldError}>{error}</Text>}

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.bg} />
              : <Text style={styles.saveBtnText}>Salvar sessão</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── ReadingScreen ────────────────────────────────────────────────────────────

export default function ReadingScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddBook, setShowAddBook] = useState(false);
  const [sessionBook, setSessionBook] = useState<Book | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // ─── Load ──────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getBooks();
      setBooks(data);
    } catch (err) {
      setError(err instanceof ApiError
        ? `Erro ${err.status}: ${err.message}`
        : 'Não foi possível carregar os livros.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // ─── Add book ──────────────────────────────────────────────────────────

  async function handleAddBook(payload: CreateBookPayload) {
    const created = await createBook(payload);
    setBooks((prev) => [created, ...prev]);
    setShowAddBook(false);
    showFeedback(`"${created.title}" adicionado`);
  }

  // ─── Register session ──────────────────────────────────────────────────

  async function handleRegisterSession(payload: CreateReadingSessionPayload) {
    await createReadingSession(payload);
    // Recarrega para pegar currentPage atualizado pelo backend
    const updated = await getBooks();
    setBooks(updated);
    setSessionBook(null);
    showFeedback('Sessão registrada');
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao excluir livro.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Feedback ──────────────────────────────────────────────────────────

  function showFeedback(msg: string) {
    setSavedFeedback(msg);
    setTimeout(() => setSavedFeedback(null), 3000);
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const readingBooks = books.filter((b) => b.status === 'READING');
  const otherBooks = books.filter((b) => b.status !== 'READING');

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leitura</Text>
          <Text style={styles.headerSub}>Biblioteca pessoal</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddBook(true)}>
          <Text style={styles.addBtnText}>+ Livro</Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      {savedFeedback && (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>✓ {savedFeedback}</Text>
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
        </View>
      ) : (
        <FlatList
          data={[
            { _section: 'Em andamento', _count: readingBooks.length } as const,
            ...readingBooks,
            ...(otherBooks.length > 0
              ? [{ _section: 'Outros', _count: otherBooks.length } as const]
              : []),
            ...otherBooks,
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
                  {item._count === 0 && (
                    <Text style={styles.emptyInline}>— nenhum livro em andamento</Text>
                  )}
                </View>
              );
            }
            return (
              <BookCard
                book={item}
                onRegisterSession={setSessionBook}
                onDelete={(id) => void handleDelete(id)}
                deleting={deletingId === item.id}
              />
            );
          }}
        />
      )}

      {/* Modais */}
      <AddBookModal
        visible={showAddBook}
        onClose={() => setShowAddBook(false)}
        onSave={handleAddBook}
      />
      <RegisterSessionModal
        book={sessionBook}
        onClose={() => setSessionBook(null)}
        onSave={handleRegisterSession}
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

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
  },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, color: colors.textSecondary },
  sectionBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  sectionBadgeText: { fontSize: 11, color: colors.accent, fontWeight: '600' },
  emptyInline: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },

  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleBlock: { flex: 1, marginRight: 8, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardAuthor: { fontSize: 13, color: colors.textSecondary },
  deleteBtn: { padding: 2 },
  deleteBtnText: { fontSize: 14, color: colors.textMuted },

  progressSection: { gap: 6 },
  progressLabel: { fontSize: 12, color: colors.textSecondary },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  sessionBtn: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  sessionBtnText: { color: colors.accent, fontWeight: '600', fontSize: 14 },

  // Modal
  modalWrapper: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: 20, gap: 6, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flex: 1 },
  modalCloseBtn: { color: colors.textSecondary, fontSize: 15 },

  // Session book info
  sessionBookInfo: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    gap: 2,
  },
  sessionBookTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  sessionBookProgress: { fontSize: 12, color: colors.accent },

  // Form fields
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
  fieldMultiline: { height: 80, textAlignVertical: 'top' },
  fieldRow: { flexDirection: 'row', gap: 10 },
  fieldHalf: { flex: 1 },
  fieldError: { fontSize: 13, color: colors.error, marginTop: 4 },

  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: colors.bg, fontWeight: '700', fontSize: 16 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 60 },
  stateText: { color: colors.textSecondary, fontSize: 15 },
  errorIcon: { fontSize: 28, color: colors.error },
  errorText: { color: colors.error, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
});
