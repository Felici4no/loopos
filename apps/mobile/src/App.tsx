/**
 * LoopOS Mobile — Root Component
 *
 * Navigation and module wiring will be added in Etapa 2.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>LoopOS</Text>
      <Text style={styles.subtitle}>Sua rotina, no seu ritmo.</Text>
      <StatusBar style="light" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 8,
  },
});
