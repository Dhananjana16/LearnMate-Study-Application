import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FOLDERS } from '../storage';

export default function SubjectScreen({ route, navigation }) {
  const { subject } = route.params;
  return (
    <View style={s.container}>
      {FOLDERS.map((folder) => (
        <TouchableOpacity key={folder} style={s.card} onPress={() => navigation.navigate('Folder', { subject, folder })}>
          <Text style={s.text}>{folder === 'Notes' ? '📝' : '📄'} {folder}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 8, marginBottom: 12 },
  text: { fontSize: 20 },
});
