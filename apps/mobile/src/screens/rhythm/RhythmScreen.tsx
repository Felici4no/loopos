import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../components/ui.js';

export default function RhythmScreen() {
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔁</Text>
        <Text style={styles.title}>Ritmo</Text>
        <Text style={styles.description}>Trackers de hábitos e frequências diárias.</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CRUD será implementado na próxima etapa</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  icon: { fontSize: 48 },
  title: { fontSize: 28, fontWeight: '700', color: colors.text, letterSpacing: -0.5 },
  description: { fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  badge: {
    marginTop: 8,
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  badgeText: { fontSize: 12, color: colors.accent, fontWeight: '600', letterSpacing: 0.3 },
});
