/**
 * LoopOS Mobile — Root Component
 *
 * Monta NavigationContainer + SafeAreaProvider + Bottom Tabs.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Navigation from './navigation/Navigation.js';
import { colors } from './components/ui.js';

export function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer
        theme={{
          dark: true,
          colors: {
            primary: colors.accent,
            background: colors.bg,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            notification: colors.accent,
          },
        }}
      >
        <Navigation />
        <StatusBar style="light" />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
