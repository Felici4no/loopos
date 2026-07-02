/**
 * Navegação principal do LoopOS Mobile.
 *
 * Bottom tab com 5 abas: Hoje, Corpo, Ritmo, Leitura, Listas.
 * A aba inicial é sempre Hoje.
 *
 * - Tab bar customizada (FloatingTabBar): pill flutuante com glassmorphism
 *   e indicador animado que desliza entre as abas.
 * - FadeOnFocus: cada tela entra com leve fade+slide ao ganhar foco.
 */

import React from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import TodayScreen from '../screens/today/TodayScreen.js';
import BodyScreen from '../screens/body/BodyScreen.js';
import RhythmScreen from '../screens/rhythm/RhythmScreen.js';
import ReadingScreen from '../screens/reading/ReadingScreen.js';
import ListsScreen from '../screens/lists/ListsScreen.js';
import FloatingTabBar from '../components/FloatingTabBar.js';
import { FadeOnFocus } from '../components/ui.js';

const Tab = createBottomTabNavigator();

function withFadeOnFocus(Screen: React.ComponentType) {
  function FadedScreen() {
    return (
      <FadeOnFocus>
        <Screen />
      </FadeOnFocus>
    );
  }
  FadedScreen.displayName = `FadeOnFocus(${Screen.displayName ?? Screen.name})`;
  return FadedScreen;
}

// Referências estáveis (módulo) — recriar por render remontaria as telas.
const TodayTab = withFadeOnFocus(TodayScreen);
const BodyTab = withFadeOnFocus(BodyScreen);
const RhythmTab = withFadeOnFocus(RhythmScreen);
const ReadingTab = withFadeOnFocus(ReadingScreen);
const ListsTab = withFadeOnFocus(ListsScreen);

function renderTabBar(props: BottomTabBarProps) {
  return <FloatingTabBar {...props} />;
}

export default function Navigation() {
  return (
    <Tab.Navigator
      initialRouteName="Hoje"
      tabBar={renderTabBar}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Hoje" component={TodayTab} />
      <Tab.Screen name="Corpo" component={BodyTab} />
      <Tab.Screen name="Ritmo" component={RhythmTab} />
      <Tab.Screen name="Leitura" component={ReadingTab} />
      <Tab.Screen name="Listas" component={ListsTab} />
    </Tab.Navigator>
  );
}
