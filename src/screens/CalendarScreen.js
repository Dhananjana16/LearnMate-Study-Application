import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function CalendarScreen() {
  return (
    <View style={s.container}>
      <Text style={s.title}>Calendar</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
});
