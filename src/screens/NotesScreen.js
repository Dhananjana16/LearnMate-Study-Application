import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getNotes } from '../notesStore';
import { colors, shadow } from '../theme';

export default function NotesScreen({ route, navigation }) {
  const { file, isPdf, currentPage } = route.params;
  const [notes, setNotes] = useState([]);

  useFocusEffect(
    useCallback(() => {
      getNotes(file.id).then((list) => {
        setNotes([...list].sort((a, b) => a.page - b.page || a.createdAt - b.createdAt));
      });
    }, [file.id])
  );

  return (
    <View style={s.container}>
      <TouchableOpacity
        style={s.add}
        onPress={() => navigation.navigate('NoteEditor', { file, isPdf, page: currentPage })}
      >
        <Text style={s.addText}>+ Add note</Text>
      </TouchableOpacity>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        ListEmptyComponent={
          <Text style={s.empty}>
            No notes yet.{isPdf ? '\nTip: you can also long-press a page in the PDF to place a note.' : ''}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('NoteEditor', { file, isPdf, noteId: item.id })}>
            <Text style={s.page}>{isPdf ? `📝 Page ${item.page}` : '📝 Note'}</Text>
            <Text style={s.text} numberOfLines={3}>{item.text}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.bg },
  add: { backgroundColor: colors.primary, padding: 14, borderRadius: 14, marginBottom: 16, alignItems: 'center' },
  addText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { ...shadow, backgroundColor: '#FDE68A', padding: 14, borderRadius: 14, marginBottom: 10 },
  page: { fontWeight: 'bold', marginBottom: 4 },
  text: { fontSize: 15 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
});
