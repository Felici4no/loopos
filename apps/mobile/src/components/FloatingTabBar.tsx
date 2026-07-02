/**
 * Tab bar customizada do LoopOS — pill flutuante com glassmorphism.
 *
 * - Container arredondado com margens, descolado das bordas da tela.
 * - Indicador da aba ativa desliza entre os itens (Animated nativo, spring).
 * - Ícone/label ativos ganham escala e opacidade interpoladas da mesma
 *   animação do indicador — a seleção "viaja" junto.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from './ui.js';

// Ícones de texto simples — sem biblioteca de icons para manter deps mínimas
const TAB_ICONS: Record<string, string> = {
  Hoje: '◎',
  Corpo: '▲',
  Ritmo: '⟳',
  Leitura: '▣',
  Listas: '≡',
};

const BAR_PADDING = 6;

export default function FloatingTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const [rowWidth, setRowWidth] = useState(0);
  const itemWidth = rowWidth > 0 ? rowWidth / state.routes.length : 0;

  // Índice da aba ativa como valor animado — dirige o indicador e os itens.
  const position = useRef(new Animated.Value(state.index)).current;

  useEffect(() => {
    Animated.spring(position, {
      toValue: state.index,
      useNativeDriver: true,
      tension: 190,
      friction: 22,
    }).start();
  }, [state.index, position]);

  return (
    <View
      style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}
    >
      <View style={styles.bar}>
        <View style={styles.clip}>
          <BlurView
            tint="dark"
            intensity={40}
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          >
            <View style={{ flex: 1, backgroundColor: colors.tabBarGlass }} />
          </BlurView>
          <View
            style={styles.row}
            onLayout={(e) =>
              setRowWidth(e.nativeEvent.layout.width - BAR_PADDING * 2)
            }
          >
            {itemWidth > 0 && (
              <Animated.View
                style={[
                  styles.indicator,
                  {
                    width: itemWidth,
                    transform: [
                      { translateX: Animated.multiply(position, itemWidth) },
                    ],
                  },
                ]}
              />
            )}
            {state.routes.map((route, i) => {
              const focused = state.index === i;
              const scale = position.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [1, 1.15, 1],
                extrapolate: 'clamp',
              });
              const opacity = position.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0.5, 1, 0.5],
                extrapolate: 'clamp',
              });

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              return (
                <Pressable
                  key={route.key}
                  onPress={onPress}
                  style={styles.item}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                >
                  <Animated.Text
                    allowFontScaling={false}
                    style={[
                      styles.icon,
                      {
                        opacity,
                        transform: [{ scale }],
                        color: focused ? colors.accent : colors.textSecondary,
                      },
                    ]}
                  >
                    {TAB_ICONS[route.name] ?? '•'}
                  </Animated.Text>
                  <Animated.Text
                    allowFontScaling={false}
                    style={[
                      styles.label,
                      {
                        opacity,
                        color: focused ? colors.accent : colors.textSecondary,
                      },
                    ]}
                  >
                    {route.name}
                  </Animated.Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    // Toques fora da pill passam para o conteúdo atrás
    pointerEvents: 'box-none',
  },
  bar: {
    marginHorizontal: 16,
    borderRadius: 28,
    // Sombra sutil para descolar a barra do fundo
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  clip: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderGlass,
  },
  row: {
    flexDirection: 'row',
    padding: BAR_PADDING,
  },
  indicator: {
    position: 'absolute',
    top: BAR_PADDING,
    bottom: BAR_PADDING,
    left: BAR_PADDING,
    borderRadius: 22,
    backgroundColor: colors.accentGlass,
    borderWidth: 1,
    borderColor: colors.accentGlassBorder,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    gap: 3,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
