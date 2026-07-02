/**
 * Componentes base reutilizáveis do LoopOS Mobile.
 *
 * Screen, Card, SectionTitle, EmptyState, LoadingState, ErrorState.
 * Design: fundo escuro #0a0a0a, cards #141414, texto branco.
 */

import React, { useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Animated,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

// ─── Tokens ──────────────────────────────────────────────────────────────────

export const colors = {
  bg: '#0a0a0a',
  surface: '#141414',
  border: '#222222',
  // Glassmorphism: superfícies translúcidas sobre o fundo escuro,
  // com hairline claro de baixa opacidade fazendo o papel de "borda de vidro".
  surfaceGlass: 'rgba(255, 255, 255, 0.055)',
  borderGlass: 'rgba(255, 255, 255, 0.10)',
  tabBarGlass: 'rgba(10, 10, 10, 0.55)',
  accentGlass: 'rgba(167, 139, 250, 0.14)',
  accentGlassBorder: 'rgba(167, 139, 250, 0.18)',
  text: '#ffffff',
  textSecondary: '#888888',
  textMuted: '#444444',
  accent: '#a78bfa', // violeta suave
  accentDim: '#1e1b2e',
  error: '#f87171',
  success: '#4ade80',
} as const;

// ─── Screen ──────────────────────────────────────────────────────────────────

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Screen({ children, style }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── FadeOnFocus ──────────────────────────────────────────────────────────────

interface FadeOnFocusProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Transição suave de entrada quando a tela ganha foco na navegação:
 * leve fade + deslize vertical. Evita a troca "seca" entre abas.
 */
export function FadeOnFocus({ children, style }: FadeOnFocusProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useFocusEffect(
    useCallback(() => {
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }, [opacity, translateY]),
  );

  return (
    <Animated.View style={[{ flex: 1, opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

interface SectionTitleProps {
  label: string;
  count?: number;
  style?: TextStyle;
}

export function SectionTitle({ label, count, style }: SectionTitleProps) {
  return (
    <View style={styles.sectionRow}>
      <Text style={[styles.sectionTitle, style]}>{label.toUpperCase()}</Text>
      {count !== undefined && (
        <Text style={styles.sectionCount}>{count}</Text>
      )}
    </View>
  );
}

// ─── LoadingState ─────────────────────────────────────────────────────────────

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.stateText}>Carregando...</Text>
    </View>
  );
}

// ─── ErrorState ───────────────────────────────────────────────────────────────

interface ErrorStateProps {
  message: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, hint, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.errorIcon}>⚠</Text>
      <Text style={styles.errorText}>{message}</Text>
      {hint && <Text style={styles.stateHint}>{hint}</Text>}
      {onRetry && (
        <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  message: string;
  hint?: string;
}

export function EmptyState({ message, hint }: EmptyStateProps) {
  return (
    <View style={styles.emptyRow}>
      <Text style={styles.emptyText}>{message}</Text>
      {hint && <Text style={styles.stateHint}>{hint}</Text>}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    // Tab bar flutuante (position absolute) — o conteúdo rola por baixo dela,
    // então precisa de respiro extra no fim.
    paddingBottom: 100,
    gap: 16,
  },
  card: {
    backgroundColor: colors.surfaceGlass,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.textSecondary,
  },
  sectionCount: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accent,
    backgroundColor: colors.accentDim,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  stateHint: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 32,
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
  emptyRow: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
