/**
 * Navegação principal do LoopOS Mobile.
 *
 * Bottom tab com 5 abas: Hoje, Corpo, Ritmo, Leitura, Listas.
 * A aba inicial é sempre Hoje.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import TodayScreen from '../screens/today/TodayScreen.js';
import BodyScreen from '../screens/body/BodyScreen.js';
import RhythmScreen from '../screens/rhythm/RhythmScreen.js';
import ReadingScreen from '../screens/reading/ReadingScreen.js';
import ListsScreen from '../screens/lists/ListsScreen.js';
import { colors } from '../components/ui.js';

const Tab = createBottomTabNavigator();

// Ícones de texto simples — sem biblioteca de icons para manter deps mínimas
const TAB_ICONS: Record<string, string> = {
  Hoje: '◎',
  Corpo: '▲',
  Ritmo: '⟳',
  Leitura: '▣',
  Listas: '≡',
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 18,
        color: focused ? colors.accent : colors.textMuted,
      }}
    >
      {TAB_ICONS[name] ?? '•'}
    </Text>
  );
}

export default function Navigation() {
  return (
    <Tab.Navigator
      initialRouteName="Hoje"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      })}
    >
      <Tab.Screen name="Hoje" component={TodayScreen} />
      <Tab.Screen name="Corpo" component={BodyScreen} />
      <Tab.Screen name="Ritmo" component={RhythmScreen} />
      <Tab.Screen name="Leitura" component={ReadingScreen} />
      <Tab.Screen name="Listas" component={ListsScreen} />
    </Tab.Navigator>
  );
}
