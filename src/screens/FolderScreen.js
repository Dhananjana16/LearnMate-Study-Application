import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { getFiles, saveFiles, storeFile, removeFile } from '../storage';

export default function FolderScreen({ route, navigation }) {
  const { subject, folder } = route.params;
  const [files, setFiles] = useState([]);

  useFocusEffect(useCallback(() => { getFiles(subject.id, folder).then(setFiles); }, []));

  const upload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: false });
      if (res.canceled) return;
      const saved = await storeFile(subject.id, folder, res.assets[0]);
      const updated = [...files, saved];
      setFiles(updated);
      await saveFiles(subject.id, folder, updated);
    } catch (e) {
      Alert.alert('Upload failed', String(e.message || e));
    }
  };

  const del = (file) => {
    Alert.alert('Delete file', `Delete "${file.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          await removeFile(file);
          const updated = files.filter((f) => f.id !== file.id);
          setFiles(updated);
          await saveFiles(subject.id, folder, updated);
      } },
    ]);
  };

  return (
    <View style={s.container}>
      <TouchableOpacity style={s.upload} onPress={upload}><Text style={s.uploadText}>+ Upload PDF or image</Text></TouchableOpacity>
      <FlatList
        data={files}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={s.empty}>Nothing here yet.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate('Viewer', { file: item })} onLongPress={() => del(item)}>
            <Text style={s.text} numberOfLines={1}>{item.mimeType.startsWith('image') ? '🖼️' : '📕'} {item.name}</Text>
          </TouchableOpacity>
        )}
      />
      <Text style={s.hint}>Long-press a file to delete it.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  upload: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, marginBottom: 16, alignItems: 'center' },
  uploadText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginBottom: 10 },
  text: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 40, color: '#888' },
  hint: { textAlign: 'center', color: '#999', marginTop: 8 },
});
