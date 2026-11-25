import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { Blobs } from '../Decor';

export default function ProfileScreen() {
  return (
    <View style={s.container}>
      <Blobs />
      <Text style={s.title}>Profile</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 30, fontWeight: '800', color: colors.text },
});
