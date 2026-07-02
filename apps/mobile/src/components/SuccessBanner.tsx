/**
 * SuccessBanner — feedback de sucesso flutuante do LoopOS.
 *
 * Toast discreto no topo da tela: desliza para baixo com fade, some sozinho
 * após alguns segundos ou ao toque. Não bloqueia o fluxo.
 *
 * Uso (controlado pela tela):
 *   const [msg, setMsg] = useState<string | null>(null);
 *   ...
 *   <SuccessBanner message={msg} onHide={() => setMsg(null)} />
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from './ui.js';

const SHOW_MS = 2800;

interface SuccessBannerProps {
  message: string | null;
  onHide: () => void;
}

export function SuccessBanner({ message, onHide }: SuccessBannerProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    translateY.setValue(-12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 220,
        friction: 20,
      }),
    ]).start();

    hideTimer.current = setTimeout(dismiss, SHOW_MS);
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  function dismiss() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -8, duration: 160, useNativeDriver: true }),
    ]).start(() => onHide());
  }

  if (!message) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        { top: insets.top + 8, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable onPress={dismiss} style={styles.banner}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 420,
    backgroundColor: 'rgba(20, 20, 20, 0.96)',
    borderWidth: 1,
    borderColor: colors.borderGlass,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  text: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: '600',
    flexShrink: 1,
  },
});
