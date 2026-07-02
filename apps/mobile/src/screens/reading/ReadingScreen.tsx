/**
 * Tela Leitura — módulo de livros e sessões do LoopOS.
 *
 * Fluxo: adicionar livro → registrar sessão → progresso atualizado
 *        → tela Hoje reflete a sessão ao ganhar foco.
 *
 * Seções por status real do ciclo de leitura:
 *   Em andamento (READING com página > 0) → Ainda não iniciado
 *   (página 0, inclui WANT_TO_READ) → Finalizados (FINISHED).
 *   DROPPED fica oculto por enquanto — sem UI dedicada no v0.1; os dados
 *   permanecem no banco local e podem ganhar seção própria depois.
 *
 * Toque no livro abre o detalhe com todas as sessões e notas.
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
import { Ionicons } from '@expo/vector-icons';
import {
  getBooks,
  createBook,
  deleteBook,
  createReadingSession,
  getReadingSessions,
  DataError as ApiError,
} from '../../lib/data.js';
import { calculateReadingProgress } from '../../lib/readingProgress.js';
import { getReadingSuccessMessage } from '../../lib/insights.js';
import type {
  Book,
  ReadingSession,
  CreateBookPayload,
  CreateReadingSessionPayload,
} from '../../types/reading.js';
import { colors } from '../../components/ui.js';
import { ProgressBar } from '../../components/viz.js';
import { SuccessBanner } from '../../components/SuccessBanner.js';
import { todayISO } from '@loopos/shared';

// ─── Helpers ──────────────────────────────────────────────────────────────────

type BookSection = 'reading' | 'notStarted' | 'finished';

/** Classifica o livro pelo estado real de leitura (não só pelo status). */
function classifyBook(book: Book): BookSection | null {
  if (book.status === 'FINISHED') return 'finished';
  if (book.status === 'DROPPED') return null; // oculto — ver doc no topo
  if ((book.currentPage ?? 0) === 0) return 'notStarted';
  return 'reading';
}

function formatSessionDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const STATUS_LABELS: Record<BookSection, string> = {
  reading: 'Em andamento',
  notStarted: 'Ainda não iniciado',
  finished: 'Finalizado',
};

// ─── BookCard ─────────────────────────────────────────────────────────────────

interface BookCardProps {
  book: Book;
  sessions: ReadingSession[];
  today: string;
  onOpenDetail: (book: Book) => void;
  onRegisterSession: (book: Book) => void;
  onDelete: (id: string) => void;
  deleting: boolean;
}

