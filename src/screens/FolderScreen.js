import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { getFiles, saveFiles, storeFile, removeFile } from '../storage';
import { colors, shadow } from '../theme';
import { mascots } from '../images';

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
      <TouchableOpacity style={s.upload} onPress={upload} activeOpacity={0.85}>
        <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
        <Text style={s.uploadText}>Upload PDF or image</Text>
      </TouchableOpacity>
      <FlatList
        data={files}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Image source={mascots.laptop} style={s.emptyImg} />
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyText}>Upload your first file to start studying.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isImage = item.mimeType.startsWith('image');
          return (
            <TouchableOpacity
              style={[s.card, shadow]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Viewer', { file: item })}
              onLongPress={() => del(item)}
            >
              <View style={[s.icon, { backgroundColor: isImage ? '#DDF5E8' : '#FFE3EA' }]}>
                <Ionicons name={isImage ? 'image' : 'document-text'} size={24} color={isImage ? '#1E9E63' : '#D6456B'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name} numberOfLines={1}>{item.name}</Text>
                <Text style={s.type}>{isImage ? 'Image' : 'PDF'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.sub} />
            </TouchableOpacity>
          );
        }}
      />
      {files.length > 0 && <Text style={s.hint}>Long-press a file to delete it.</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  upload: { backgroundColor: colors.primary, padding: 15, borderRadius: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  type: { color: colors.sub, marginTop: 2, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyImg: { width: 150, height: 150, borderRadius: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 18 },
  emptyText: { color: colors.sub, marginTop: 6 },
  hint: { textAlign: 'center', color: colors.sub, fontSize: 12, marginTop: 4 },
});
