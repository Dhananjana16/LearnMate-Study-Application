import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSubjects, saveSubjects } from '../storage';

export default function HomeScreen({ navigation }) {
  const [subjects, setSubjects] = useState([]);
  const [name, setName] = useState('');

  useFocusEffect(useCallback(() => { getSubjects().then(setSubjects); }, []));

  const addSubject = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const updated = [...subjects, { id: Date.now().toString(), name: trimmed }];
    setSubjects(updated);
    await saveSubjects(updated);
    setName('');
  };

  const deleteSubject = (subject) => {
    Alert.alert('Delete subject', `Delete "${subject.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          const updated = subjects.filter((s) => s.id !== subject.id);
          setSubjects(updated);
          await saveSubjects(updated);
      } },
    ]);
  };

  return (
    <View style={s.container}>
      <View style={s.row}>
        <TextInput style={s.input} placeholder="New subject name" value={name} onChangeText={setName} />
        <TouchableOpacity style={s.add} onPress={addSubject}><Text style={s.addText}>Add</Text></TouchableOpacity>
      </View>
      <FlatList
        data={subjects}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={s.empty}>No subjects yet. Add one above.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Subject', { subject: item })} onLongPress={() => deleteSubject(item)}>
            <Text style={s.cardText}>📁 {item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={s.hint}>Long-press a subject to delete it.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  row: { flexDirection: 'row', marginBottom: 16 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#ddd' },
  add: { backgroundColor: '#4f46e5', borderRadius: 8, marginLeft: 8, paddingHorizontal: 18, justifyContent: 'center' },
  addText: { color: '#fff', fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 10 },
  cardText: { fontSize: 18 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  hint: { textAlign: 'center', color: '#999', marginTop: 8 },
});