function BookCard({
  book, sessions, today, onOpenDetail, onRegisterSession, onDelete, deleting,
}: BookCardProps) {
  const progress = calculateReadingProgress(book);
  const section = classifyBook(book);
  const finished = section === 'finished';

  const mySessions = sessions.filter((s) => s.bookId === book.id);
  const lastDate = mySessions.map((s) => s.date).sort().at(-1) ?? null;
  const pagesToday = mySessions
    .filter((s) => s.date === today)
    .reduce((sum, s) => sum + s.pagesRead, 0);
  const noteCount = mySessions.filter((s) => s.note).length;

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
    <TouchableOpacity style={styles.card} onPress={() => onOpenDetail(book)} activeOpacity={0.75}>
      {/* Header do card */}
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleBlock}>
          <Text style={styles.cardTitle} numberOfLines={2}>{book.title}</Text>
          {book.author && (
            <Text style={styles.cardAuthor}>{book.author}</Text>
          )}
        </View>
        {finished && (
          <View style={styles.finishedChip}>
            <Ionicons name="checkmark" size={11} color={colors.success} />
            <Text style={styles.finishedChipText}>Finalizado</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={deleting}
          style={styles.deleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {deleting
            ? <ActivityIndicator size="small" color={colors.error} />
            : <Ionicons name="close" size={16} color={colors.textMuted} />
          }
        </TouchableOpacity>
      </View>

      {/* Progresso */}
      {(book.totalPages ?? 0) > 0 && (
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text style={[styles.progressPct, finished && styles.progressPctDone]}>
              {progress.percent}%
            </Text>
            <View style={styles.progressBarArea}>
              <ProgressBar
                value={progress.percent / 100}
                height={5}
                color={finished ? colors.success : colors.accent}
              />
              <Text style={styles.progressLabel}>
                {progress.current} de {progress.total} páginas
                {pagesToday > 0 && ` · ${pagesToday} hoje`}
                {pagesToday === 0 && lastDate && ` · última: ${formatSessionDate(lastDate)}`}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Rodapé: sessões/notas + ação */}
      <View style={styles.cardFooter}>
        <Text style={styles.cardMeta}>
          {mySessions.length === 0
            ? 'Nenhuma sessão ainda'
            : `${mySessions.length} sess${mySessions.length === 1 ? 'ão' : 'ões'}${
                noteCount > 0 ? ` · ${noteCount} nota${noteCount === 1 ? '' : 's'}` : ''
              }`}
        </Text>
        {!finished && (
          <TouchableOpacity
            style={styles.sessionBtn}
            onPress={() => onRegisterSession(book)}
          >
            <Text style={styles.sessionBtnText}>+ Registrar leitura</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Modal: Detalhe do livro (sessões + notas) ────────────────────────────────

interface BookDetailModalProps {
  book: Book | null;
  sessions: ReadingSession[];
  onClose: () => void;
  onRegisterSession: (book: Book) => void;
}

function BookDetailModal({ book, sessions, onClose, onRegisterSession }: BookDetailModalProps) {
  if (!book) return null;

  const progress = calculateReadingProgress(book);
  const section = classifyBook(book) ?? 'reading';
  const finished = section === 'finished';
  const mySessions = sessions
    .filter((s) => s.bookId === book.id)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const totalRead = mySessions.reduce((sum, s) => sum + s.pagesRead, 0);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalWrapper}>
        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={2}>{book.title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalCloseBtn}>Fechar</Text>
            </TouchableOpacity>
          </View>

          {book.author && <Text style={styles.detailAuthor}>{book.author}</Text>}

          {/* Status + progresso */}
          <View style={styles.detailStatusRow}>
            <View style={[styles.statusChip, finished && styles.statusChipDone]}>
              <Text style={[styles.statusChipText, finished && styles.statusChipTextDone]}>
                {STATUS_LABELS[section]}
              </Text>
            </View>
            {mySessions.length > 0 && (
              <Text style={styles.detailMeta}>
                {totalRead} páginas em {mySessions.length} sess
                {mySessions.length === 1 ? 'ão' : 'ões'}
              </Text>
            )}
          </View>

          {(book.totalPages ?? 0) > 0 && (
            <View style={styles.detailProgress}>
              <Text style={[styles.detailPct, finished && styles.progressPctDone]}>
                {progress.percent}%
              </Text>
              <View style={styles.progressBarArea}>
                <ProgressBar
                  value={progress.percent / 100}
                  height={6}
                  color={finished ? colors.success : colors.accent}
                />
                <Text style={styles.progressLabel}>
                  {progress.current} de {progress.total} páginas
                </Text>
              </View>
            </View>
          )}

          {/* Sessões */}
          <Text style={styles.detailSectionLabel}>SESSÕES DE LEITURA</Text>
          {mySessions.length === 0 ? (
            <Text style={styles.detailEmpty}>
              Nenhuma sessão registrada ainda.
            </Text>
          ) : (
            mySessions.map((s) => (
              <View key={s.id} style={styles.sessionRow}>
                <View style={styles.sessionHeader}>
                  <Text style={styles.sessionDate}>{formatSessionDate(s.date)}</Text>
                  <Text style={styles.sessionPages}>
                    {s.pagesRead} pág{s.pagesRead === 1 ? '' : 's'}
                    {s.fromPage !== null && s.toPage !== null && (
                      <Text style={styles.sessionRange}>  ·  p. {s.fromPage}–{s.toPage}</Text>
                    )}
                  </Text>
                </View>
                {s.note && (
                  <View style={styles.sessionNote}>
                    <Ionicons name="chatbox-ellipses-outline" size={13} color={colors.textSecondary} />
                    <Text style={styles.sessionNoteText}>{s.note}</Text>
                  </View>
                )}
              </View>
            ))
          )}

          {/* Ação */}
          {!finished && (
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => onRegisterSession(book)}
            >
              <Text style={styles.saveBtnText}>+ Registrar leitura</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
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
        // Sem leitura iniciada → WANT_TO_READ (aparece em "Ainda não iniciado")
        status: cur > 0 ? 'READING' : 'WANT_TO_READ',
        startedAt: cur > 0 ? new Date().toISOString() : null,
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

type ListEntry = Book | { _section: string; _count: number; _hint?: string };

export default function ReadingScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddBook, setShowAddBook] = useState(false);
  const [sessionBook, setSessionBook] = useState<Book | null>(null);
  const [detailBook, setDetailBook] = useState<Book | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const today = todayISO();

  // ─── Load ──────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [allBooks, allSessions] = await Promise.all([
        getBooks(),
        getReadingSessions(),
      ]);
      setBooks(allBooks);
      setSessions(allSessions);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
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
    setFeedback(`"${created.title}" adicionado à biblioteca.`);
  }

  // ─── Register session ──────────────────────────────────────────────────

  async function handleRegisterSession(payload: CreateReadingSessionPayload) {
    const wasFinished = books.find((b) => b.id === payload.bookId)?.status === 'FINISHED';
    await createReadingSession(payload);
    // Recarrega para pegar currentPage/status atualizados pela camada de dados
    const [updatedBooks, updatedSessions] = await Promise.all([
      getBooks(),
      getReadingSessions(),
    ]);
    setBooks(updatedBooks);
    setSessions(updatedSessions);
    setSessionBook(null);

    const nowFinished =
      updatedBooks.find((b) => b.id === payload.bookId)?.status === 'FINISHED';
    setFeedback(getReadingSuccessMessage(payload.pagesRead, !wasFinished && nowFinished));

    // Mantém o detalhe (se aberto) apontando para o livro atualizado
    setDetailBook((prev) =>
      prev ? (updatedBooks.find((b) => b.id === prev.id) ?? null) : null,
    );
  }

  // ─── Delete ────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteBook(id);
      setBooks((prev) => prev.filter((b) => b.id !== id));
      setSessions((prev) => prev.filter((s) => s.bookId !== id));
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao excluir livro.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────

  const readingBooks = books.filter((b) => classifyBook(b) === 'reading');
  const notStartedBooks = books.filter((b) => classifyBook(b) === 'notStarted');
  const finishedBooks = books.filter((b) => classifyBook(b) === 'finished');

  const listData: ListEntry[] = [
    {
      _section: 'Em andamento',
      _count: readingBooks.length,
      ...(readingBooks.length === 0
        ? { _hint: 'Nenhum livro em andamento. Adicione com "+ Livro" ou registre uma leitura.' }
        : {}),
    },
    ...readingBooks,
    ...(notStartedBooks.length > 0
      ? [{ _section: 'Ainda não iniciado', _count: notStartedBooks.length }, ...notStartedBooks]
      : []),
    ...(finishedBooks.length > 0
      ? [{ _section: 'Finalizados', _count: finishedBooks.length }, ...finishedBooks]
      : []),
  ];

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Leitura</Text>
          <Text style={styles.headerSub}>
            {books.length > 0
              ? `${readingBooks.length} em andamento · ${finishedBooks.length} finalizado${finishedBooks.length === 1 ? '' : 's'}`
              : 'Biblioteca pessoal'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddBook(true)}>
          <Text style={styles.addBtnText}>+ Livro</Text>
        </TouchableOpacity>
      </View>

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
          data={listData}
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
                  {item._hint && (
                    <Text style={styles.emptyInline}>{item._hint}</Text>
                  )}
                </View>
              );
            }
            return (
              <BookCard
                book={item}
                sessions={sessions}
                today={today}
                onOpenDetail={setDetailBook}
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
      <BookDetailModal
        book={detailBook}
        sessions={sessions}
        onClose={() => setDetailBook(null)}
        onRegisterSession={(b) => {
          setDetailBook(null);
          setSessionBook(b);
        }}
      />

      {/* Feedback de sucesso */}
      <SuccessBanner message={feedback} onHide={() => setFeedback(null)} />
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

  listContent: { padding: 16, paddingBottom: 100, gap: 10 },

  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 2,
    flexWrap: 'wrap',
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
    backgroundColor: colors.surfaceGlass,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardTitleBlock: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text },
  cardAuthor: { fontSize: 13, color: colors.textSecondary },
  deleteBtn: { padding: 2 },

  finishedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.22)',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  finishedChipText: { fontSize: 11, fontWeight: '600', color: colors.success },

  progressSection: { gap: 6 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  progressPct: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    minWidth: 52,
  },
  progressPctDone: { color: colors.success },
  progressBarArea: { flex: 1, gap: 5 },
  progressLabel: { fontSize: 12, color: colors.textSecondary },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  cardMeta: { fontSize: 12, color: colors.textMuted, flex: 1 },

  sessionBtn: {
    backgroundColor: colors.accentDim,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.accentGlassBorder,
  },
  sessionBtnText: { color: colors.accent, fontWeight: '600', fontSize: 13 },

  // Detail modal
  detailContent: { padding: 20, gap: 10, paddingBottom: 40 },
  detailAuthor: { fontSize: 14, color: colors.textSecondary, marginTop: -6 },
  detailStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  statusChip: {
    backgroundColor: colors.accentGlass,
    borderWidth: 1,
    borderColor: colors.accentGlassBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusChipDone: {
    backgroundColor: 'rgba(74, 222, 128, 0.10)',
    borderColor: 'rgba(74, 222, 128, 0.22)',
  },
  statusChipText: { fontSize: 12, fontWeight: '600', color: colors.accent },
  statusChipTextDone: { color: colors.success },
  detailMeta: { fontSize: 12, color: colors.textMuted },
  detailProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
    marginBottom: 6,
  },
  detailPct: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accent,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
  },
  detailSectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    color: colors.textMuted,
    marginTop: 10,
  },
  detailEmpty: { fontSize: 13, color: colors.textMuted, fontStyle: 'italic' },
  sessionRow: {
    backgroundColor: colors.surfaceGlass,
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  sessionDate: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, textTransform: 'capitalize' },
  sessionPages: { fontSize: 13, fontWeight: '600', color: colors.text },
  sessionRange: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  sessionNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingTop: 2,
  },
  sessionNoteText: { flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  // Modal (form)
  modalWrapper: { flex: 1, backgroundColor: colors.bg },
  modalContent: { padding: 20, gap: 6, paddingBottom: 40 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
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
