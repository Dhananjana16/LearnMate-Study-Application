import React, { useEffect, useState } from 'react';
import * as Speech from 'expo-speech';
import { ScrollView, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { getVoice } from '../ttsStore';
import { cleanForSpeech, speakOptions } from '../speechText';
import { getNotes, upsertNote, deleteNote, defaultPosition } from '../notesStore';

export default function NoteEditorScreen({ route, navigation }) {
  const { file, isPdf, noteId, page, x, y } = route.params;
  const [text, setText] = useState('');
  const [pageText, setPageText] = useState(String(page || 1));
  const [existing, setExisting] = useState(null);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => () => Speech.stop(), []);

  const toggleSpeak = () => {
    if (speaking) {
      Speech.stop();
      setSpeaking(false);
      return;
    }
    if (!text.trim()) return;
    setSpeaking(true);
    getVoice().then((voice) => Speech.speak(cleanForSpeech(text), { ...speakOptions(text, voice, 0.9), onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false), onError: () => setSpeaking(false) }));
  };

  useEffect(() => {
    if (!noteId) return;
    getNotes(file.id).then((list) => {
      const n = list.find((item) => item.id === noteId);
      if (n) {
        setExisting(n);
        setText(n.text);
        setPageText(String(n.page));
      }
    });
  }, [noteId, file.id]);

  const save = async () => {
    if (!text.trim()) {
      Alert.alert('Empty note', 'Type something before saving.');
      return;
    }
    const pageNum = isPdf ? Math.max(1, parseInt(pageText, 10) || 1) : 1;
    const list = await getNotes(file.id);
    let px = x;
    let py = y;
    if (existing) {
      px = existing.page === pageNum ? existing.x : undefined;
      py = existing.page === pageNum ? existing.y : undefined;
    }
    if (px === undefined || py === undefined) {
      const pos = defaultPosition(list, pageNum);
      px = pos.x;
      py = pos.y;
    }
    await upsertNote(file.id, {
      id: existing ? existing.id : Date.now().toString(),
      page: pageNum,
      x: px,
      y: py,
      text: text.trim(),
      createdAt: existing ? existing.createdAt : Date.now(),
    });
    navigation.goBack();
  };

  const remove = () => {
    Alert.alert('Delete note', 'Delete this note?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(file.id, existing.id);
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      {isPdf && (
        <>
          <Text style={s.label}>Page number</Text>
          <TextInput style={s.pageInput} keyboardType="number-pad" value={pageText} onChangeText={setPageText} />
        </>
      )}
      <Text style={s.label}>Note</Text>
      <TextInput
        style={s.input}
        multiline
        placeholder="Type your note here..."
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
        autoFocus={!noteId}
      />
      <TouchableOpacity style={s.listen} onPress={toggleSpeak}>
        <Text style={s.listenText}>{speaking ? '⏹ Stop' : '🔊 Listen to this note'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.save} onPress={save}>
        <Text style={s.saveText}>Save</Text>
      </TouchableOpacity>
      {existing && (
        <TouchableOpacity style={s.delete} onPress={remove}>
          <Text style={s.deleteText}>Delete note</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbea' },
  label: { fontWeight: 'bold', marginBottom: 6, marginTop: 8 },
  pageInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, width: 100, fontSize: 16 },
  input: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', padding: 10, minHeight: 220, fontSize: 16 },
  listen: { padding: 12, borderRadius: 8, marginTop: 12, alignItems: 'center', backgroundColor: '#e0e7ff' },
  listenText: { color: '#4338ca', fontWeight: 'bold' },
  save: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, marginTop: 16, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  delete: { padding: 14, borderRadius: 8, marginTop: 10, alignItems: 'center', borderWidth: 1, borderColor: '#dc2626' },
  deleteText: { color: '#dc2626', fontWeight: 'bold' },
});
