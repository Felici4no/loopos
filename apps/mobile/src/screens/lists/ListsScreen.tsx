/**
 * Tela Listas — módulo de listas hierárquicas do LoopOS.
 *
 * UI limitada a 2 níveis nesta etapa: lista raiz → item → subitem (expansão simples).
 * O banco suporta recursividade ilimitada (parentId self-reference), mas a
 * interface do MVP evita árvore visual infinita — ver ADR de Listas.
 *
 * Navegação: estado local `selectedList` simula drill-down sem stack navigator.
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
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getListNodes,
  getListNode,
  createListNode,
  updateListNode,
  deleteListNode,
  DataError as ApiError,
} from '../../lib/data.js';
import type { ListNode } from '../../types/lists.js';
import { colors } from '../../components/ui.js';

// ─── ItemRow — item ou subitem dentro de uma lista ───────────────────────────

interface ItemRowProps {
  node: ListNode;
  depth: number;
  expanded: boolean;
  childrenLoaded: ListNode[] | null;
  loadingChildren: boolean;
  onToggleDone: (node: ListNode) => void;
  onDelete: (node: ListNode) => void;
  onExpand: (node: ListNode) => void;
  onAddSubitem: (node: ListNode) => void;
  busy: boolean;
}

function ItemRow({
  node, depth, expanded, childrenLoaded, loadingChildren,
  onToggleDone, onDelete, onExpand, onAddSubitem, busy,
}: ItemRowProps) {
  return (
    <View style={[styles.itemBlock, depth > 0 && styles.itemBlockNested]}>
      <View style={styles.itemRow}>
        <TouchableOpacity
          onPress={() => onToggleDone(node)}
          disabled={busy}
          style={styles.checkbox}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {busy ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <View style={[styles.checkboxBox, node.isDone && styles.checkboxBoxDone]}>
              {node.isDone && <Text style={styles.checkboxMark}>✓</Text>}
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemTitleWrap}
          onPress={() => (depth === 0 ? onExpand(node) : undefined)}
          activeOpacity={depth === 0 ? 0.6 : 1}
        >
          <Text style={[styles.itemTitle, node.isDone && styles.itemTitleDone]}>
            {node.title}
          </Text>
        </TouchableOpacity>

        {depth === 0 && (
          <TouchableOpacity
            onPress={() => onExpand(node)}
            style={styles.expandBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.expandBtnText}>{expanded ? '▾' : '▸'}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => onDelete(node)}
          style={styles.itemDeleteBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.itemDeleteBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Subitens expandidos (apenas depth 0 pode expandir, máx 2 níveis) */}
      {depth === 0 && expanded && (
        <View style={styles.subitemsBlock}>
          {loadingChildren ? (
            <ActivityIndicator size="small" color={colors.accent} style={styles.subitemsLoading} />
          ) : childrenLoaded && childrenLoaded.length > 0 ? (
            childrenLoaded.map((child) => (
              <ItemRow
                key={child.id}
                node={child}
                depth={1}
                expanded={false}
                childrenLoaded={null}
                loadingChildren={false}
                onToggleDone={onToggleDone}
                onDelete={onDelete}
                onExpand={() => undefined}
                onAddSubitem={() => undefined}
                busy={false}
              />
            ))
          ) : (
            <Text style={styles.noSubitems}>Sem subitens</Text>
          )}
          <TouchableOpacity style={styles.addSubitemBtn} onPress={() => onAddSubitem(node)}>
            <Text style={styles.addSubitemBtnText}>+ subitem</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── ListDetailView — itens dentro de uma lista selecionada ───────────────────

interface ListDetailViewProps {
  list: ListNode;
  onBack: () => void;
  onListChanged: () => void;
}

function ListDetailView({ list, onBack, onListChanged }: ListDetailViewProps) {
  const [items, setItems] = useState<ListNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [childrenCache, setChildrenCache] = useState<Record<string, ListNode[]>>({});
  const [loadingChildrenId, setLoadingChildrenId] = useState<string | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingSubitemTo, setAddingSubitemTo] = useState<ListNode | null>(null);
  const [subitemTitle, setSubitemTitle] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getListNodes(list.id);
      setItems(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar itens.');
    } finally {
      setLoading(false);
    }
  }, [list.id]);

  useEffect(() => { void load(); }, [load]);

  async function handleAddItem() {
    const title = newItemTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const created = await createListNode({ parentId: list.id, title, nodeType: 'ITEM' });
      setItems((prev) => [...prev, created]);
      setNewItemTitle('');
      onListChanged();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao criar item.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDone(node: ListNode) {
    setBusyId(node.id);
    try {
      const updated = await updateListNode(node.id, { isDone: !node.isDone });
      // Atualiza no nível correto (item ou subitem em cache)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      setChildrenCache((prev) => {
        const next = { ...prev };
        for (const parentId of Object.keys(next)) {
          next[parentId] = next[parentId]!.map((c) => (c.id === updated.id ? updated : c));
        }
        return next;
      });
      onListChanged();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao atualizar.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(node: ListNode) {
    Alert.alert(
      'Excluir item',
      node.children?.length || childrenCache[node.id]?.length
        ? `"${node.title}" e seus subitens serão removidos.`
        : `"${node.title}" será removido.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => void (async () => {
            try {
              await deleteListNode(node.id);
              setItems((prev) => prev.filter((i) => i.id !== node.id));
              setChildrenCache((prev) => {
                const next = { ...prev };
                delete next[node.id];
                for (const parentId of Object.keys(next)) {
                  next[parentId] = next[parentId]!.filter((c) => c.id !== node.id);
                }
                return next;
              });
              onListChanged();
            } catch (err) {
              Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao excluir.');
            }
          })(),
        },
      ],
    );
  }

  async function handleExpand(node: ListNode) {
    if (expandedId === node.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(node.id);
    if (!childrenCache[node.id]) {
      setLoadingChildrenId(node.id);
      try {
        const full = await getListNode(node.id);
        setChildrenCache((prev) => ({ ...prev, [node.id]: full.children ?? [] }));
      } catch {
        setChildrenCache((prev) => ({ ...prev, [node.id]: [] }));
      } finally {
        setLoadingChildrenId(null);
      }
    }
  }

  async function handleAddSubitemConfirm() {
    if (!addingSubitemTo) return;
    const title = subitemTitle.trim();
    if (!title) return;
    try {
      const created = await createListNode({
        parentId: addingSubitemTo.id,
        title,
        nodeType: 'ITEM',
      });
      setChildrenCache((prev) => ({
        ...prev,
        [addingSubitemTo.id]: [...(prev[addingSubitemTo.id] ?? []), created],
      }));
      setSubitemTitle('');
      setAddingSubitemTo(null);
      onListChanged();
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao criar subitem.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      {/* Header de detalhe */}
      <View style={styles.detailHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.detailTitle} numberOfLines={1}>{list.title}</Text>
      </View>

      {/* Conteúdo */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={styles.detailListContent}
          ListEmptyComponent={
            <Text style={styles.emptyHintSmall}>Nenhum item ainda. Adicione abaixo.</Text>
          }
          renderItem={({ item }) => (
            <ItemRow
              node={item}
              depth={0}
              expanded={expandedId === item.id}
              childrenLoaded={childrenCache[item.id] ?? null}
              loadingChildren={loadingChildrenId === item.id}
              onToggleDone={(n) => void handleToggleDone(n)}
              onDelete={(n) => void handleDelete(n)}
              onExpand={(n) => void handleExpand(n)}
              onAddSubitem={setAddingSubitemTo}
              busy={busyId === item.id}
            />
          )}
        />
      )}

      {/* Input de novo item */}
      <View style={styles.addItemRow}>
        <TextInput
          style={styles.addItemInput}
          value={newItemTitle}
          onChangeText={setNewItemTitle}
          placeholder="Novo item..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => void handleAddItem()}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addItemBtn, (!newItemTitle.trim() || saving) && styles.addItemBtnDisabled]}
          onPress={() => void handleAddItem()}
          disabled={!newItemTitle.trim() || saving}
        >
          {saving
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.addItemBtnText}>Adicionar</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Input inline de subitem */}
      {addingSubitemTo && (
        <View style={styles.subitemInputRow}>
          <Text style={styles.subitemInputLabel} numberOfLines={1}>
            Subitem de "{addingSubitemTo.title}"
          </Text>
          <View style={styles.addItemRow}>
            <TextInput
              style={styles.addItemInput}
              value={subitemTitle}
              onChangeText={setSubitemTitle}
              placeholder="Título do subitem..."
              placeholderTextColor={colors.textMuted}
              autoFocus
              onSubmitEditing={() => void handleAddSubitemConfirm()}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => void handleAddSubitemConfirm()}
              disabled={!subitemTitle.trim()}
            >
              <Text style={styles.addItemBtnText}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAddingSubitemTo(null); setSubitemTitle(''); }}>
              <Text style={styles.subitemCancelText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

// ─── ListsScreen ──────────────────────────────────────────────────────────────

export default function ListsScreen() {
  const [roots, setRoots] = useState<ListNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newListTitle, setNewListTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ListNode | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getListNodes(null);
      setRoots(data);
    } catch (err) {
      setError(err instanceof ApiError
        ? err.message
        : 'Não foi possível carregar as listas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleCreateList() {
    const title = newListTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const created = await createListNode({ title, nodeType: 'LIST', parentId: null });
      setRoots((prev) => [...prev, created]);
      setNewListTitle('');
    } catch (err) {
      Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao criar lista.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteRoot(node: ListNode) {
    Alert.alert(
      'Excluir lista',
      `"${node.title}" e todos os itens dentro dela serão removidos permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => void (async () => {
            setDeletingId(node.id);
            try {
              await deleteListNode(node.id);
              setRoots((prev) => prev.filter((r) => r.id !== node.id));
            } catch (err) {
              Alert.alert('Erro', err instanceof ApiError ? err.message : 'Erro ao excluir.');
            } finally {
              setDeletingId(null);
            }
          })(),
        },
      ],
    );
  }

  // ─── Detalhe de lista selecionada ────────────────────────────────────────

  if (selectedList) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <ListDetailView
          list={selectedList}
          onBack={() => setSelectedList(null)}
          onListChanged={() => void load(true)}
        />
      </SafeAreaView>
    );
  }

  // ─── Listagem de raízes ──────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Listas</Text>
        <Text style={styles.headerSub}>Tarefas, ideias e projetos</Text>
      </View>

      <View style={styles.newListRow}>
        <TextInput
          style={styles.newListInput}
          value={newListTitle}
          onChangeText={setNewListTitle}
          placeholder="Nova lista..."
          placeholderTextColor={colors.textMuted}
          onSubmitEditing={() => void handleCreateList()}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.newListBtn, (!newListTitle.trim() || creating) && styles.newListBtnDisabled]}
          onPress={() => void handleCreateList()}
          disabled={!newListTitle.trim() || creating}
        >
          {creating
            ? <ActivityIndicator size="small" color={colors.bg} />
            : <Text style={styles.newListBtnText}>Nova lista</Text>
          }
        </TouchableOpacity>
      </View>

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
          data={roots}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.accent} />
          }
          contentContainerStyle={[styles.listContent, roots.length === 0 && styles.listEmpty]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyTitle}>Nenhuma lista criada</Text>
              <Text style={styles.emptyHint}>
                Crie uma lista para capturar ideias, tarefas ou projetos.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.rootCard}>
              <TouchableOpacity style={styles.rootCardMain} onPress={() => setSelectedList(item)}>
                <Text style={styles.rootCardTitle}>{item.title}</Text>
                <Text style={styles.rootCardOpenHint}>Abrir ›</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleDeleteRoot(item)}
                disabled={deletingId === item.id}
                style={styles.rootDeleteBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {deletingId === item.id
                  ? <ActivityIndicator size="small" color={colors.error} />
                  : <Text style={styles.rootDeleteBtnText}>✕</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.bg },

  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: colors.textSecondary, marginTop: 2 },

  newListRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  newListInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  newListBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newListBtnDisabled: { opacity: 0.4 },
  newListBtnText: { color: colors.bg, fontWeight: '700', fontSize: 13 },

  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  listEmpty: { flex: 1 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 60 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  emptyHint: { fontSize: 14, color: colors.textSecondary },
  emptyHintSmall: { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingVertical: 24 },

  // Root card
  rootCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  rootCardMain: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rootCardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, flex: 1 },
  rootCardOpenHint: { fontSize: 13, color: colors.accent },
  rootDeleteBtn: { justifyContent: 'center', paddingHorizontal: 14, borderLeftWidth: 1, borderLeftColor: colors.border },
  rootDeleteBtnText: { fontSize: 14, color: colors.textMuted },

  // Detail header
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { paddingVertical: 4 },
  backBtnText: { color: colors.accent, fontSize: 15, fontWeight: '600' },
  detailTitle: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },

  detailListContent: { padding: 16, paddingBottom: 12, gap: 4 },

  // Item rows
  itemBlock: { gap: 4 },
  itemBlockNested: { marginLeft: 28, opacity: 0.9 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: { padding: 2 },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxDone: { backgroundColor: colors.success, borderColor: colors.success },
  checkboxMark: { color: colors.bg, fontSize: 13, fontWeight: '700' },
  itemTitleWrap: { flex: 1 },
  itemTitle: { fontSize: 15, color: colors.text },
  itemTitleDone: { textDecorationLine: 'line-through', color: colors.textMuted },
  expandBtn: { padding: 4 },
  expandBtnText: { fontSize: 14, color: colors.textSecondary },
  itemDeleteBtn: { padding: 4 },
  itemDeleteBtnText: { fontSize: 13, color: colors.textMuted },

  subitemsBlock: { paddingLeft: 4, paddingBottom: 8, gap: 4 },
  subitemsLoading: { marginVertical: 8 },
  noSubitems: { fontSize: 12, color: colors.textMuted, fontStyle: 'italic', paddingVertical: 6, marginLeft: 28 },
  addSubitemBtn: { marginLeft: 28, marginTop: 2 },
  addSubitemBtnText: { fontSize: 13, color: colors.accent },

  // Add item row
  addItemRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addItemInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addItemBtn: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemBtnDisabled: { opacity: 0.4 },
  addItemBtnText: { color: colors.bg, fontWeight: '700', fontSize: 13 },

  subitemInputRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
    backgroundColor: colors.accentDim,
  },
  subitemInputLabel: { fontSize: 12, color: colors.accent, paddingTop: 8 },
  subitemCancelText: { fontSize: 16, color: colors.textMuted, paddingHorizontal: 6 },

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
