import React, { useCallback, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { getFiles, saveFiles, storeFile, removeFile } from '../storage';
import { getModelPapers, addModelPaper, deleteModelPaper } from '../paperStore';
import { getApiKey } from '../aiKeyStore';
import { generatePaperQuestions } from '../ai';
import { tidyText } from '../textUtil';
import PaperPicker from '../PaperPicker';
import TextExtractor from '../TextExtractor';
import { colors, shadow } from '../theme';
import { mascots } from '../images';

const isPdf = (f) => !f.mimeType.startsWith('image');

export default function FolderScreen({ route, navigation }) {
  const { subject, folder } = route.params;
  const isPapers = folder === 'Past Papers';
  const [files, setFiles] = useState([]);
  const [models, setModels] = useState([]);

  // model paper maker
  const [setup, setSetup] = useState(null); // { papers, notes }
  const [extractFiles, setExtractFiles] = useState(null);
  const [generating, setGenerating] = useState(false);
  const paperCount = useRef(0);

  useFocusEffect(
    useCallback(() => {
      getFiles(subject.id, folder).then(setFiles);
      if (isPapers) getModelPapers(subject.id).then(setModels);
    }, [])
  );

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

  const delModel = (paper) => {
    Alert.alert('Delete model paper', `Delete "${paper.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => setModels(await deleteModelPaper(subject.id, paper.id)) },
    ]);
  };

  // ----- make a model paper from the past papers + the subject's notes -----
  const startModel = async () => {
    if (generating) return;
    if (!(await getApiKey())) {
      Alert.alert('AI key needed', 'Add your AI key in Settings first.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => navigation.navigate('Settings') },
      ]);
      return;
    }
    const papers = files.filter(isPdf);
    const notes = [...(await getFiles(subject.id, 'Notes')), ...(await getFiles(subject.id, 'Quick Notes'))].filter(isPdf);
    if (!papers.length) {
      Alert.alert('No past papers yet', 'Upload a past paper (PDF) into this folder first.');
      return;
    }
    if (!notes.length) {
      Alert.alert('No notes yet', 'Upload your notes (PDF) into the Notes or Quick Notes folder of this subject first.');
      return;
    }
    setSetup({ papers, notes });
  };

  const onSetupConfirm = ({ papers, notes }) => {
    setSetup(null);
    const noteLimit = Math.min(9000, Math.max(2500, Math.floor(24000 / notes.length)));
    paperCount.current = papers.length;
    setGenerating(true);
    setExtractFiles([
      ...papers.map((f) => ({ ...f, limit: 9000 })),
      ...notes.map((f) => ({ ...f, limit: noteLimit })),
    ]);
  };

  const fail = (title, message) => {
    setExtractFiles(null);
    setGenerating(false);
    Alert.alert(title, message);
  };

  const onExtracted = async (results) => {
    setExtractFiles(null);
    const n = paperCount.current;
    const papers = results
      .slice(0, n)
      .map((r) => ({ name: r.name, text: tidyText(r.text) }))
      .filter((r) => r.text.length > 80);
    const notes = results
      .slice(n)
      .map((r) => ({ name: r.name, text: tidyText(r.text) }))
      .filter((r) => r.text.length > 80);
    if (!papers.length) {
      fail('Could not read the past papers', 'They have very little readable text. Scanned pages cannot be used yet.');
      return;
    }
    const notesText = notes.map((r) => `--- ${r.name} ---\n${r.text}`).join('\n\n');
    if (notesText.length < 300) {
      fail('Not enough notes text', 'The notes have very little readable text. Scanned pages cannot be used yet.');
      return;
    }
    try {
      const key = await getApiKey();
      const set = await generatePaperQuestions(notesText, papers, key);
      const paper = await addModelPaper(subject.id, set.questions);
      setModels(await getModelPapers(subject.id));
      setGenerating(false);
      navigation.navigate('PaperQuestions', { subject, paperId: paper.id });
    } catch (e) {
      fail('Could not make the paper', String(e.message || e));
    }
  };

  const header = isPapers ? (
    <View>
      <TouchableOpacity style={[s.model, shadow]} onPress={startModel} activeOpacity={0.85}>
        <View style={s.modelIcon}>
          <Ionicons name="sparkles" size={24} color="#6B52D6" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.modelTitle}>Make a model paper</Text>
          <Text style={s.modelSub}>New questions about your notes, in the style of your past papers</Text>
        </View>
      </TouchableOpacity>
      {models.length > 0 && (
        <View>
          <Text style={s.heading}>Model papers</Text>
          {models.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[s.card, shadow]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('PaperQuestions', { subject, paperId: m.id })}
              onLongPress={() => delModel(m)}
            >
              <View style={[s.icon, { backgroundColor: '#E9E4FB' }]}>
                <Ionicons name="document-text" size={24} color="#6B52D6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{m.title}</Text>
                <Text style={s.type}>{m.questions.length} questions · {new Date(m.createdAt).toLocaleDateString()}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.sub} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      {files.length > 0 && <Text style={s.heading}>Uploaded past papers</Text>}
    </View>
  ) : null;

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
        ListHeaderComponent={header}
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
              onPress={() => navigation.navigate('Viewer', { file: item, subject })}
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

      <PaperPicker
        visible={!!setup}
        papers={setup ? setup.papers : []}
        notes={setup ? setup.notes : []}
        onClose={() => setSetup(null)}
        onConfirm={onSetupConfirm}
      />
      {extractFiles && (
        <TextExtractor
          files={extractFiles}
          onDone={onExtracted}
          onError={(msg) => fail('Could not read the files', msg)}
        />
      )}
      {generating && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={s.overlayText}>Reading your notes and past papers, then writing the model paper...</Text>
          <Text style={s.overlaySub}>This can take up to a minute.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  upload: { backgroundColor: colors.primary, padding: 15, borderRadius: 16, marginBottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  uploadText: { color: '#fff', fontWeight: '800', fontSize: 16, marginLeft: 8 },
  model: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1EDFF', borderRadius: 20, padding: 14, marginBottom: 6 },
  modelIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  modelTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  modelSub: { color: colors.sub, marginTop: 2, fontSize: 12, lineHeight: 17 },
  heading: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 18, marginBottom: 10 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 18, padding: 14, marginBottom: 12 },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  type: { color: colors.sub, marginTop: 2, fontSize: 12 },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyImg: { width: 150, height: 150, borderRadius: 36 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 18 },
  emptyText: { color: colors.sub, marginTop: 6 },
  hint: { textAlign: 'center', color: colors.sub, fontSize: 12, marginTop: 4 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(31,35,64,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  overlayText: { color: '#fff', fontSize: 17, fontWeight: '800', marginTop: 16, textAlign: 'center' },
  overlaySub: { color: '#C9CCE3', marginTop: 6, textAlign: 'center' },
});
