/**
 * Tab bar customizada do LoopOS — pill flutuante com glassmorphism.
 *
 * - Container arredondado com margens, descolado das bordas da tela.
 * - Indicador da aba ativa desliza entre os itens (Animated nativo, spring).
 * - Só ícones (Ionicons), sem labels: ativo usa a variante preenchida,
 *   inativo a outline — semântica clara sem texto.
 */

import React, { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors } from './ui.js';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Par ativo/inativo por aba: preenchido quando focado, outline quando não.
const TAB_ICONS: Record<string, { active: IoniconName; inactive: IoniconName }> = {
  Hoje: { active: 'home', inactive: 'home-outline' },
  Corpo: { active: 'barbell', inactive: 'barbell-outline' },
  Ritmo: { active: 'pulse', inactive: 'pulse-outline' },
  Leitura: { active: 'book', inactive: 'book-outline' },
  Listas: { active: 'list', inactive: 'list-outline' },
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
    <View style={[styles.wrap, { bottom: Math.max(insets.bottom, 10) + 6 }]}>
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
              const icons = TAB_ICONS[route.name] ?? {
                active: 'ellipse' as IoniconName,
                inactive: 'ellipse-outline' as IoniconName,
              };
              const scale = position.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [1, 1.12, 1],
                extrapolate: 'clamp',
              });
              const opacity = position.interpolate({
                inputRange: [i - 1, i, i + 1],
                outputRange: [0.45, 1, 0.45],
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
                  accessibilityLabel={route.name}
                  accessibilityState={{ selected: focused }}
                >
                  <Animated.View style={{ opacity, transform: [{ scale }] }}>
                    <Ionicons
                      name={focused ? icons.active : icons.inactive}
                      size={23}
                      color={focused ? colors.accent : colors.textSecondary}
                    />
                  </Animated.View>
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
    paddingVertical: 13,
  },
});
