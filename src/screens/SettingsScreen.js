import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTotalSeconds, formatTime } from '../timeStore';
import VoicePicker from '../VoicePicker';
import { getVoice, saveVoice } from '../ttsStore';

export default function SettingsScreen() {
  const [total, setTotal] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(null);

  useEffect(() => {
    getVoice().then(setVoiceId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTotalSeconds().then(setTotal);
    }, [])
  );

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={s.label}>Total study time</Text>
        <Text style={s.value}>{formatTime(total)}</Text>
      </View>
      <TouchableOpacity style={s.row} onPress={() => setPickerOpen(true)}>
        <Text style={s.rowText}>🗣 Reading voice</Text>
        <Text style={s.rowSub}>{voiceId ? voiceId : 'Phone default'}</Text>
      </TouchableOpacity>
      <VoicePicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={voiceId}
        onPick={(id) => {
          setVoiceId(id);
          saveVoice(id);
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 8, alignItems: 'center' },
  row: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginTop: 12 },
  rowText: { fontSize: 16, fontWeight: 'bold' },
  rowSub: { color: '#888', marginTop: 2 },
  label: { fontSize: 16, color: '#666' },
  value: { fontSize: 36, fontWeight: 'bold', color: '#4f46e5', marginTop: 8 },
});
