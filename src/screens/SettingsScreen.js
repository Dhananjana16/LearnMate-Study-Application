import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTotalSeconds, formatTime } from '../timeStore';
import VoicePicker from '../VoicePicker';
import { getVoice, saveVoice } from '../ttsStore';
import { getApiKey, saveApiKey } from '../aiKeyStore';

export default function SettingsScreen() {
  const [total, setTotal] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [voiceId, setVoiceId] = useState(null);
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    getVoice().then(setVoiceId);
    getApiKey().then(setSavedKey);
  }, []);

  useFocusEffect(
    useCallback(() => {
      getTotalSeconds().then(setTotal);
    }, [])
  );

  const saveKey = async () => {
    if (!keyInput.trim()) return;
    await saveApiKey(keyInput);
    setSavedKey(keyInput.trim());
    setKeyInput('');
    Alert.alert('Saved', 'Your AI key is saved on this phone.');
  };
  const removeKey = async () => {
    await saveApiKey('');
    setSavedKey('');
  };

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
      <View style={s.row}>
        <Text style={s.rowText}>🔑 AI key (free Google Gemini key works)</Text>
        <Text style={s.rowSub}>
          {savedKey ? `Saved (ends with ${savedKey.slice(-4)})` : 'Not added yet. Stored only on this phone.'}
        </Text>
        <TextInput
          style={s.keyInput}
          placeholder="Paste your key here"
          value={keyInput}
          onChangeText={setKeyInput}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={s.keyButtons}>
          <TouchableOpacity style={s.keySave} onPress={saveKey}><Text style={s.keySaveText}>Save key</Text></TouchableOpacity>
          {!!savedKey && (
            <TouchableOpacity style={s.keyRemove} onPress={removeKey}><Text style={s.keyRemoveText}>Remove</Text></TouchableOpacity>
          )}
        </View>
      </View>
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
  keyInput: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, marginTop: 10, fontSize: 15 },
  keyButtons: { flexDirection: 'row', marginTop: 10 },
  keySave: { backgroundColor: '#4f46e5', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, marginRight: 10 },
  keySaveText: { color: '#fff', fontWeight: 'bold' },
  keyRemove: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 8, borderWidth: 1, borderColor: '#dc2626' },
  keyRemoveText: { color: '#dc2626', fontWeight: 'bold' },
  label: { fontSize: 16, color: '#666' },
  value: { fontSize: 36, fontWeight: 'bold', color: '#4f46e5', marginTop: 8 },
});
