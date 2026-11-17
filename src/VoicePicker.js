import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Speech from 'expo-speech';

const SAMPLE = 'This is how Learn Mate will read your notes to you.';

export default function VoicePicker({ visible, onClose, selected, onPick }) {
  const [voices, setVoices] = useState(null);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    setVoices(null);
    Speech.getAvailableVoicesAsync()
      .then((list) => {
        if (!alive) return;
        const rank = (v) => (v.language && v.language.startsWith('en') ? 0 : 1);
        const enhanced = (v) => (v.quality === Speech.VoiceQuality.Enhanced ? 0 : 1);
        setVoices(
          [...list].sort(
            (a, b) => rank(a) - rank(b) || enhanced(a) - enhanced(b) || a.name.localeCompare(b.name)
          )
        );
      })
      .catch(() => alive && setVoices([]));
    return () => {
      alive = false;
      Speech.stop();
    };
  }, [visible]);

  const choose = (id) => {
    onPick(id);
    Speech.stop();
    Speech.speak(SAMPLE, id ? { voice: id } : {});
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        <Text style={s.title}>Reading voice</Text>
        <Text style={s.hint}>
          Tap a voice to hear it. ⭐ Enhanced voices usually sound clearer. You can install more voices in your
          phone's text-to-speech settings.
        </Text>
        <TouchableOpacity style={[s.row, !selected && s.rowOn]} onPress={() => choose(null)}>
          <Text style={s.name}>Phone default voice</Text>
        </TouchableOpacity>
        {voices === null ? (
          <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#4f46e5" />
        ) : (
          <FlatList
            data={voices}
            keyExtractor={(v) => v.identifier}
            ListEmptyComponent={<Text style={s.hint}>No other voices found on this phone.</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity style={[s.row, selected === item.identifier && s.rowOn]} onPress={() => choose(item.identifier)}>
                <Text style={s.name}>
                  {item.quality === Speech.VoiceQuality.Enhanced ? '⭐ ' : ''}
                  {item.name}
                </Text>
                <Text style={s.lang}>{item.language}</Text>
              </TouchableOpacity>
            )}
          />
        )}
        <TouchableOpacity style={s.done} onPress={onClose}>
          <Text style={s.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16, paddingTop: 40 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  hint: { color: '#666', marginBottom: 12 },
  row: { backgroundColor: '#fff', padding: 14, borderRadius: 8, marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  rowOn: { borderColor: '#4f46e5' },
  name: { fontSize: 16 },
  lang: { color: '#888', marginTop: 2 },
  done: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  doneText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
